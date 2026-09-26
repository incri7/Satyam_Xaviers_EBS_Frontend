import { useCallback, useEffect, useState } from 'react';

export interface SortState<K extends string> {
    by: K | null;
    dir: 'asc' | 'desc';
}

/**
 * Search, paging and sort for a server-paged register. Shared by every
 * People tab so they behave the same:
 *
 * - search is debounced 300ms, so typing a name is one request, not twelve;
 * - any change to what is shown returns to page 1;
 * - a column cycles ascending → descending → back to the server's order.
 */
export function useListControls<K extends string>() {
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [sort, setSort] = useState<SortState<K>>({ by: null, dir: 'asc' });

    useEffect(() => {
        const id = setTimeout(() => {
            setSearch(searchInput.trim());
            setPage(1);
        }, 300);
        return () => clearTimeout(id);
    }, [searchInput]);

    const toggleSort = useCallback((key: K) => {
        setPage(1);
        setSort((prev) => {
            if (prev.by !== key) return { by: key, dir: 'asc' };
            return prev.dir === 'asc' ? { by: key, dir: 'desc' } : { by: null, dir: 'asc' };
        });
    }, []);

    /** Wrap a filter setter so changing it also returns to page 1. */
    const filter = useCallback(<T,>(setter: (v: T) => void) => (v: T) => { setter(v); setPage(1); }, []);

    const resetSearch = useCallback(() => {
        setSearchInput('');
        setSearch('');
        setPage(1);
    }, []);

    return { searchInput, setSearchInput, search, page, setPage, sort, toggleSort, filter, resetSearch };
}
