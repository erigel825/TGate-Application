export type UserRole = 'admin' | 'project_manager' | 'reviewer' | 'viewer';
export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'cancelled';
export type ProjectPriority = 'low' | 'medium' | 'high' | 'critical';
export type GateStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'on_hold';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  owner_name: string;
  owner_avatar: string;
  owner_email: string;
  current_stage: number;
  status: ProjectStatus;
  priority: ProjectPriority;
  budget: number | null;
  category: string | null;
  start_date: string;
  target_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface GateChecklistItem {
  id: string;
  gate_id: string;
  description: string;
  completed: 0 | 1;
  notes: string | null;
  updated_at: string;
}

export interface Gate {
  id: string;
  project_id: string;
  project_name?: string;
  gate_number: number;
  status: GateStatus;
  submitted_by: string | null;
  submitted_by_name: string | null;
  submitted_by_avatar: string | null;
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  decision_reason: string | null;
  checklist: GateChecklistItem[];
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  project_id: string;
  gate_id: string | null;
  user_id: string;
  user_name: string;
  user_avatar: string;
  user_role: UserRole;
  content: string;
  created_at: string;
}

export interface ActivityEntry {
  id: string;
  project_id: string;
  project_name?: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  action: string;
  details: string;
  created_at: string;
}

export interface ProjectDetail extends Project {
  gates: Gate[];
  comments: Comment[];
  activity: ActivityEntry[];
}

export interface Stage {
  id: number;
  name: string;
  description: string;
}

export interface DashboardStats {
  projectsByStage: { current_stage: number; count: number }[];
  projectsByStatus: { status: ProjectStatus; count: number }[];
  gatesByStatus: { status: GateStatus; count: number }[];
  recentActivity: ActivityEntry[];
  totalBudget: number;
}
