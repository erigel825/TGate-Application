import type { GateStatus, ProjectStatus, ProjectPriority } from '../types';

const GATE_STATUS: Record<GateStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-gray-100 text-gray-600' },
  in_review: { label: 'In Review', className: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Approved', className: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700' },
  on_hold: { label: 'On Hold', className: 'bg-orange-100 text-orange-700' },
};

const PROJECT_STATUS: Record<ProjectStatus, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-blue-100 text-blue-700' },
  on_hold: { label: 'On Hold', className: 'bg-orange-100 text-orange-700' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-500' },
};

const PRIORITY: Record<ProjectPriority, { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-gray-100 text-gray-600' },
  medium: { label: 'Medium', className: 'bg-blue-100 text-blue-600' },
  high: { label: 'High', className: 'bg-orange-100 text-orange-700' },
  critical: { label: 'Critical', className: 'bg-red-100 text-red-700' },
};

export function GateStatusBadge({ status }: { status: GateStatus }) {
  const cfg = GATE_STATUS[status];
  return <span className={`badge ${cfg.className}`}>{cfg.label}</span>;
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const cfg = PROJECT_STATUS[status];
  return <span className={`badge ${cfg.className}`}>{cfg.label}</span>;
}

export function PriorityBadge({ priority }: { priority: ProjectPriority }) {
  const cfg = PRIORITY[priority];
  return <span className={`badge ${cfg.className}`}>{cfg.label}</span>;
}
