import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderKanban, CheckSquare, TrendingUp,
  DollarSign, Activity, ArrowRight, ChevronRight
} from 'lucide-react';
import { api } from '../api';
import type { DashboardStats, Project, Gate } from '../types';
import { PriorityBadge } from '../components/StatusBadge';
import StageProgress from '../components/StageProgress';

const STAGE_NAMES = ['Ideation', 'Scoping', 'Business Case', 'Development', 'Testing', 'Launch'];

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function formatCurrency(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const ACTION_LABELS: Record<string, string> = {
  project_created: 'created project',
  stage_advanced: 'advanced stage',
  gate_submitted: 'submitted gate',
  gate_decision: 'reviewed gate',
  comment_added: 'commented on',
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [pendingGates, setPendingGates] = useState<Gate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getStats(),
      api.getProjects(),
      api.getGates({ status: 'in_review' }),
    ]).then(([s, p, g]) => {
      setStats(s);
      setProjects(p);
      setPendingGates(g);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const activeProjects = projects.filter(p => p.status === 'active');
  const completedProjects = projects.filter(p => p.status === 'completed');
  const reviewCount = pendingGates.length;
  const totalBudget = stats?.totalBudget || 0;

  const stageDistribution = STAGE_NAMES.map((name, i) => ({
    name,
    count: stats?.projectsByStage.find(s => s.current_stage === i)?.count || 0,
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of all stage gate projects at Teckrez</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={FolderKanban}
          label="Active Projects"
          value={activeProjects.length}
          sub={`${completedProjects.length} completed`}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={CheckSquare}
          label="Awaiting Review"
          value={reviewCount}
          sub="gate reviews pending"
          color="bg-yellow-50 text-yellow-600"
        />
        <StatCard
          icon={TrendingUp}
          label="Completed"
          value={completedProjects.length}
          sub="projects launched"
          color="bg-green-50 text-green-600"
        />
        <StatCard
          icon={DollarSign}
          label="Total Budget"
          value={formatCurrency(totalBudget)}
          sub="across active projects"
          color="bg-purple-50 text-purple-600"
        />
      </div>

      {/* Pipeline overview + pending reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline bar chart */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Pipeline Distribution</h2>
            <Link to="/pipeline" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View Pipeline <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {stageDistribution.map(({ name, count }) => {
              const pct = activeProjects.length ? (count / activeProjects.length) * 100 : 0;
              return (
                <div key={name} className="flex items-center gap-3">
                  <div className="w-28 text-sm text-gray-600 text-right flex-shrink-0">{name}</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="w-6 text-sm font-medium text-gray-700 flex-shrink-0">{count}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pending gate reviews */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Pending Reviews</h2>
            <Link to="/gates" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {pendingGates.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No pending reviews</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingGates.slice(0, 5).map(gate => (
                <Link
                  key={gate.id}
                  to={`/projects/${gate.project_id}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center text-yellow-700 font-bold text-xs flex-shrink-0">
                    G{gate.gate_number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{gate.project_name}</div>
                    <div className="text-xs text-gray-400">Gate {gate.gate_number} • {gate.submitted_by_name}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent projects + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent projects */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Projects</h2>
            <Link to="/projects" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              All Projects <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {projects.slice(0, 5).map(p => (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className="block p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{p.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Stage {p.current_stage}: {STAGE_NAMES[p.current_stage]} • {p.owner_name}
                    </div>
                  </div>
                  <PriorityBadge priority={p.priority} />
                </div>
                <div className="mt-2">
                  <StageProgress currentStage={p.current_stage} gates={[]} compact />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Activity feed */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-gray-400" />
            <h2 className="font-semibold text-gray-900">Recent Activity</h2>
          </div>
          <div className="space-y-3">
            {(stats?.recentActivity || []).slice(0, 8).map(entry => (
              <div key={entry.id} className="flex gap-3">
                <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 text-xs font-bold flex-shrink-0">
                  {entry.user_avatar || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">{entry.user_name}</span>{' '}
                    <span className="text-gray-500">{ACTION_LABELS[entry.action] || entry.action}</span>{' '}
                    {entry.project_name && (
                      <Link to={`/projects/${entry.project_id}`} className="font-medium text-blue-600 hover:underline truncate">
                        {entry.project_name}
                      </Link>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{timeAgo(entry.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
