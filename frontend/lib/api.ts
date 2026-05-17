import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
})

// Attach token from localStorage on every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('pulse_access')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// On 401, clear tokens and redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('pulse_access')
      localStorage.removeItem('pulse_refresh')
      localStorage.removeItem('pulse_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login/', { email, password }),
  me: () => api.get('/auth/me/'),
}

// ── Goals ─────────────────────────────────────────────────────────────────────
export const goalsApi = {
  getSheets: (year?: number) =>
    api.get('/goals/sheets/', { params: { year } }),
  getSheet: (year?: number) =>
    api.get('/goals/sheets/', { params: { year } }),
  addGoal: (sheetId: number, data: any) =>
    api.post(`/goals/sheets/${sheetId}/goals/`, data),
  updateGoal: (sheetId: number, goalId: number, data: any) =>
    api.put(`/goals/sheets/${sheetId}/goals/${goalId}/`, data),
  deleteGoal: (sheetId: number, goalId: number) =>
    api.delete(`/goals/sheets/${sheetId}/goals/${goalId}/`),
  submitSheet: (sheetId: number) =>
    api.post(`/goals/sheets/${sheetId}/submit/`),
  approveSheet: (sheetId: number) =>
    api.post(`/goals/sheets/${sheetId}/approve/`),
  returnSheet: (sheetId: number, reason: string) =>
    api.post(`/goals/sheets/${sheetId}/return/`, { reason }),
  unlockSheet: (sheetId: number, reason: string) =>
    api.post(`/goals/sheets/${sheetId}/unlock/`, { reason }),
  getReview: () => api.get('/goals/review/'),
  getSharedGoals: (year?: number) =>
    api.get('/goals/shared/', { params: { year } }),
  createSharedGoal: (data: any) => api.post('/goals/shared/', data),
  updateAchievement: (goalId: number, achievement: number) =>
    api.patch(`/goals/entries/${goalId}/achievement/`, { achievement }),
  getAlignmentMap: (year?: number, quarter?: string) =>
    api.get('/goals/alignment-map/', { params: { year, quarter } }),
}

// ── Check-ins ─────────────────────────────────────────────────────────────────
export const checkinsApi = {
  getForGoal: (goalId: number) => api.get(`/checkins/goal/${goalId}/`),
  submitCheckin: (goalId: number, data: any) =>
    api.post(`/checkins/goal/${goalId}/`, data),
  addManagerComment: (goalId: number, checkinId: number, data: any) =>
    api.patch(`/checkins/goal/${goalId}/${checkinId}/`, data),
  getTeamCheckins: (year?: number) =>
    api.get('/checkins/team/', { params: { year } }),
  export: (year: number, format = 'xlsx') =>
    api.get('/checkins/export/', { params: { year, format }, responseType: 'blob' }),
}

// ── Cycles ────────────────────────────────────────────────────────────────────
export const cyclesApi = {
  getWindows: (year?: number) =>
    api.get('/cycles/windows/', { params: { year } }),
  createWindow: (data: any) => api.post('/cycles/windows/', data),
  updateWindow: (id: number, data: any) =>
    api.patch(`/cycles/windows/${id}/`, data),
}

// ── Users ─────────────────────────────────────────────────────────────────────
export const usersApi = {
  getTeam: () => api.get('/users/team/'),
  getAll: () => api.get('/users/'),
}

// ── Escalations ───────────────────────────────────────────────────────────────
export const escalationsApi = {
  list: (unresolved?: boolean) =>
    api.get('/escalations/', { params: { unresolved } }),
  create: (data: any) => api.post('/escalations/', data),
  resolve: (id: number) => api.patch(`/escalations/${id}/`, {}),
}

// ── Audit ─────────────────────────────────────────────────────────────────────
export const auditApi = {
  getLogs: (params?: any) => api.get('/audit/logs/', { params }),
}

// ── AI ────────────────────────────────────────────────────────────────────────
export const aiApi = {
  suggestGoal: (data: any) => api.post('/ai/suggest-goal/', data),
  draftCheckinComment: (data: any) =>
    api.post('/ai/draft-checkin-comment/', data),
}
