import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { apiFetch } from '../../shared/api/client';
import type { Organization, Paginated, Project, UsageStats } from '../../shared/api/types';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { QueryState } from '../../shared/ui/QueryState';

export function DashboardPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const org = useQuery({
    queryKey: ['organization', id],
    queryFn: () => apiFetch<Organization>(`/organizations/${id}`),
    enabled: Boolean(id),
  });
  const usage = useQuery({
    queryKey: ['usage', id],
    queryFn: () => apiFetch<UsageStats>(`/organizations/${id}/usage`),
    enabled: Boolean(id),
  });
  const projects = useQuery({
    queryKey: ['projects', id],
    queryFn: () => apiFetch<Paginated<Project>>(`/organizations/${id}/projects`),
    enabled: Boolean(id),
  });
  const remove = useMutation({
    mutationFn: () => apiFetch(`/organizations/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['organizations'] });
      navigate('/organizations');
    },
  });

  const chart = (usage.data?.overTime ?? []).map((row) => ({
    ...row,
    date: new Date(row.date).toLocaleDateString(),
  }));
  const projectRows = projects.data?.data ?? [];

  return (
    <div className="space-y-8">
      <QueryState loading={org.isLoading} error={org.error}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{org.data?.name ?? 'Organization'}</h1>
            <p className="text-sm text-slate-500">Your role: {org.data?.role}</p>
          </div>
          {org.data?.role === 'OWNER' ? (
            <button className="rounded-md border border-red-200 px-3 py-2 text-sm text-red-600" onClick={() => setConfirmDelete(true)}>
              Delete organization
            </button>
          ) : null}
        </div>
      </QueryState>
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Requests today" value={usage.data?.today.requests ?? 0} />
        <Stat label="Requests this month" value={usage.data?.month.requests ?? 0} />
        <Stat label="Successful" value={usage.data?.month.successful ?? 0} />
        <Stat label="Avg response (ms)" value={usage.data?.month.averageResponseTimeMs ?? 0} />
      </div>
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-medium">Usage over time</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="requests" stroke="#4f46e5" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-medium">Projects</h2>
        <QueryState loading={projects.isLoading} error={projects.error} empty={projectRows.length === 0} emptyMessage="No projects yet.">
          <ul className="divide-y divide-slate-100">
            {projectRows.map((project) => (
              <li key={project.id} className="flex justify-between py-3 text-sm">
                <span>{project.name}</span>
                <span className="text-slate-500">{project.status}</span>
              </li>
            ))}
          </ul>
        </QueryState>
      </section>
      {confirmDelete ? (
        <ConfirmDialog
          title="Delete organization"
          body="This permanently deletes projects, keys, usage, and members for this workspace."
          confirmLabel="Delete"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => remove.mutate()}
        />
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}
