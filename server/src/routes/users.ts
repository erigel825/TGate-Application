import { Router, Request, Response } from 'express';
import { getDb } from '../db';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json(getDb().prepare('SELECT * FROM users ORDER BY name').all());
});

router.get('/stats', (_req: Request, res: Response) => {
  const db = getDb();

  const projectsByStage = db.prepare(`
    SELECT current_stage, COUNT(*) as count FROM projects WHERE status='active' GROUP BY current_stage
  `).all();

  const projectsByStatus = db.prepare(`
    SELECT status, COUNT(*) as count FROM projects GROUP BY status
  `).all();

  const gatesByStatus = db.prepare(`
    SELECT status, COUNT(*) as count FROM gates GROUP BY status
  `).all();

  const recentActivity = db.prepare(`
    SELECT a.*, u.name as user_name, u.avatar as user_avatar, p.name as project_name
    FROM activity_log a
    LEFT JOIN users u ON a.user_id = u.id
    LEFT JOIN projects p ON a.project_id = p.id
    ORDER BY a.created_at DESC
    LIMIT 10
  `).all();

  const totalBudget = db.prepare("SELECT SUM(budget) as total FROM projects WHERE status='active'").get() as any;

  res.json({ projectsByStage, projectsByStatus, gatesByStatus, recentActivity, totalBudget: totalBudget?.total || 0 });
});

router.get('/:id', (req: Request, res: Response) => {
  const user = getDb().prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

export default router;
