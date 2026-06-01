import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const navItems = [
  { to: '/', label: 'Home', exact: true },
  { to: '/documents', label: 'Documents' },
  { to: '/cards', label: 'Cards' },
];

const mobileNav = [
  { to: '/', label: 'Home', exact: true },
  { to: '/documents', label: 'Docs' },
  { to: '/cards', label: 'Cards' },
];

export default function Layout() {
  const location = useLocation();
  const { user, logout } = useAuth();

  const isActive = (to: string, exact?: boolean) => {
    if (exact) return location.pathname === to;
    return location.pathname.startsWith(to);
  };

  return (
    <div className="min-h-screen grid grid-rows-[56px_1fr] max-md:grid-rows-[56px_1fr_auto]">
      <header className="topbar max-md:px-3">
        <NavLink to="/" className="flex items-center gap-2.5 min-w-[180px] max-md:min-w-0 no-underline">
          <div
            className="w-7 h-7 rounded-full border border-[#c9cec9] shrink-0"
            style={{
              background:
                'radial-gradient(circle at 35% 32%, #fff 0 20%, #e9e5dc 21% 54%, #a7b0b0 55% 100%)',
              boxShadow: 'inset 0 0 0 4px rgba(255,255,255,.34)',
            }}
          />
          <span className="font-semibold tracking-tight text-[#171717] max-md:hidden">
            baberu
          </span>
        </NavLink>

        <nav className="flex gap-1 p-1 border border-border rounded-full bg-panel-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={`border-0 bg-transparent text-muted px-4 py-1.5 rounded-full text-[13px] no-underline transition-colors ${
                isActive(item.to, item.exact)
                  ? 'bg-panel text-[#171717] shadow-[0_1px_2px_rgba(0,0,0,.05)]'
                  : 'hover:text-[#171717]'
              }`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2 justify-end min-w-[180px] max-md:min-w-0">
          <span className="text-xs text-muted mr-2 hidden md:inline">{user?.username}</span>
          <button className="btn-ghost text-xs" onClick={logout}>Logout</button>
        </div>
      </header>

      <main className="p-4 max-md:p-3 max-md:pb-20 overflow-hidden">
        <Outlet />
      </main>

      <nav className="hidden max-md:flex fixed left-3 right-3 bottom-3 z-30 justify-around p-1 border border-border rounded-full bg-panel-2 shadow-[0_10px_40px_rgba(0,0,0,.12)]">
        {mobileNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={`border-0 bg-transparent text-muted px-2 py-1.5 rounded-full text-[13px] no-underline transition-colors flex-1 text-center ${
              isActive(item.to, item.exact)
                ? 'bg-panel text-[#171717] shadow-[0_1px_2px_rgba(0,0,0,.05)]'
                : 'hover:text-[#171717]'
            }`}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
