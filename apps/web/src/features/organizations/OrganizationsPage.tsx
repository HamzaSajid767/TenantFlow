import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiFetch, errorMessage } from '../../shared/api/client';
import type { Organization } from '../../shared/api/types';
import { QueryState } from '../../shared/ui/QueryState';

export function OrganizationsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const orgs = useQuery({
    queryKey: ['organizations'],
    queryFn: () => apiFetch<Organization[]>('/organizations'),
  });
  const create = useMutation({
    mutationFn: () => apiFetch<Organization>('/organizations', { method: 'POST', body: JSON.stringify({ name }) }),
    onSuccess: async () => {
      setName('');
      await queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (name.trim().length < 2) {
      return;
    }
    create.mutate();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Organizations</h1>
        <p className="text-sm text-slate-500">Create a workspace, then invite your team.</p>
      </div>
      <form onSubmit={onSubmit} className="flex gap-3 rounded-xl bg-white p-4 shadow-sm">
        <input
          className="flex-1 rounded-md border border-slate-300 px-3 py-2"
          placeholder="Organization name"
          minLength={2}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <button className="rounded-md bg-indigo-600 px-4 py-2 text-white" type="submit" disabled={create.isPending}>
          Create
        </button>
      </form>
      {create.error ? <p className="text-sm text-red-600">{errorMessage(create.error)}</p> : null}
      <QueryState loading={orgs.isLoading} error={orgs.error} empty={(orgs.data ?? []).length === 0} emptyMessage="No organizations yet. Create one to get started.">
        <div className="grid gap-4 md:grid-cols-2">
          {(orgs.data ?? []).map((org) => (
            <Link
              key={org.id}
              to={`/organizations/${org.id}`}
              className="rounded-xl bg-white p-5 shadow-sm hover:ring-2 hover:ring-indigo-200"
            >
              <div className="text-lg font-medium">{org.name}</div>
              <div className="mt-1 text-sm text-slate-500">
                {org.slug} · {org.role}
              </div>
            </Link>
          ))}
        </div>
      </QueryState>
    </div>
  );
}
