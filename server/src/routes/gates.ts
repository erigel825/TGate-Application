import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, GATE_CHECKLISTS } from '../db';

const router = Router();

// Get all gates (optionally filter by status)
router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const { status, project_id } = req.query;

  let query = `
    SELECT g.*, p.name as project_name, p.current_stage, p.priority,
      su.name as submitted_by_name, su.avatar as submitted_by_avatar,
      ru.name as reviewed_by_name
    FROM gates g
    JOIN projects p ON g.project_id = p.id
    LEFT JOIN users su ON g.submitted_by = su.id
    LEFT JOIN users ru ON g.reviewed_by = ru.id
    WHERE 1=1
  `;
  const params: string[] = [];

  if (status) { query += ' AND g.status = ?'; params.push(status as string); }
  if (project_id) { query += ' AND g.project_id = ?'; params.push(project_id as string); }

  query += ' ORDER BY g.updated_at DESC';

  res.json(db.prepare(query).all(...params));
});

// Get single gate with checklist
router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const gate = db.prepare(`
    SELECT g.*, p.name as project_name, p.current_stage, p.priority,
      su.name as submitted_by_name, su.avatar as submitted_by_avatar,
      ru.name as reviewed_by_name
    FROM gates g
    JOIN projects p ON g.project_id = p.id
    LEFT JOIN users su ON g.submitted_by = su.id
    LEFT JOIN users ru ON g.reviewed_by = ru.id
    WHERE g.id = ?
  `).get(req.params.id);

  if (!gate) return res.status(404).json({ error: 'Gate not found' });

  const checklist = db.prepare('SELECT * FROM gate_checklist_items WHERE gate_id = ? ORDER BY rowid').all(req.params.id);
  res.json({ ...(gate as object), checklist });
});

// Submit gate for review
router.post('/:id/submit', (req: Request, res: Response) => {
  const db = getDb();
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });

  const gate = db.prepare('SELECT * FROM gates WHERE id = ?').get(req.params.id) as any;
  if (!gate) return res.status(404).json({ error: 'Gate not found' });
  if (gate.status !== 'pending') return res.status(400).json({ error: 'Gate is not in pending status' });

  const now = new Date().toISOString();
  db.prepare('UPDATE gates SET status=?, submitted_by=?, submitted_at=?, updated_at=? WHERE id=?')
    .run('in_review', user_id, now, now, req.params.id);

  db.prepare('UPDATE projects SET updated_at=? WHERE id=?').run(now, gate.project_id);
  db.prepare('INSERT INTO activity_log (id, project_id, user_id, action, details, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(uuidv4(), gate.project_id, user_id, 'gate_submitted', `Gate ${gate.gate_number} submitted for review`, now);

  res.json(db.prepare('SELECT * FROM gates WHERE id = ?').get(req.params.id));
});

// Make gate decision (approve/reject/on_hold)
router.post('/:id/decision', (req: Request, res: Response) => {
  const db = getDb();
  const { reviewer_id, decision, reason } = req.body;

  if (!reviewer_id || !decision) return res.status(400).json({ error: 'reviewer_id and decision required' });
  if (!['approved', 'rejected', 'on_hold'].includes(decision)) {
    return res.status(400).json({ error: 'decision must be approved, rejected, or on_hold' });
  }

  const gate = db.prepare('SELECT * FROM gates WHERE id = ?').get(req.params.id) as any;
  if (!gate) return res.status(404).json({ error: 'Gate not found' });
  if (gate.status !== 'in_review') return res.status(400).json({ error: 'Gate must be in_review to make a decision' });

  const now = new Date().toISOString();
  db.prepare('UPDATE gates SET status=?, reviewed_by=?, reviewed_at=?, decision_reason=?, updated_at=? WHERE id=?')
    .run(decision, reviewer_id, now, reason || null, now, req.params.id);

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(gate.project_id) as any;

  if (decision === 'approved') {
    const newStage = gate.gate_number;
    db.prepare('UPDATE projects SET current_stage=?, updated_at=? WHERE id=?').run(newStage, now, gate.project_id);

    // Create the next gate if not at max
    if (gate.gate_number < 5) {
      const nextGateNum = gate.gate_number + 1;
      const existingNext = db.prepare('SELECT * FROM gates WHERE project_id=? AND gate_number=?').get(gate.project_id, nextGateNum);
      if (!existingNext) {
        const nextGateId = uuidv4();
        db.prepare('INSERT INTO gates (id, project_id, gate_number, status, submitted_by, submitted_at, reviewed_by, reviewed_at, decision_reason, created_at, updated_at) VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, ?, ?)')
          .run(nextGateId, gate.project_id, nextGateNum, 'pending', now, now);

        const items = GATE_CHECKLISTS[nextGateNum] || [];
        const insertItem = db.prepare('INSERT INTO gate_checklist_items (id, gate_id, description, completed, notes, updated_at) VALUES (?, ?, ?, 0, NULL, ?)');
        items.forEach((desc: string) => insertItem.run(uuidv4(), nextGateId, desc, now));
      }
    } else {
      // Stage 5 complete - mark project as completed
      db.prepare("UPDATE projects SET status='completed', updated_at=? WHERE id=?").run(now, gate.project_id);
    }
  }

  db.prepare('UPDATE projects SET updated_at=? WHERE id=?').run(now, gate.project_id);
  db.prepare('INSERT INTO activity_log (id, project_id, user_id, action, details, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(uuidv4(), gate.project_id, reviewer_id, 'gate_decision', `Gate ${gate.gate_number} ${decision}: ${(reason || '').substring(0, 80)}`, now);

  res.json(db.prepare('SELECT * FROM gates WHERE id = ?').get(req.params.id));
});

// Reset rejected gate to pending (for resubmission)
router.post('/:id/reset', (req: Request, res: Response) => {
  const db = getDb();
  const gate = db.prepare('SELECT * FROM gates WHERE id = ?').get(req.params.id) as any;
  if (!gate) return res.status(404).json({ error: 'Gate not found' });

  const now = new Date().toISOString();
  db.prepare('UPDATE gates SET status=?, reviewed_by=NULL, reviewed_at=NULL, decision_reason=NULL, updated_at=? WHERE id=?')
    .run('pending', now, req.params.id);

  res.json(db.prepare('SELECT * FROM gates WHERE id = ?').get(req.params.id));
});

// Update checklist item
router.patch('/:gateId/checklist/:itemId', (req: Request, res: Response) => {
  const db = getDb();
  const { completed, notes } = req.body;
  const now = new Date().toISOString();

  db.prepare('UPDATE gate_checklist_items SET completed=?, notes=?, updated_at=? WHERE id=? AND gate_id=?')
    .run(completed ? 1 : 0, notes || null, now, req.params.itemId, req.params.gateId);

  res.json(db.prepare('SELECT * FROM gate_checklist_items WHERE id=?').get(req.params.itemId));
});

export default router;
