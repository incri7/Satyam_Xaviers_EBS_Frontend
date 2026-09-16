import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Component state that lives in the URL query string.
 *
 * `useState` loses everything on reload, so picking a class, a section and a
 * tab and then refreshing dropped you back to an empty form — and the screen
 * you were looking at could not be sent to anyone. Keeping the selection in
 * the URL fixes both: a reload restores it, the back button steps through it,
 * and the address bar is a shareable link to exactly this view.
 *
 * Values equal to the fallback are removed rather than written, so an
 * untouched page keeps a clean URL instead of accumulating `?tab=mark&page=1`.
 *
 * IMPORTANT: do not call two of these setters in one event handler. React
 * Router recomputes the functional form from a ref it refreshes on render, so
 * both calls read the pre-click params and the second navigation discards the
 * first — the symptom is a filter that visibly does nothing. Use
 * useUrlStateBatch for any change that touches more than one key.
 */
export function useUrlState<T extends string = string>(
    key: string,
    // NoInfer keeps a fallback of '' from narrowing T to the literal type ''
    // and rejecting every real value. T comes from the explicit type argument
    // or from `allowed`; without either it stays `string`.
    fallback: NoInfer<T>,
    options: { replace?: boolean; allowed?: readonly T[] } = {},
): [T, (next: T) => void] {
    const { replace = true, allowed } = options;
    const [searchParams, setSearchParams] = useSearchParams();

    const raw = searchParams.get(key);
    const value = useMemo(() => {
        if (raw === null) return fallback;
        // A hand-edited or stale URL must not put the page into a state it
        // cannot render.
        if (allowed && !allowed.includes(raw as T)) return fallback;
        return raw as T;
    }, [raw, fallback, allowed]);

    const set = useCallback(
        (next: T) => {
            setSearchParams(
                (prev) => {
                    const params = new URLSearchParams(prev);
                    if (!next || next === fallback) params.delete(key);
                    else params.set(key, next);
                    return params;
                },
                { replace },
            );
        },
        [key, fallback, replace, setSearchParams],
    );

    return [value, set];
}

/**
 * Several URL-backed values written together.
 *
 * Changing a class has to clear its section in the same update — doing it as
 * two separate writes leaves a moment where the section belongs to the
 * previous class, and the query firing in between asks for a combination that
 * does not exist.
 */
export function useUrlStateBatch(): (
    patch: Record<string, string | null>,
    options?: { replace?: boolean },
) => void {
    const [, setSearchParams] = useSearchParams();

    return useCallback(
        (patch, { replace = true } = {}) => {
            setSearchParams(
                (prev) => {
                    const params = new URLSearchParams(prev);
                    Object.entries(patch).forEach(([k, v]) => {
                        if (v === null || v === '') params.delete(k);
                        else params.set(k, v);
                    });
                    return params;
                },
                { replace },
            );
        },
        [setSearchParams],
    );
}

export default useUrlState;
