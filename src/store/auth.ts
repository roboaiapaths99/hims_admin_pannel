import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  tenant_id: string | null;
  hospital_id: string | null;
  branch_id: string | null;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  currentBranchId: string | null;
  setAuth: (token: string, refreshToken: string, user: User) => void;
  setCurrentBranchId: (branchId: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('hmis_token'),
  refreshToken: localStorage.getItem('hmis_refresh_token'),
  user: (() => {
    const raw = localStorage.getItem('hmis_user');
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })(),
  currentBranchId: localStorage.getItem('hmis_current_branch_id'),
  
  setAuth: (token, refreshToken, user) => {
    localStorage.setItem('hmis_token', token);
    localStorage.setItem('hmis_refresh_token', refreshToken);
    localStorage.setItem('hmis_user', JSON.stringify(user));
    
    // Default currentBranchId to user's assigned branch if present
    const branchId = user.branch_id || null;
    if (branchId) {
      localStorage.setItem('hmis_current_branch_id', branchId);
    }
    
    set({ token, refreshToken, user, currentBranchId: branchId });
  },
  
  setCurrentBranchId: (branchId) => {
    if (branchId) {
      localStorage.setItem('hmis_current_branch_id', branchId);
    } else {
      localStorage.removeItem('hmis_current_branch_id');
    }
    set({ currentBranchId: branchId });
  },
  
  logout: () => {
    localStorage.removeItem('hmis_token');
    localStorage.removeItem('hmis_refresh_token');
    localStorage.removeItem('hmis_user');
    localStorage.removeItem('hmis_current_branch_id');
    set({ token: null, refreshToken: null, user: null, currentBranchId: null });
  }
}));
