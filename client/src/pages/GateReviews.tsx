import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle, XCircle, Clock, ChevronRight,
  Filter, CheckSquare
} from 'lucide-react';
import { api } from '../api';
import type { Gate } from '../types';
import { GateStatusBadge, PriorityBadge } from '../components/StatusBadge';
import { useApp } from '../context/AppContext';

const GATE_NAMES: Record<number, string> = {
  1: 'Idea Screen',
  2: 'Scope Approval',
  3: 'Business Case',
  4: 'Dev Complete',
  5: 'Launch Readiness',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface DecisionModalProps {
  gate: Gate;
  onClose: () => void;
  onDone: () => void;
}

function DecisionModal({ gate, onClose, onDone }: DecisionModalProps) {
  const { currentUser } = useApp();
  const [decision, setDecision] = useState<'approved' | 'rejected' | 'on_hold' | ''>('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!decision || !currentUser) return;
    setSaving(true);
    try {
      await api.makeGateDecision(gate.id, {
        reviewer_id: currentUser.id,
        decision,
        reason,
      });
      onDone();
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  }

  const completedCount = gate.checklist.filter(i => i.completed).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Gate {gate.gate_number}: {GATE_NAMES[gate.gate_number]}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">{gate.project_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-light">&times;</button>
        </div>

        <div className="p-6 space-y-5">
          {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}

          {/* Checklist summary */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-gray-400" /> Checklist
              </h3>
              <span className="text-sm font-semibold text-gray-700">
                {completedCount}/{gate.checklist.length}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full mb-3">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${gate.checklist.length ? (completedCount / gate.checklist.length) * 100 : 0}%` }}
              />
            </div>
            <ul className="space-y-1.5">
              {gate.checklist.map(item => (
                <li key={item.id} className="flex items-start gap-2 text-sm">
                  <span className={`mt-0.5 flex-shrink-0 ${item.completed ? 'text-green-500' : 'text-gray-300'}`}>
                    {item.completed ? '✓' : '○'}
                  </span>
                  <span className={item.completed ? 'text-gray-600' : 'text-gray-400'}>
                    {item.description}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Submission info */}
          {gate.submitted_by_name && (
            <p className="text-sm text-gray-500">
              Submitted by <strong>{gate.submitted_by_name}</strong> {gate.submitted_at ? timeAgo(gate.submitted_at) : ''}
            </p>
          )}

          {/* Decision */}
          <div>
            <label className="label">Decision *</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'approved', label: 'Approve', icon: CheckCircle, cls: 'border-green-300 bg-green-50 text-green-700' },
                { value: 'on_hold', label: 'Hold', icon: Clock, cls: 'border-orange-300 bg-orange-50 text-orange-700' },
                { value: 'rejected', label: 'Reject', icon: XCircle, cls: 'border-red-300 bg-red-50 text-red-700' },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDecision(opt.value)}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                    decision === opt.value ? opt.cls + ' ring-2 ring-offset-1 ring-current' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <opt.icon className="w-4 h-4" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Rationale / Notes</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Provide reasoning for your decision…"
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={submit} disabled={!decision || saving} className="btn-primary">
              {saving ? 'Submitting…' : 'Submit Decision'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const STATUS_TABS: { value: string; label: string }[] = [
  { value: 'in_review', label: 'In Review' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'on_hold', label: 'On Hold' },
  { value: '', label: 'All' },
];

export default function GateReviews() {
  const { currentUser } = useApp();
  const [gates, setGates] = useState<Gate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState('in_review');
  const [decisionGate, setDecisionGate] = useState<Gate | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.getGates(activeStatus ? { status: activeStatus } : {})
      .then(g => { setGates(g); setLoading(false); });
  }, [activeStatus]);

  useEffect(() => { load(); }, [load]);

  const canReview = currentUser?.role === 'admin' || currentUser?.role === 'reviewer';

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gate Reviews</h1>
        <p className="text-gray-500 mt-1">Manage gate submissions and review decisions</p>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit flex-wrap">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveStatus(tab.value)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeStatus === tab.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : gates.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <Filter className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No gates found</p>
          <p className="text-sm mt-1">Nothing in this category</p>
        </div>
      ) : (
        <div className="space-y-3">
          {gates.map(gate => {
            const completedCount = gate.checklist.filter(i => i.completed).length;
            const pct = gate.checklist.length ? Math.round((completedCount / gate.checklist.length) * 100) : 0;
            return (
              <div key={gate.id} className="card p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  {/* Gate number badge */}
                  <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${
                    gate.status === 'approved' ? 'bg-green-100' :
                    gate.status === 'in_review' ? 'bg-yellow-100' :
                    gate.status === 'rejected' ? 'bg-red-100' :
                    'bg-gray-100'
                  }`}>
                    <span className={`text-lg font-bold ${
                      gate.status === 'approved' ? 'text-green-700' :
                      gate.status === 'in_review' ? 'text-yellow-700' :
                      gate.status === 'rejected' ? 'text-red-700' :
                      'text-gray-600'
                    }`}>G{gate.gate_number}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        to={`/projects/${gate.project_id}`}
                        className="font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                      >
                        {gate.project_name}
                      </Link>
                      <GateStatusBadge status={gate.status} />
                      {(gate as any).priority && <PriorityBadge priority={(gate as any).priority} />}
                    </div>

                    <p className="text-sm text-gray-500 mt-0.5">
                      Gate {gate.gate_number}: {GATE_NAMES[gate.gate_number]}
                    </p>

                    {/* Checklist progress */}
                    {gate.checklist.length > 0 && (
                      <div className="mt-3 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-xs">
                          <div
                            className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{completedCount}/{gate.checklist.length} items</span>
                      </div>
                    )}

                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      {gate.submitted_by_name && (
                        <span>Submitted by <strong className="text-gray-600">{gate.submitted_by_name}</strong></span>
                      )}
                      {gate.submitted_at && <span>{timeAgo(gate.submitted_at)}</span>}
                      {gate.reviewed_by_name && (
                        <span>Reviewed by <strong className="text-gray-600">{gate.reviewed_by_name}</strong></span>
                      )}
                    </div>

                    {gate.decision_reason && (
                      <p className={`mt-2 text-sm p-2 rounded ${
                        gate.status === 'approved' ? 'bg-green-50 text-green-800' :
                        gate.status === 'rejected' ? 'bg-red-50 text-red-800' :
                        'bg-orange-50 text-orange-800'
                      }`}>
                        "{gate.decision_reason}"
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                      to={`/projects/${gate.project_id}`}
                      className="btn-secondary text-xs py-1.5 px-3"
                    >
                      View Project <ChevronRight className="w-3 h-3" />
                    </Link>
                    {gate.status === 'in_review' && canReview && (
                      <button
                        onClick={() => setDecisionGate(gate)}
                        className="btn-primary text-xs py-1.5 px-3"
                      >
                        Review
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {decisionGate && (
        <DecisionModal
          gate={decisionGate}
          onClose={() => setDecisionGate(null)}
          onDone={() => { setDecisionGate(null); load(); }}
        />
      )}
    </div>
  );
}
