import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db, hashPassword, permissionsForRole, type PermissionKey, type RoleKey } from '@/db/db';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: RoleKey;
  permissions: PermissionKey[];
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  needsOnboarding: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  completeOnboarding: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      needsOnboarding: false,

      login: async (email: string, password: string) => {
        try {
          const user = await db.users.where('email').equals(email.toLowerCase().trim()).first();
          if (!user) {
            return { success: false, error: 'No account found with this email.' };
          }
          const hash = await hashPassword(password);
          if (hash !== user.passwordHash) {
            return { success: false, error: 'Incorrect password.' };
          }
          set({
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              permissions: Array.isArray(user.permissions) ? user.permissions : permissionsForRole(user.role),
            },
            isAuthenticated: true,
            needsOnboarding: false,
          });
          return { success: true };
        } catch {
          return { success: false, error: 'An unexpected error occurred.' };
        }
      },

      register: async (name: string, email: string, password: string) => {
        try {
          const normalizedEmail = email.toLowerCase().trim();
          const existing = await db.users.where('email').equals(normalizedEmail).first();
          if (existing) {
            return { success: false, error: 'An account with this email already exists.' };
          }
          const passwordHash = await hashPassword(password);
          const id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          const newUser = {
            id,
            name: name.trim(),
            email: normalizedEmail,
            passwordHash,
            role: 'compliance_admin' as const,
            permissions: permissionsForRole('compliance_admin'),
            createdAt: Date.now(),
          };
          await db.users.add(newUser);
          set({
            user: { id, name: newUser.name, email: newUser.email, role: newUser.role, permissions: newUser.permissions },
            isAuthenticated: true,
            needsOnboarding: true,
          });
          return { success: true };
        } catch {
          return { success: false, error: 'An unexpected error occurred.' };
        }
      },

      completeOnboarding: () => {
        set({ needsOnboarding: false });
      },

      logout: () => {
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'ncompliant-auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        needsOnboarding: state.needsOnboarding,
      }),
    }
  )
);
