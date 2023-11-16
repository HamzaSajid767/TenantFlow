import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { apiFetch, errorMessage } from '../../shared/api/client';
import type { Invitation, Member, Organization } from '../../shared/api/types';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { QueryState } from '../../shared/ui/QueryState';

type AssignableRole = Organization['role'];

export function MembersPage() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'DEVELOPER'>('DEVELOPER');
  const [pendingRemove, setPendingRemove] = useState<Member | null>(null);
  const org = useQuery({
    queryKey: ['organization', id],
    queryFn: () => apiFetch<Organization>(`/organizations/${id}`),
  });
  const members = useQuery({
    queryKey: ['members', id],
    queryFn: () => apiFetch<Member[]>(`/organizations/${id}/members`),
  });
  const invitations = useQuery({
    queryKey: ['invitations', id],
    queryFn: () => apiFetch<Invitation[]>(`/organizations/${id}/invitations`),
  });
  const invite = useMutation({
    mutationFn: () =>
      apiFetch(`/organizations/${id}/invitations`, {
        method: 'POST',
        body: JSON.stringify({ email, role }),
      }),
    onSuccess: async () => {
      setEmail('');
      await queryClient.invalidateQueries({ queryKey: ['invitations', id] });
    },
  });
  const changeRole = useMutation({
    mutationFn: ({ memberId, nextRole }: { memberId: string; nextRole: AssignableRole }) =>
      apiFetch(`/organizations/${id}/members/${memberId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: nextRole }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['members', id] });
    },
  });
  const remove = useMutation({
    mutationFn: (memberId: string) => apiFetch(`/organizations/${id}/members/${memberId}`, { method: 'DELETE' }),
    onSuccess: async () => {
      setPendingRemove(null);
      await queryClient.invalidateQueries({ queryKey: ['members', id] });
    },
  });
  const canManage = org.data?.role === 'OWNER' || org.data?.role === 'ADMIN';
  const canAssignOwner = org.data?.role === 'OWNER';
  const memberRows = members.data ?? [];
  const invitationRows = invitations.data ?? [];

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    invite.mutate();
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Members</h1>
      {canManage ? (
        <form onSubmit={onSubmit} className="flex flex-wrap gap-3 rounded-xl bg-white p-4 shadow-sm">
          <input
            className="min-w-48 flex-1 rounded-md border border-slate-300 px-3 py-2"
            type="email"
            placeholder="Invite by email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <select className="rounded-md border border-slate-300 px-3 py-2" value={role} onChange={(e) => setRole(e.target.value as 'ADMIN' | 'DEVELOPER')}>
            <option value="DEVELOPER">Developer</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button className="rounded-md bg-indigo-600 px-4 py-2 text-white" type="submit" disabled={invite.isPending}>
            Invite
          </button>
        </form>
      ) : null}
      {invite.error ? <p className="text-sm text-red-600">{errorMessage(invite.error)}</p> : null}
      {changeRole.error ? <p className="text-sm text-red-600">{errorMessage(changeRole.error)}</p> : null}
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-medium">Team</h2>
        <QueryState loading={members.isLoading} error={members.error} empty={memberRows.length === 0} emptyMessage="No members found.">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-slate-500">
                <th className="py-2">Name</th>
                <th>Email</th>
                <th>Role</th>
                {canManage ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {memberRows.map((member) => (
                <tr key={member.id} className="border-t border-slate-100">
                  <td className="py-2">{member.user.name}</td>
                  <td>{member.user.email}</td>
                  <td>
                    {canManage ? (
                      <select
                        className="rounded-md border border-slate-200 px-2 py-1"
                        value={member.role}
                        onChange={(event) =>
                          changeRole.mutate({ memberId: member.id, nextRole: event.target.value as AssignableRole })
                        }
                      >
                        {canAssignOwner ? <option value="OWNER">OWNER</option> : null}
                        <option value="ADMIN">ADMIN</option>
                        <option value="DEVELOPER">DEVELOPER</option>
                      </select>
                    ) : (
                      member.role
                    )}
                  </td>
                  {canManage ? (
                    <td className="text-right">
                      <button className="text-red-600" onClick={() => setPendingRemove(member)} type="button">
                        Remove
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </QueryState>
      </section>
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-medium">Invitations</h2>
        <QueryState loading={invitations.isLoading} error={invitations.error} empty={invitationRows.length === 0} emptyMessage="No invitations yet.">
          <ul className="text-sm">
            {invitationRows.map((invitation) => (
              <li key={invitation.id} className="flex justify-between border-t border-slate-100 py-2">
                <span>{invitation.email}</span>
                <span className="text-slate-500">
                  {invitation.role} · {invitation.status}
                </span>
              </li>
            ))}
          </ul>
        </QueryState>
      </section>
      {pendingRemove ? (
        <ConfirmDialog
          title="Remove member"
          body={`Remove ${pendingRemove.user.email} from this organization? They will lose access immediately.`}
          confirmLabel="Remove"
          onCancel={() => setPendingRemove(null)}
          onConfirm={() => remove.mutate(pendingRemove.id)}
        />
      ) : null}
    </div>
  );
}
