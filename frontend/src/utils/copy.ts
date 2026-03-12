export function formatUserRole(role?: string | null) {
  if (role === 'ADMIN') return 'Administrador';
  if (role === 'CASHIER') return 'Cajero';
  if (role === 'AUDITOR') return 'Auditor';
  return role ?? 'Sin perfil';
}

