import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from './routes';
import { usePermissionsInit } from './hooks/usePermissionsInit';

const queryClient = new QueryClient();

function App() {
  usePermissionsInit(); // Ensure permissions are loaded/refreshed on app load

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

export default App;
