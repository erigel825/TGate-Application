import Database from 'better-sqlite3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const DB_PATH = path.join(__dirname, '..', 'tgate.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
    seedData();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','project_manager','reviewer','viewer')),
      avatar TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      owner_id TEXT NOT NULL REFERENCES users(id),
      current_stage INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','on_hold','completed','cancelled')),
      priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high','critical')),
      budget REAL,
      category TEXT,
      start_date TEXT NOT NULL,
      target_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS gates (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      gate_number INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','in_review','approved','rejected','on_hold')),
      submitted_by TEXT REFERENCES users(id),
      submitted_at TEXT,
      reviewed_by TEXT REFERENCES users(id),
      reviewed_at TEXT,
      decision_reason TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(project_id, gate_number)
    );

    CREATE TABLE IF NOT EXISTS gate_checklist_items (
      id TEXT PRIMARY KEY,
      gate_id TEXT NOT NULL REFERENCES gates(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      gate_id TEXT REFERENCES gates(id),
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      url TEXT,
      uploaded_by TEXT REFERENCES users(id),
      uploaded_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      gate_id TEXT REFERENCES gates(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id),
      action TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL
    );
  `);
}

const STAGES = [
  { id: 0, name: 'Ideation', description: 'Initial idea generation and discovery phase' },
  { id: 1, name: 'Scoping', description: 'Define project scope, resources, and preliminary assessment' },
  { id: 2, name: 'Business Case', description: 'Detailed business case, financials, and risk analysis' },
  { id: 3, name: 'Development', description: 'Full development and implementation' },
  { id: 4, name: 'Testing & Validation', description: 'Quality assurance, testing, and validation' },
  { id: 5, name: 'Launch', description: 'Commercial launch and deployment' },
];

const GATE_CHECKLISTS: Record<number, string[]> = {
  1: [
    'Project idea clearly defined and documented',
    'Initial market opportunity identified',
    'Alignment with company strategy confirmed',
    'Preliminary resource estimate provided',
    'Key stakeholders identified',
  ],
  2: [
    'Detailed scope document completed',
    'Technical feasibility assessment done',
    'Preliminary financial projections provided',
    'Risk register initialized',
    'Project team assigned',
    'Timeline and milestones defined',
  ],
  3: [
    'Full business case document approved',
    'Financial model validated (NPV, ROI, payback)',
    'Detailed risk assessment completed',
    'Regulatory and compliance review done',
    'Resource plan and budget approved',
    'Go-to-market strategy defined',
  ],
  4: [
    'Development plan and architecture approved',
    'Sprint 1 deliverables reviewed',
    'Technical design document completed',
    'Security review completed',
    'Integration testing plan approved',
    'User acceptance criteria defined',
  ],
  5: [
    'All test cases passed (>95% coverage)',
    'Performance benchmarks met',
    'Security penetration testing completed',
    'User acceptance testing signed off',
    'Launch runbook prepared',
    'Rollback plan documented',
    'Training materials completed',
  ],
};

function seedData() {
  const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  if (userCount > 0) return;

  const now = new Date().toISOString();

  const users = [
    { id: uuidv4(), name: 'Alex Johnson', email: 'alex@teckrez.com', role: 'admin', avatar: 'AJ' },
    { id: uuidv4(), name: 'Sarah Chen', email: 'sarah@teckrez.com', role: 'project_manager', avatar: 'SC' },
    { id: uuidv4(), name: 'Mike Rivera', email: 'mike@teckrez.com', role: 'reviewer', avatar: 'MR' },
    { id: uuidv4(), name: 'Emma Williams', email: 'emma@teckrez.com', role: 'project_manager', avatar: 'EW' },
    { id: uuidv4(), name: 'James Okafor', email: 'james@teckrez.com', role: 'reviewer', avatar: 'JO' },
    { id: uuidv4(), name: 'Lisa Park', email: 'lisa@teckrez.com', role: 'viewer', avatar: 'LP' },
  ];

  const insertUser = db.prepare(
    'INSERT INTO users (id, name, email, role, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  );
  users.forEach(u => insertUser.run(u.id, u.name, u.email, u.role, u.avatar, now));

  const sampleProjects = [
    {
      name: 'AI-Powered Analytics Platform',
      description: 'Build a next-gen analytics platform leveraging machine learning to provide real-time business insights.',
      owner: users[1],
      stage: 3,
      status: 'active',
      priority: 'critical',
      budget: 450000,
      category: 'Technology',
      startDate: '2026-01-15',
      targetDate: '2026-12-31',
    },
    {
      name: 'Customer Portal Redesign',
      description: 'Redesign the customer portal with improved UX, self-service features, and mobile responsiveness.',
      owner: users[3],
      stage: 2,
      status: 'active',
      priority: 'high',
      budget: 120000,
      category: 'Product',
      startDate: '2026-02-01',
      targetDate: '2026-09-30',
    },
    {
      name: 'Supply Chain Optimisation',
      description: 'Implement an end-to-end supply chain optimisation system to reduce costs by 20%.',
      owner: users[1],
      stage: 4,
      status: 'active',
      priority: 'high',
      budget: 280000,
      category: 'Operations',
      startDate: '2025-10-01',
      targetDate: '2026-07-31',
    },
    {
      name: 'Mobile App Launch',
      description: 'Launch native iOS and Android apps for the Teckrez platform targeting B2B customers.',
      owner: users[3],
      stage: 5,
      status: 'active',
      priority: 'critical',
      budget: 380000,
      category: 'Technology',
      startDate: '2025-08-01',
      targetDate: '2026-05-31',
    },
    {
      name: 'ESG Reporting Dashboard',
      description: 'Develop an ESG reporting dashboard for compliance with new regulatory requirements.',
      owner: users[1],
      stage: 1,
      status: 'active',
      priority: 'medium',
      budget: 95000,
      category: 'Compliance',
      startDate: '2026-03-01',
      targetDate: '2026-11-30',
    },
    {
      name: 'Partner Integration API',
      description: 'Build a public-facing API for third-party partner integrations and ecosystem expansion.',
      owner: users[3],
      stage: 0,
      status: 'active',
      priority: 'medium',
      budget: 60000,
      category: 'Technology',
      startDate: '2026-04-01',
      targetDate: '2027-03-31',
    },
  ];

  const insertProject = db.prepare(`
    INSERT INTO projects (id, name, description, owner_id, current_stage, status, priority, budget, category, start_date, target_date, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertGate = db.prepare(`
    INSERT INTO gates (id, project_id, gate_number, status, submitted_by, submitted_at, reviewed_by, reviewed_at, decision_reason, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertChecklistItem = db.prepare(`
    INSERT INTO gate_checklist_items (id, gate_id, description, completed, notes, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertActivity = db.prepare(`
    INSERT INTO activity_log (id, project_id, user_id, action, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const p of sampleProjects) {
    const projectId = uuidv4();
    const created = new Date(Date.now() - Math.random() * 7776000000).toISOString();
    insertProject.run(
      projectId, p.name, p.description, p.owner.id,
      p.stage, p.status, p.priority, p.budget, p.category,
      p.startDate, p.targetDate, created, now
    );

    // Create gates for all completed stages
    for (let g = 1; g <= p.stage; g++) {
      const gateId = uuidv4();
      const reviewer = g % 2 === 0 ? users[2] : users[4];
      const submittedAt = new Date(Date.now() - (p.stage - g + 1) * 2592000000).toISOString();
      const reviewedAt = new Date(new Date(submittedAt).getTime() + 259200000).toISOString();

      insertGate.run(
        gateId, projectId, g, 'approved',
        p.owner.id, submittedAt,
        reviewer.id, reviewedAt,
        'All criteria met. Project approved to proceed to next stage.',
        submittedAt, reviewedAt
      );

      const items = GATE_CHECKLISTS[g] || [];
      items.forEach(desc => {
        insertChecklistItem.run(uuidv4(), gateId, desc, 1, null, reviewedAt);
      });
    }

    // Create pending gate for the current stage (if not at stage 0)
    if (p.stage < 5) {
      const nextGate = p.stage + 1;
      const gateId = uuidv4();
      const gateStatus = p.stage === 2 ? 'in_review' : 'pending';
      const submittedAt = p.stage === 2 ? new Date(Date.now() - 604800000).toISOString() : null;

      insertGate.run(
        gateId, projectId, nextGate, gateStatus,
        submittedAt ? p.owner.id : null, submittedAt,
        null, null, null,
        now, now
      );

      const items = GATE_CHECKLISTS[nextGate] || [];
      items.forEach((desc, idx) => {
        const completed = idx < Math.floor(items.length * 0.6) ? 1 : 0;
        insertChecklistItem.run(uuidv4(), gateId, desc, completed, null, now);
      });
    }

    // Activity log entries
    insertActivity.run(uuidv4(), projectId, p.owner.id, 'project_created', `Project "${p.name}" created`, created);
    if (p.stage > 0) {
      insertActivity.run(uuidv4(), projectId, p.owner.id, 'stage_advanced', `Advanced to Stage ${p.stage}: ${STAGES[p.stage].name}`, now);
    }
  }
}

export { STAGES, GATE_CHECKLISTS };
