import { useMutation } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch, errorMessage } from '../../shared/api/client';

export function AcceptInvitationPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const accept = useMutation({
    mutationFn: () => apiFetch<{ organizationId: string }>('/invitations/accept', { method: 'POST', body: JSON.stringify({ token }) }),
    onSuccess: (result) => navigate(`/organizations/${result.organizationId}`),
  });

  return (
    <div className="mx-auto max-w-lg rounded-xl bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold">Organization invitation</h1>
      <p className="mt-2 text-sm text-slate-500">Accept this invitation with the account that matches the invited email.</p>
      {accept.error ? <p className="mt-4 text-sm text-red-600">{errorMessage(accept.error)}</p> : null}
      <button
        className="mt-6 rounded-md bg-indigo-600 px-4 py-2 text-white disabled:opacity-50"
        disabled={!token || accept.isPending}
        onClick={() => accept.mutate()}
      >
        Accept invitation
      </button>
    </div>
  );
}
