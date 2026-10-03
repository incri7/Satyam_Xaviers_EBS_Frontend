import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { Home, Layout, RootRedirect } from './App';
import { About, Academics, AdmissionsPage, Contact, Life, News } from './pages/Inner';
import './styles.css';
import './pages.css';
import './captions.css';

const router = createBrowserRouter([
  { path: '/', element: <RootRedirect /> },
  {
    path: '/:lang',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'about', element: <About /> },
      { path: 'academics', element: <Academics /> },
      { path: 'life', element: <Life /> },
      { path: 'admissions', element: <AdmissionsPage /> },
      { path: 'news', element: <News /> },
      { path: 'contact', element: <Contact /> },
      { path: '*', element: <Navigate to="." replace /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(<StrictMode><RouterProvider router={router} /></StrictMode>);
