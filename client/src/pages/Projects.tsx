import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, ChevronRight } from 'lucide-react';
import { api } from '../api';
import type { Project, User as UserType, ProjectPriority } from '../types';
import { ProjectStatusBadge, PriorityBadge } from '../components/StatusBadge';
import StageProgress from '../components/StageProgress';
import { useApp } from '../context/AppContext';

const STAGE_NAMES = ['Ideation', 'Scoping', 'Business Case', 'Development', 'Testing', 'Launch'];

function formatCurrency(n: number | null) {
  if (!n) return '—';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

interface CreateModalProps {
  users: UserType[];
  onClose: () => void;
  onCreated: (p: Project) => void;
}

function CreateProjectModal({ users, onClose, onCreated }: CreateModalProps) {
  const { currentUser } = useApp();
  const [form, setForm] = useState({
    name: '',
    description: '',
    owner_id: currentUser?.id || users[0]?.id || '',
    priority: 'medium' as ProjectPriority,
    budget: '',
    category: '',
    start_date: new Date().toISOString().split('T')[0],
    target_date: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Project name is required'); return; }
    setSaving(true);
    try {
      const project = await api.createProject({
        ...form,
        budget: form.budget ? parseFloat(form.budget) : undefined,
        target_date: form.target_date || undefined,
      });
      onCreated(project);
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">New Project</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-light leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}

          <div>
            <label className="label">Project Name *</label>
            <input className="input" placeholder="e.g. New Product Launch" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={3} placeholder="Brief description of the project..." value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Project Owner *</label>
              <select className="input" value={form.owner_id} onChange={e => set('owner_id', e.target.value)}>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Priority</label>
              <select className="input" value={form.priority} onChange={e => set('priority', e.target.value as ProjectPriority)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Category</label>
              <input className="input" placeholder="e.g. Technology" value={form.category} onChange={e => set('category', e.target.value)} />
            </div>
            <div>
              <label className="label">Budget ($)</label>
              <input className="input" type="number" placeholder="e.g. 150000" value={form.budget} onChange={e => set('budget', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date *</label>
              <input className="input" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </div>
            <div>
              <label className="label">Target Completion</label>
              <input className="input" type="date" value={form.target_date} onChange={e => set('target_date', e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Creating…' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Projects() {
  const { users } = useApp();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    api.getProjects().then(p => { setProjects(p); setLoading(false); });
  }, []);

  const filtered = projects.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.owner_name.toLowerCase().includes(search.toLowerCase()) ||
      (p.category || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    const matchStage = filterStage === 'all' || String(p.current_stage) === filterStage;
    return matchSearch && matchStatus && matchStage;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 mt-1">{projects.length} total projects</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search projects…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="on_hold">On Hold</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select className="input w-auto" value={filterStage} onChange={e => setFilterStage(e.target.value)}>
          <option value="all">All Stages</option>
          {STAGE_NAMES.map((s, i) => <option key={i} value={i}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <Filter className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No projects found</p>
          <p className="text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 font-medium text-gray-500">Project</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500 hidden md:table-cell">Stage</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500 hidden lg:table-cell">Owner</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500 hidden lg:table-cell">Budget</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <Link to={`/projects/${p.id}`} className="block">
                      <div className="font-medium text-gray-900 hover:text-blue-600 transition-colors">{p.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <PriorityBadge priority={p.priority} />
                        {p.category && <span className="text-xs text-gray-400">{p.category}</span>}
                      </div>
                    </Link>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <div className="text-gray-700 font-medium">{STAGE_NAMES[p.current_stage]}</div>
                    <div className="mt-1.5 w-32">
                      <StageProgress currentStage={p.current_stage} gates={[]} compact />
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-xs font-bold">
                        {p.owner_avatar}
                      </div>
                      <span className="text-gray-600">{p.owner_name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell">
                    <span className="text-gray-700">{formatCurrency(p.budget)}</span>
                  </td>
                  <td className="px-5 py-4">
                    <ProjectStatusBadge status={p.status} />
                  </td>
                  <td className="px-3 py-4">
                    <Link to={`/projects/${p.id}`}>
                      <ChevronRight className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateProjectModal
          users={users}
          onClose={() => setShowCreate(false)}
          onCreated={p => { setProjects(prev => [p, ...prev]); setShowCreate(false); }}
        />
      )}
    </div>
  );
}
