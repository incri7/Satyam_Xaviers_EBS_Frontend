import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { Home, Layout, RootRedirect } from './App';
import { Academics, AdmissionsPage, Contact, News } from './pages/Inner';
import { About } from './pages/About';
import { Gallery } from './pages/Gallery';
import './styles.css';
import './pages.css';

const router = createBrowserRouter([
  { path: '/', element: <RootRedirect /> },
  {
    path: '/:lang',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'about', element: <About /> },
      { path: 'programmes', element: <Academics /> },
      { path: 'academics', element: <Navigate to="../programmes" replace /> },
      { path: 'gallery', element: <Gallery /> },
      { path: 'life', element: <Navigate to="../gallery" replace /> },
      { path: 'admissions', element: <AdmissionsPage /> },
      { path: 'news', element: <News /> },
      { path: 'contact', element: <Contact /> },
      { path: '*', element: <Navigate to="." replace /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(<StrictMode><RouterProvider router={router} /></StrictMode>);
