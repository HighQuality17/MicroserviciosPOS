import clsx from 'clsx';
import { NavLink } from 'react-router-dom';
import { getAdminSubnavigationByRole } from '@/app/permissions';
import { useSessionStore } from '@/store/sessionStore';

interface AdminSubmoduleNavProps {
  className?: string;
}

export function AdminSubmoduleNav({ className }: AdminSubmoduleNavProps) {
  const currentUser = useSessionStore((state) => state.currentUser);
  const links = getAdminSubnavigationByRole(currentUser?.role);

  if (links.length === 0) {
    return null;
  }

  return (
    <nav
      className={clsx('admin-section-nav', className)}
      aria-label="Submodulos de administracion"
    >
      <div className="admin-section-nav__eyebrow">Admin</div>
      <div className="admin-section-nav__links">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/admin'}
            className={({ isActive }) =>
              clsx('admin-section-nav__link', isActive && 'admin-section-nav__link--active')
            }
          >
            <span className="admin-section-nav__icon" aria-hidden="true">
              <Icon size={15} />
            </span>
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
