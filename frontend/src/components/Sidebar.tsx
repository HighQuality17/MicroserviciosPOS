import { Boxes, ChefHat, CreditCard, LayoutDashboard, Package2, ReceiptText, ShoppingCart, TestTube2 } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const links = [
  { to: '/pos', label: 'POS', icon: ShoppingCart },
  { to: '/cash', label: 'Caja', icon: CreditCard },
  { to: '/products', label: 'Productos', icon: Package2 },
  { to: '/ingredients', label: 'Ingredientes', icon: TestTube2 },
  { to: '/combos', label: 'Combos', icon: Boxes },
  { to: '/sales', label: 'Ventas', icon: ReceiptText },
  { to: '/admin', label: 'Admin', icon: LayoutDashboard },
];

export function Sidebar() {
  return (
    <aside className="border-b border-slate-800/70 bg-slate-950/70 px-4 py-6 lg:min-h-screen lg:border-b-0 lg:border-r lg:px-6">
      <div className="flex items-center gap-3 px-3">
        <div className="rounded-3xl bg-gradient-to-br from-teal-300 to-sky-400 p-3 text-slate-950">
          <ChefHat size={22} />
        </div>
        <div>
          <p className="font-display text-lg font-bold text-white">Caja local</p>
          <p className="text-xs text-slate-500">offline-first</p>
        </div>
      </div>

      <nav className="mt-8 grid gap-2">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition',
                isActive
                  ? 'bg-teal-300 text-slate-950'
                  : 'text-slate-300 hover:bg-slate-900/80 hover:text-white',
              ].join(' ')
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
