import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { apiFetch, errorMessage } from '../../shared/api/client';
import type { Organization, Paginated, Project } from '../../shared/api/types';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { QueryState } from '../../shared/ui/QueryState';

export function ProjectsPage() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const org = useQuery({
    queryKey: ['organization', id],
    queryFn: () => apiFetch<Organization>(`/organizations/${id}`),
  });
  const projects = useQuery({
    queryKey: ['projects', id],
    queryFn: () => apiFetch<Paginated<Project>>(`/organizations/${id}/projects`),
  });
  const create = useMutation({
    mutationFn: () =>
      apiFetch(`/organizations/${id}/projects`, {
        method: 'POST',
        body: JSON.stringify({ name, description }),
      }),
    onSuccess: async () => {
      setName('');
      setDescription('');
      await queryClient.invalidateQueries({ queryKey: ['projects', id] });
    },
  });
  const remove = useMutation({
    mutationFn: (projectId: string) => apiFetch(`/organizations/${id}/projects/${projectId}`, { method: 'DELETE' }),
    onSuccess: async () => {
      setPendingDelete(null);
      await queryClient.invalidateQueries({ queryKey: ['projects', id] });
    },
  });
  const canManage = org.data?.role === 'OWNER' || org.data?.role === 'ADMIN';
  const rows = projects.data?.data ?? [];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Projects</h1>
      {canManage ? (
        <form
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            create.mutate();
          }}
          className="space-y-3 rounded-xl bg-white p-4 shadow-sm"
        >
          <input className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Project name" minLength={2} value={name} onChange={(e) => setName(e.target.value)} required />
          <input className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          {create.error ? <p className="text-sm text-red-600">{errorMessage(create.error)}</p> : null}
          <button className="rounded-md bg-indigo-600 px-4 py-2 text-white" type="submit" disabled={create.isPending}>
            Create project
          </button>
        </form>
      ) : null}
      <QueryState loading={projects.isLoading} error={projects.error} empty={rows.length === 0} emptyMessage="No projects yet.">
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((project) => (
            <article key={project.id} className="rounded-xl bg-white p-5 shadow-sm">
              <div className="font-medium">{project.name}</div>
              <p className="mt-1 text-sm text-slate-500">{project.description || 'No description'}</p>
              <div className="mt-3 flex items-center justify-between text-xs uppercase text-slate-400">
                <span>{project.status}</span>
                {canManage ? (
                  <button className="text-red-600 normal-case" onClick={() => setPendingDelete(project.id)}>
                    Delete
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </QueryState>
      {pendingDelete ? (
        <ConfirmDialog
          title="Delete project"
          body="API keys and events attached to this project will be removed."
          confirmLabel="Delete"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => remove.mutate(pendingDelete)}
        />
      ) : null}
    </div>
  );
}
