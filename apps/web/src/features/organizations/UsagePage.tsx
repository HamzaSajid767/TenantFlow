import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { apiFetch } from '../../shared/api/client';
import type { UsageStats } from '../../shared/api/types';
import { QueryState } from '../../shared/ui/QueryState';

export function UsagePage() {
  const { id = '' } = useParams();
  const usage = useQuery({
    queryKey: ['usage', id],
    queryFn: () => apiFetch<UsageStats>(`/organizations/${id}/usage`),
  });
  const data = usage.data;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Usage</h1>
      <QueryState loading={usage.isLoading} error={usage.error}>
        <>
        <div className="grid gap-4 md:grid-cols-4">
          <Card label="Today" value={data?.today.requests ?? 0} />
          <Card label="This month" value={data?.month.requests ?? 0} />
          <Card label="Successful" value={data?.month.successful ?? 0} />
          <Card label="Failed" value={data?.month.failed ?? 0} />
        </div>
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-medium">By endpoint</h2>
          {(data?.byEndpoint ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">No request volume yet. Call the Events API with an API key to populate this chart.</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.byEndpoint ?? []}>
                  <XAxis dataKey="endpoint" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="requests" fill="#4f46e5" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
        </>
      </QueryState>
    </div>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}
