import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '../shared/api/session';
import { apiFetch } from '../shared/api/client';
import type { Organization } from '../shared/api/types';

const links = [
  { to: '', label: 'Overview', end: true },
  { to: 'members', label: 'Members' },
  { to: 'projects', label: 'Projects' },
  { to: 'api-keys', label: 'API keys' },
  { to: 'usage', label: 'Usage' },
  { to: 'audit-logs', label: 'Audit logs' },
];

export function AppLayout() {
  const { user, logout } = useSession();
  const navigate = useNavigate();
  const { id } = useParams();
  const orgs = useQuery({
    queryKey: ['organizations'],
    queryFn: () => apiFetch<Organization[]>('/organizations'),
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 w-64 border-r border-slate-200 bg-slate-950 text-slate-100">
        <div className="px-5 py-6">
          <div className="text-lg font-semibold tracking-tight">SaaSForge</div>
          <div className="mt-1 text-xs text-slate-400">Multi-tenant API platform</div>
        </div>
        <div className="px-4">
          <label className="text-xs uppercase tracking-wide text-slate-500">Organization</label>
          <select
            className="mt-2 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            value={id ?? ''}
            onChange={(event) => {
              if (event.target.value) {
                void navigate(`/organizations/${event.target.value}`);
              }
            }}
          >
            <option value="">Select...</option>
            {(orgs.data ?? []).map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>
        <nav className="mt-6 space-y-1 px-3">
          <NavLink
            to="/organizations"
            className={({ isActive }) =>
              `block rounded-md px-3 py-2 text-sm ${isActive && !id ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-900'}`
            }
            end
          >
            All organizations
          </NavLink>
          {id
            ? links.map((link) => (
                <NavLink
                  key={link.to}
                  to={`/organizations/${id}${link.to ? `/${link.to}` : ''}`}
                  end={link.end}
                  className={({ isActive }) =>
                    `block rounded-md px-3 py-2 text-sm ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-900'}`
                  }
                >
                  {link.label}
                </NavLink>
              ))
            : null}
        </nav>
      </aside>
      <div className="ml-64">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4">
          <div className="text-sm text-slate-500">Signed in as {user?.email}</div>
          <button
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
            onClick={() => {
              void logout().then(() => navigate('/login'));
            }}
          >
            Log out
          </button>
        </header>
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
