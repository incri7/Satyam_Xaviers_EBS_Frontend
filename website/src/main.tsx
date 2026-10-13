import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Navigate, RouterProvider, useLocation } from 'react-router-dom';
import { Home, Layout } from './App';
import { Academics, AdmissionsPage, Contact, News } from './pages/Inner';
import { Gallery } from './pages/Gallery';
import './styles.css';

// Bare / (or /ne) with no #moment: a member of the school signed in to the app on this device goes to their own home
// there (the app's own role homes, src/utils/roleHome.ts), as the app's / used to send them; anyone else gets the
// website's home page, from the top: the browser does not put them back where they were.
const ROLE_HOME: Record<string, string> = { admin: '/dashboard', teacher: '/home/teacher', parent: '/home/parent', accountant: '/home/accountant',
  coordinator: '/home/coordinator', student: '/home/student', principal: '/home/principal' };
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
if (/^\/(ne\/?)?$/.test(location.pathname) && !location.hash) {
  try {
    const raw = sessionStorage.getItem('auth-storage') ?? localStorage.getItem('auth-storage');
    const state = raw ? JSON.parse(raw).state : null;
    if (state?.isAuthenticated && state?.accessToken) location.replace(ROLE_HOME[state.user?.role] ?? '/profile');
  } catch { /* no session to read: the website it is */ }
}
import './pages.css';

/** One set of pages: English at the root, Nepali under /ne. */
const pages = [
  { index: true, element: <Home /> },
  { path: 'about', element: <Navigate to="../#about" replace /> },   // About is the home page's first page
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
