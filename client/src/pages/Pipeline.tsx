import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, DollarSign, ChevronRight } from 'lucide-react';
import { api } from '../api';
import type { Project } from '../types';
import { PriorityBadge, ProjectStatusBadge } from '../components/StatusBadge';

const STAGES = [
  { id: 0, name: 'Ideation', color: 'bg-gray-100 border-gray-300', header: 'bg-gray-200 text-gray-700' },
  { id: 1, name: 'Scoping', color: 'bg-blue-50 border-blue-200', header: 'bg-blue-100 text-blue-700' },
  { id: 2, name: 'Business Case', color: 'bg-indigo-50 border-indigo-200', header: 'bg-indigo-100 text-indigo-700' },
  { id: 3, name: 'Development', color: 'bg-yellow-50 border-yellow-200', header: 'bg-yellow-100 text-yellow-700' },
  { id: 4, name: 'Testing', color: 'bg-orange-50 border-orange-200', header: 'bg-orange-100 text-orange-700' },
  { id: 5, name: 'Launch', color: 'bg-green-50 border-green-200', header: 'bg-green-100 text-green-700' },
];

function formatCurrency(n: number | null) {
  if (!n) return null;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function formatDate(s: string | null) {
  if (!s) return null;
  return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      to={`/projects/${project.id}`}
      className="block bg-white rounded-lg border border-gray-200 p-3.5 hover:shadow-md hover:border-blue-300 transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors leading-tight">
          {project.name}
        </h3>
        <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-400 flex-shrink-0 mt-0.5" />
      </div>

      {project.description && (
        <p className="text-xs text-gray-400 mb-2 line-clamp-2">{project.description}</p>
      )}

      <div className="flex flex-wrap gap-1 mb-2">
        <PriorityBadge priority={project.priority} />
        <ProjectStatusBadge status={project.status} />
        {project.category && (
          <span className="badge bg-gray-100 text-gray-500">{project.category}</span>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-[9px] font-bold">
            {project.owner_avatar}
          </div>
          <span>{project.owner_name.split(' ')[0]}</span>
        </div>
        <div className="flex items-center gap-2">
          {formatCurrency(project.budget) && (
            <span className="flex items-center gap-0.5">
              <DollarSign className="w-3 h-3" />{formatCurrency(project.budget)}
            </span>
          )}
          {project.target_date && (
            <span className="flex items-center gap-0.5">
              <Calendar className="w-3 h-3" />{formatDate(project.target_date)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function Pipeline() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('active');

  useEffect(() => {
    api.getProjects().then(p => { setProjects(p); setLoading(false); });
  }, []);

  const filtered = filterStatus === 'all' ? projects : projects.filter(p => p.status === filterStatus);

  const columns = STAGES.map(stage => ({
    ...stage,
    projects: filtered.filter(p => p.current_stage === stage.id),
  }));

  const totalCount = filtered.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
          <p className="text-gray-500 mt-1">{totalCount} projects across all stages</p>
        </div>
        <select
          className="input w-auto"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="all">All Projects</option>
          <option value="active">Active Only</option>
          <option value="on_hold">On Hold</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
        {columns.map(col => (
          <div key={col.id} className="flex-shrink-0 w-64 flex flex-col gap-3">
            {/* Column header */}
            <div className={`rounded-lg px-3 py-2.5 flex items-center justify-between ${col.header}`}>
              <div>
                <span className="text-sm font-semibold">Stage {col.id}</span>
                <span className="block text-xs opacity-80">{col.name}</span>
              </div>
              <span className="text-lg font-bold">{col.projects.length}</span>
            </div>

            {/* Gate label */}
            {col.id < 5 && (
              <div className="flex items-center gap-2 px-1">
                <div className="flex-1 border-t border-dashed border-gray-300" />
                <span className="text-[10px] text-gray-400 font-medium">Gate {col.id + 1} ↓</span>
                <div className="flex-1 border-t border-dashed border-gray-300" />
              </div>
            )}

            {/* Cards */}
            <div className="space-y-2 flex-1">
              {col.projects.length === 0 ? (
                <div className={`rounded-lg border-2 border-dashed p-4 text-center text-xs text-gray-400 ${col.color}`}>
                  No projects
                </div>
              ) : (
                col.projects.map(p => <ProjectCard key={p.id} project={p} />)
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
