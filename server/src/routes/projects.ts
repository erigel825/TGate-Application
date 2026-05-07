import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, GATE_CHECKLISTS } from '../db';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const db = getDb();
  const projects = db.prepare(`
    SELECT p.*, u.name as owner_name, u.avatar as owner_avatar, u.email as owner_email
    FROM projects p
    JOIN users u ON p.owner_id = u.id
    ORDER BY p.updated_at DESC
  `).all();
  res.json(projects);
});

router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const project = db.prepare(`
    SELECT p.*, u.name as owner_name, u.avatar as owner_avatar, u.email as owner_email
    FROM projects p
    JOIN users u ON p.owner_id = u.id
    WHERE p.id = ?
  `).get(req.params.id);

  if (!project) return res.status(404).json({ error: 'Project not found' });

  const gates = db.prepare(`
    SELECT g.*,
      su.name as submitted_by_name, su.avatar as submitted_by_avatar,
      ru.name as reviewed_by_name, ru.avatar as reviewed_by_avatar
    FROM gates g
    LEFT JOIN users su ON g.submitted_by = su.id
    LEFT JOIN users ru ON g.reviewed_by = ru.id
    WHERE g.project_id = ?
    ORDER BY g.gate_number ASC
  `).all(req.params.id);

  const gatesWithItems = gates.map((gate: any) => ({
    ...gate,
    checklist: db.prepare('SELECT * FROM gate_checklist_items WHERE gate_id = ? ORDER BY rowid').all(gate.id),
  }));

  const comments = db.prepare(`
    SELECT c.*, u.name as user_name, u.avatar as user_avatar, u.role as user_role
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.project_id = ?
    ORDER BY c.created_at DESC
  `).all(req.params.id);

  const activity = db.prepare(`
    SELECT a.*, u.name as user_name, u.avatar as user_avatar
    FROM activity_log a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE a.project_id = ?
    ORDER BY a.created_at DESC
    LIMIT 20
  `).all(req.params.id);

  res.json({ ...project as object, gates: gatesWithItems, comments, activity });
});

router.post('/', (req: Request, res: Response) => {
  const db = getDb();
  const { name, description, owner_id, priority, budget, category, start_date, target_date } = req.body;

  if (!name || !owner_id || !start_date) {
    return res.status(400).json({ error: 'name, owner_id, and start_date are required' });
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO projects (id, name, description, owner_id, current_stage, status, priority, budget, category, start_date, target_date, created_at, updated_at)
    VALUES (?, ?, ?, ?, 0, 'active', ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, description || null, owner_id, priority || 'medium', budget || null, category || null, start_date, target_date || null, now, now);

  // Create the initial Gate 1 (pending)
  const gateId = uuidv4();
  db.prepare(`
    INSERT INTO gates (id, project_id, gate_number, status, submitted_by, submitted_at, reviewed_by, reviewed_at, decision_reason, created_at, updated_at)
    VALUES (?, ?, 1, 'pending', NULL, NULL, NULL, NULL, NULL, ?, ?)
  `).run(gateId, id, now, now);

  const items = GATE_CHECKLISTS[1] || [];
  const insertItem = db.prepare('INSERT INTO gate_checklist_items (id, gate_id, description, completed, notes, updated_at) VALUES (?, ?, ?, 0, NULL, ?)');
  items.forEach(desc => insertItem.run(uuidv4(), gateId, desc, now));

  db.prepare('INSERT INTO activity_log (id, project_id, user_id, action, details, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(uuidv4(), id, owner_id, 'project_created', `Project "${name}" created`, now);

  const project = db.prepare('SELECT p.*, u.name as owner_name FROM projects p JOIN users u ON p.owner_id = u.id WHERE p.id = ?').get(id);
  res.status(201).json(project);
});

router.put('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const { name, description, priority, budget, category, target_date, status } = req.body;
  const now = new Date().toISOString();

  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Project not found' });

  db.prepare(`
    UPDATE projects SET name=?, description=?, priority=?, budget=?, category=?, target_date=?, status=?, updated_at=?
    WHERE id=?
  `).run(
    name, description, priority, budget, category, target_date, status, now,
    req.params.id
  );

  res.json(db.prepare('SELECT p.*, u.name as owner_name FROM projects p JOIN users u ON p.owner_id = u.id WHERE p.id = ?').get(req.params.id));
});

router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Project not found' });
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// POST comment on a project
router.post('/:id/comments', (req: Request, res: Response) => {
  const db = getDb();
  const { user_id, content, gate_id } = req.body;
  if (!user_id || !content) return res.status(400).json({ error: 'user_id and content required' });

  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO comments (id, project_id, gate_id, user_id, content, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, req.params.id, gate_id || null, user_id, content, now);

  db.prepare('UPDATE projects SET updated_at=? WHERE id=?').run(now, req.params.id);
  db.prepare('INSERT INTO activity_log (id, project_id, user_id, action, details, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(uuidv4(), req.params.id, user_id, 'comment_added', content.substring(0, 80), now);

  const comment = db.prepare('SELECT c.*, u.name as user_name, u.avatar as user_avatar, u.role as user_role FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?').get(id);
  res.status(201).json(comment);
});

export default router;
