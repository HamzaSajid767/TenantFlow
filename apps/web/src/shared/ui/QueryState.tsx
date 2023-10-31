import type { ReactNode } from 'react';
import { errorMessage } from '../api/client';

export function QueryState({
  loading,
  error,
  empty,
  emptyMessage,
  children,
}: {
  loading: boolean;
  error: unknown;
  empty?: boolean;
  emptyMessage?: string;
  children: ReactNode;
}) {
  if (loading) {
    return <p className="text-sm text-slate-500">Loading...</p>;
  }
  if (error) {
    const message = errorMessage(error);
    return <p className="text-sm text-red-600">{message}</p>;
  }
  if (empty) {
    return <p className="text-sm text-slate-500">{emptyMessage ?? 'Nothing here yet.'}</p>;
  }
  return <>{children}</>;
}
