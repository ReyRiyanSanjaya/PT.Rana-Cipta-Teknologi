import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
  distributorId?: string;
  subRole?: string;
  subRoleLabel?: string;
  permissions?: string[];
  isOwner?: boolean;
  position?: { code: string; title: string; level: number; territory: string | null } | null;
  manager?: { id: string; name: string; position: string | null } | null;
  subordinateCount?: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  setPermissions: (subRole: string, subRoleLabel: string, permissions: string[], isOwner: boolean, position?: any, manager?: any, subordinateCount?: number) => void;
  hasPermission: (module: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      login: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
      setPermissions: (subRole, subRoleLabel, permissions, isOwner, position, manager, subordinateCount) => {
        const user = get().user;
        if (user) {
          set({ user: { ...user, subRole, subRoleLabel, permissions, isOwner, position: position || null, manager: manager || null, subordinateCount: subordinateCount || 0 } });
        }
      },
      hasPermission: (module: string) => {
        const user = get().user;
        if (!user || !user.permissions) return true; // Default allow if not loaded yet
        if (user.permissions.includes('*')) return true;
        return user.permissions.includes(module);
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
