import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Trash2, CheckCircle, XCircle, Clock,
  Send, AlertTriangle, ChevronDown, ChevronUp, MessageSquare,
  Calendar, DollarSign, User, CheckSquare
} from 'lucide-react';
import { api } from '../api';
import type { ProjectDetail as PD, Gate, GateChecklistItem } from '../types';
import { ProjectStatusBadge, PriorityBadge, GateStatusBadge } from '../components/StatusBadge';
import StageProgress from '../components/StageProgress';
import { useApp } from '../context/AppContext';

const STAGE_NAMES = ['Ideation', 'Scoping', 'Business Case', 'Development', 'Testing & Validation', 'Launch'];
const GATE_NAMES: Record<number, string> = {
  1: 'Idea Screen',
  2: 'Scope Approval',
  3: 'Business Case Approval',
  4: 'Development Complete',
  5: 'Launch Readiness',
};

function formatCurrency(n: number | null) {
  if (!n) return '—';
  return `$${n.toLocaleString()}`;
}

function formatDate(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
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

interface GateCardProps {
  gate: Gate;
  onRefresh: () => void;
}

function GateCard({ gate, onRefresh }: GateCardProps) {
  const { currentUser } = useApp();
  const [expanded, setExpanded] = useState(gate.status === 'in_review' || gate.status === 'pending');
  const [decision, setDecision] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checklist, setChecklist] = useState<GateChecklistItem[]>(gate.checklist);

  const completedCount = checklist.filter(i => i.completed).length;
  const allComplete = completedCount === checklist.length && checklist.length > 0;
  const canSubmit = gate.status === 'pending' && allComplete;
  const canReview = gate.status === 'in_review' &&
    (currentUser?.role === 'admin' || currentUser?.role === 'reviewer');

  async function toggleItem(item: GateChecklistItem) {
    const updated = await api.updateChecklistItem(gate.id, item.id, { completed: !item.completed });
    setChecklist(prev => prev.map(i => i.id === item.id ? { ...i, completed: (updated as any).completed } : i));
  }

  async function submitGate() {
    if (!currentUser) return;
    setSubmitting(true);
    await api.submitGate(gate.id, currentUser.id);
    onRefresh();
  }

  async function makeDecision() {
    if (!currentUser || !decision) return;
    setSubmitting(true);
    await api.makeGateDecision(gate.id, { reviewer_id: currentUser.id, decision, reason });
    onRefresh();
  }

  async function resetGate() {
    await api.resetGate(gate.id);
    onRefresh();
  }

  const statusColors: Record<string, string> = {
    pending: 'border-l-gray-300',
    in_review: 'border-l-yellow-400',
    approved: 'border-l-green-500',
    rejected: 'border-l-red-500',
    on_hold: 'border-l-orange-400',
  };

  return (
    <div className={`card border-l-4 ${statusColors[gate.status]} overflow-hidden`}>
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center text-gray-700 font-bold text-sm flex-shrink-0">
          G{gate.gate_number}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">Gate {gate.gate_number}: {GATE_NAMES[gate.gate_number]}</span>
            <GateStatusBadge status={gate.status} />
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {checklist.length > 0 && `${completedCount}/${checklist.length} checklist items`}
            {gate.reviewed_at && ` • Reviewed ${formatDate(gate.reviewed_at)}`}
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-gray-100">
          {/* Decision reason */}
          {gate.decision_reason && (
            <div className={`p-3 rounded-lg text-sm ${
              gate.status === 'approved' ? 'bg-green-50 text-green-800' :
              gate.status === 'rejected' ? 'bg-red-50 text-red-800' :
              'bg-orange-50 text-orange-800'
            }`}>
              <strong>{gate.reviewed_by_name}</strong>: {gate.decision_reason}
            </div>
          )}

          {/* Checklist */}
          {checklist.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <CheckSquare className="w-4 h-4" /> Gate Checklist
                <span className="ml-auto text-xs text-gray-400">{completedCount}/{checklist.length}</span>
              </h4>
              <div className="space-y-2">
                {checklist.map(item => (
                  <label
                    key={item.id}
                    className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      item.completed
                        ? 'border-green-200 bg-green-50'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    } ${gate.status === 'approved' ? 'cursor-default' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={!!item.completed}
                      onChange={() => gate.status !== 'approved' && toggleItem(item)}
                      disabled={gate.status === 'approved' || gate.status === 'in_review'}
                      className="mt-0.5 accent-green-600"
                    />
                    <span className={`text-sm ${item.completed ? 'text-green-800 line-through-none' : 'text-gray-700'}`}>
                      {item.description}
                    </span>
                  </label>
                ))}
              </div>
              {gate.status === 'pending' && (
                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${checklist.length ? (completedCount / checklist.length) * 100 : 0}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Submit for review */}
          {gate.status === 'pending' && (
            <div className="flex items-center gap-3 pt-1">
              {!allComplete && (
                <p className="text-xs text-orange-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Complete all checklist items before submitting
                </p>
              )}
              <button
                disabled={!canSubmit || submitting}
                onClick={submitGate}
                className="btn-primary ml-auto"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Submitting…' : 'Submit for Review'}
              </button>
            </div>
          )}

          {/* Reviewer decision panel */}
          {canReview && (
            <div className="space-y-3 pt-1 border-t border-gray-100">
              <h4 className="text-sm font-medium text-gray-700">Gate Decision</h4>
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="Decision rationale / notes…"
                value={reason}
                onChange={e => setReason(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setDecision('approved'); setTimeout(makeDecision, 0); }}
                  disabled={submitting}
                  className="btn-primary flex-1 justify-center bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4" /> Approve
                </button>
                <button
                  onClick={() => { setDecision('on_hold'); setTimeout(makeDecision, 0); }}
                  disabled={submitting}
                  className="btn-secondary flex-1 justify-center"
                >
                  <Clock className="w-4 h-4" /> Hold
                </button>
                <button
                  onClick={() => { setDecision('rejected'); setTimeout(makeDecision, 0); }}
                  disabled={submitting}
                  className="btn-danger flex-1 justify-center"
                >
                  <XCircle className="w-4 h-4" /> Reject
                </button>
              </div>
            </div>
          )}

          {/* Reset rejected gate */}
          {gate.status === 'rejected' && (currentUser?.role === 'admin' || currentUser?.role === 'project_manager') && (
            <button onClick={resetGate} className="btn-secondary text-sm">
              Reset to Pending (Resubmit)
            </button>
          )}

          {/* Submission info */}
          {gate.submitted_by_name && (
            <p className="text-xs text-gray-400">
              Submitted by <strong>{gate.submitted_by_name}</strong> on {formatDate(gate.submitted_at)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useApp();
  const [project, setProject] = useState<PD | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [activeTab, setActiveTab] = useState<'gates' | 'comments' | 'activity'>('gates');
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    api.getProject(id).then(p => { setProject(p); setLoading(false); });
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function postComment() {
    if (!comment.trim() || !currentUser || !project) return;
    setPosting(true);
    await api.addComment(project.id, { user_id: currentUser.id, content: comment });
    setComment('');
    setPosting(false);
    load();
  }

  async function deleteProject() {
    if (!project) return;
    if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    await api.deleteProject(project.id);
    navigate('/projects');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 text-center text-gray-400">
        <p className="text-lg font-medium">Project not found</p>
        <Link to="/projects" className="btn-primary mt-4 inline-flex">Back to Projects</Link>
      </div>
    );
  }

  const ACTION_LABELS: Record<string, string> = {
    project_created: 'created this project',
    stage_advanced: 'advanced the stage',
    gate_submitted: 'submitted a gate for review',
    gate_decision: 'made a gate decision',
    comment_added: 'left a comment',
  };

  return (
    <div className="p-6 space-y-6">
      {/* Back + header */}
      <div className="flex items-start gap-4">
        <Link to="/projects" className="mt-1 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{project.name}</h1>
            <ProjectStatusBadge status={project.status} />
            <PriorityBadge priority={project.priority} />
          </div>
          {project.description && <p className="text-gray-500 mt-1">{project.description}</p>}
        </div>
        {(currentUser?.role === 'admin' || currentUser?.id === project.owner_id) && (
          <button onClick={deleteProject} disabled={deleting} className="btn-secondary text-red-600 hover:bg-red-50 flex-shrink-0">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Meta cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: User, label: 'Owner', value: project.owner_name },
          { icon: Calendar, label: 'Start Date', value: formatDate(project.start_date) },
          { icon: Calendar, label: 'Target Date', value: formatDate(project.target_date) },
          { icon: DollarSign, label: 'Budget', value: formatCurrency(project.budget) },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="card p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <Icon className="w-3.5 h-3.5" />
              <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
            </div>
            <div className="text-sm font-semibold text-gray-800">{value}</div>
          </div>
        ))}
      </div>

      {/* Stage progress */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Stage Progress</h2>
          <span className="text-sm text-gray-500">
            Stage {project.current_stage}: <strong>{STAGE_NAMES[project.current_stage]}</strong>
          </span>
        </div>
        <StageProgress currentStage={project.current_stage} gates={project.gates} />
      </div>

      {/* Tabs */}
      <div className="card overflow-hidden">
        <div className="flex border-b border-gray-200">
          {(['gates', 'comments', 'activity'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 sm:flex-none px-6 py-3 text-sm font-medium capitalize transition-colors border-b-2 ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'gates' ? `Gates (${project.gates.length})` :
               tab === 'comments' ? `Comments (${project.comments.length})` : 'Activity'}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === 'gates' && (
            <div className="space-y-3">
              {project.gates.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No gates yet</p>
              ) : (
                project.gates.map(gate => (
                  <GateCard key={gate.id} gate={gate} onRefresh={load} />
                ))
              )}
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="space-y-4">
              {/* Comment input */}
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {currentUser?.avatar}
                </div>
                <div className="flex-1 space-y-2">
                  <textarea
                    className="input resize-none"
                    rows={3}
                    placeholder="Leave a comment…"
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) postComment();
                    }}
                  />
                  <div className="flex justify-end">
                    <button onClick={postComment} disabled={!comment.trim() || posting} className="btn-primary">
                      <Send className="w-4 h-4" /> {posting ? 'Posting…' : 'Post Comment'}
                    </button>
                  </div>
                </div>
              </div>

              {project.comments.length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No comments yet</p>
                </div>
              ) : (
                <div className="space-y-4 divide-y divide-gray-100">
                  {project.comments.map(c => (
                    <div key={c.id} className="flex gap-3 pt-4 first:pt-0">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 text-xs font-bold flex-shrink-0">
                        {c.user_avatar}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{c.user_name}</span>
                          <span className="text-xs text-gray-400">{timeAgo(c.created_at)}</span>
                        </div>
                        <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{c.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-3">
              {project.activity.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No activity yet</p>
              ) : (
                project.activity.map(entry => (
                  <div key={entry.id} className="flex gap-3">
                    <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 text-xs font-bold flex-shrink-0 mt-0.5">
                      {entry.user_avatar || '?'}
                    </div>
                    <div>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">{entry.user_name}</span>{' '}
                        <span className="text-gray-500">{ACTION_LABELS[entry.action] || entry.action}</span>
                      </p>
                      {entry.details && <p className="text-xs text-gray-400 mt-0.5">{entry.details}</p>}
                      <p className="text-xs text-gray-400 mt-0.5">{timeAgo(entry.created_at)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
