/**
 * Whether the persistent Sidebar renders anything for this role at this
 * route. Parents get no sidebar outside a specific child's pages (see
 * Sidebar.tsx) — shared here so DashboardHeader can hide its mobile menu
 * toggle in the same cases, instead of showing a button that opens nothing.
 */
export const hasSidebar = (role: string | undefined | null, pathname: string): boolean => {
    if (role === 'parent') {
        return /^\/parent\/child\/\d+/.test(pathname);
    }
    return true;
};
