import type { Project, ProjectDetail, Gate, User, DashboardStats, Stage } from './types';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  // Projects
  getProjects: () => request<Project[]>('/projects'),
  getProject: (id: string) => request<ProjectDetail>(`/projects/${id}`),
  createProject: (data: Partial<Project>) =>
    request<Project>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id: string, data: Partial<Project>) =>
    request<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProject: (id: string) =>
    request<{ success: boolean }>(`/projects/${id}`, { method: 'DELETE' }),
  addComment: (projectId: string, data: { user_id: string; content: string; gate_id?: string }) =>
    request(`/projects/${projectId}/comments`, { method: 'POST', body: JSON.stringify(data) }),

  // Gates
  getGates: (params?: { status?: string; project_id?: string }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return request<Gate[]>(`/gates${q ? `?${q}` : ''}`);
  },
  getGate: (id: string) => request<Gate>(`/gates/${id}`),
  submitGate: (id: string, user_id: string) =>
    request<Gate>(`/gates/${id}/submit`, { method: 'POST', body: JSON.stringify({ user_id }) }),
  makeGateDecision: (id: string, data: { reviewer_id: string; decision: string; reason?: string }) =>
    request<Gate>(`/gates/${id}/decision`, { method: 'POST', body: JSON.stringify(data) }),
  resetGate: (id: string) =>
    request<Gate>(`/gates/${id}/reset`, { method: 'POST' }),
  updateChecklistItem: (gateId: string, itemId: string, data: { completed: boolean; notes?: string }) =>
    request(`/gates/${gateId}/checklist/${itemId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Users
  getUsers: () => request<User[]>('/users'),
  getStats: () => request<DashboardStats>('/users/stats'),

  // Stages
  getStages: () => request<Stage[]>('/stages'),
};
