import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../../shared/api/client';
import type { AuditLog, Paginated } from '../../shared/api/types';
import { QueryState } from '../../shared/ui/QueryState';

export function AuditLogsPage() {
  const { id = '' } = useParams();
  const logs = useQuery({
    queryKey: ['audit-logs', id],
    queryFn: () => apiFetch<Paginated<AuditLog>>(`/organizations/${id}/audit-logs?sort=desc`),
  });
  const rows = logs.data?.data ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Audit logs</h1>
      <QueryState loading={logs.isLoading} error={logs.error} empty={rows.length === 0} emptyMessage="No audit events yet.">
        <table className="w-full rounded-xl bg-white text-left text-sm shadow-sm">
          <thead>
            <tr className="text-slate-500">
              <th className="px-4 py-3">Time</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Resource</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((log) => (
              <tr key={log.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{new Date(log.createdAt).toLocaleString()}</td>
                <td>{log.actor.email}</td>
                <td>{log.action}</td>
                <td>
                  {log.resourceType}
                  {log.resourceId ? ` · ${log.resourceId.slice(0, 8)}` : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </QueryState>
    </div>
  );
}
