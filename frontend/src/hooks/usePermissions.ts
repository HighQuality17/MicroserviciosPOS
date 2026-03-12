import { can, getCapabilitiesForRole } from '@/app/permissions';
import { useSessionStore } from '@/store/sessionStore';
import type { PermissionCapability } from '@/app/permissions';

export function usePermissions() {
  const currentUser = useSessionStore((state) => state.currentUser);
  const role = currentUser?.role ?? null;
  const capabilities = getCapabilitiesForRole(role);

  return {
    role,
    capabilities,
    can: (capability: PermissionCapability) => can(role, capability),
    isAdmin: role === 'ADMIN',
    isCashier: role === 'CASHIER',
    isAuditor: role === 'AUDITOR',
  };
}

