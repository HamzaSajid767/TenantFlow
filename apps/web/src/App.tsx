import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AppRouter } from './app/AppRouter';
import { SessionProvider } from './shared/api/session';
import './styles.css';

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SessionProvider>
          <AppRouter />
        </SessionProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
