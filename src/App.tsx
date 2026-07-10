import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from './routes';
import { usePermissionsInit } from './hooks/usePermissionsInit';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { InstallPrompt } from './components/InstallPrompt';

const queryClient = new QueryClient();

function App() {
  usePermissionsInit(); // Ensure permissions are loaded/refreshed on app load

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <InstallPrompt />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
