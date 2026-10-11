import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Navigate, RouterProvider, useLocation } from 'react-router-dom';
import { Home, Layout } from './App';
import { Academics, AdmissionsPage, Contact, News } from './pages/Inner';
import { About } from './pages/About';
import { Gallery } from './pages/Gallery';
import './styles.css';
import './pages.css';

/** One set of pages: English at the root, Nepali under /ne. */
const pages = [
  { index: true, element: <Home /> },
  { path: 'about', element: <About /> },
  { path: 'programmes', element: <Academics /> },
  { path: 'academics', element: <Navigate to="../programmes" replace /> },
  { path: 'gallery', element: <Gallery /> },
  { path: 'life', element: <Navigate to="../gallery" replace /> },
  { path: 'admissions', element: <AdmissionsPage /> },
  { path: 'news', element: <News /> },
  { path: 'contact', element: <Contact /> },
];

/** Links from before English moved to the root: /en/about becomes /about. */
function FromEn() {
  const { pathname, hash } = useLocation();
  return <Navigate to={(pathname.replace(/^\/en(?=\/|$)/, '') || '/') + hash} replace />;
}

// One route for both languages ('/ne' is an optional segment), so switching language keeps the page mounted:
// the story, its 3D scene and the reader's place stay where they are, and only the words change.
const router = createBrowserRouter([
  { path: '/ne?', element: <Layout />, children: pages },
  { path: '/en/*', element: <FromEn /> },
  { path: '*', element: <Navigate to="/" replace /> },
]);

createRoot(document.getElementById('root')!).render(<StrictMode><RouterProvider router={router} /></StrictMode>);
