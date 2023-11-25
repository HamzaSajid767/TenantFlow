import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { apiFetch, errorMessage } from '../../shared/api/client';
import type { ApiKey, Organization, Paginated, Project } from '../../shared/api/types';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { QueryState } from '../../shared/ui/QueryState';

export function ApiKeysPage() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [pendingRevoke, setPendingRevoke] = useState<ApiKey | null>(null);
  const org = useQuery({
    queryKey: ['organization', id],
    queryFn: () => apiFetch<Organization>(`/organizations/${id}`),
  });
  const projects = useQuery({
    queryKey: ['projects', id],
    queryFn: () => apiFetch<Paginated<Project>>(`/organizations/${id}/projects`),
  });
  const keys = useQuery({
    queryKey: ['api-keys', id],
    queryFn: () => apiFetch<ApiKey[]>(`/organizations/${id}/api-keys`),
  });
  const create = useMutation({
    mutationFn: () =>
      apiFetch<ApiKey>(`/organizations/${id}/api-keys`, {
        method: 'POST',
        body: JSON.stringify({ name, projectId }),
      }),
    onSuccess: async (key) => {
      setCreatedSecret(key.secret ?? null);
      setName('');
      await queryClient.invalidateQueries({ queryKey: ['api-keys', id] });
    },
  });
  const revoke = useMutation({
    mutationFn: (keyId: string) => apiFetch(`/organizations/${id}/api-keys/${keyId}`, { method: 'DELETE' }),
    onSuccess: async () => {
      setPendingRevoke(null);
      await queryClient.invalidateQueries({ queryKey: ['api-keys', id] });
    },
  });
  const canManage = org.data?.role === 'OWNER' || org.data?.role === 'ADMIN';
  const projectRows = projects.data?.data ?? [];
  const keyRows = keys.data ?? [];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">API keys</h1>
      {createdSecret ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
          Copy this secret now. It will not be shown again.
          <pre className="mt-2 overflow-x-auto rounded bg-white p-3">{createdSecret}</pre>
        </div>
      ) : null}
      {canManage ? (
        <form
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            create.mutate();
          }}
          className="flex flex-wrap gap-3 rounded-xl bg-white p-4 shadow-sm"
        >
          <input className="min-w-48 flex-1 rounded-md border border-slate-300 px-3 py-2" placeholder="Key name" value={name} onChange={(e) => setName(e.target.value)} required />
          <select className="rounded-md border border-slate-300 px-3 py-2" value={projectId} onChange={(e) => setProjectId(e.target.value)} required>
            <option value="">Select project</option>
            {projectRows.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <button className="rounded-md bg-indigo-600 px-4 py-2 text-white" type="submit" disabled={create.isPending}>
            Create key
          </button>
        </form>
      ) : null}
      {create.error ? <p className="text-sm text-red-600">{errorMessage(create.error)}</p> : null}
      <QueryState loading={keys.isLoading} error={keys.error} empty={keyRows.length === 0} emptyMessage="No API keys yet.">
        <table className="w-full rounded-xl bg-white text-left text-sm shadow-sm">
          <thead>
            <tr className="text-slate-500">
              <th className="px-4 py-3">Name</th>
              <th>Prefix</th>
              <th>Last used</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {keyRows.map((key) => (
              <tr key={key.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{key.name}</td>
                <td className="font-mono">{key.keyPrefix}</td>
                <td>{key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : 'Never'}</td>
                <td>{key.revokedAt ? 'Revoked' : 'Active'}</td>
                <td className="px-4">
                  {canManage && !key.revokedAt ? (
                    <button className="text-red-600" onClick={() => setPendingRevoke(key)} type="button">
                      Revoke
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </QueryState>
      {pendingRevoke ? (
        <ConfirmDialog
          title="Revoke API key"
          body={`${pendingRevoke.name} (${pendingRevoke.keyPrefix}…) will stop authenticating immediately. This cannot be undone.`}
          confirmLabel="Revoke"
          onCancel={() => setPendingRevoke(null)}
          onConfirm={() => revoke.mutate(pendingRevoke.id)}
        />
      ) : null}
    </div>
  );
}
