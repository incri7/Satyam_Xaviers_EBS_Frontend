import { useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/**
 * Animate a number from its previous value to `target` (Figma B01 motion:
 * "KPI count-up 1.2s ease-out"). Gives the target straight away for people
 * who ask for reduced motion, and undefined while `target` is undefined.
 */
export function useCountUp(target: number | undefined, duration = 1200): number | undefined {
    const [value, setValue] = useState<number | undefined>(undefined);
    const from = useRef(0);
    const animate = duration > 0 && !prefersReducedMotion();

    useEffect(() => {
        if (target === undefined || !animate) return;
        const start = performance.now();
        const origin = from.current;
        let frame = 0;
        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            setValue(origin + (target - origin) * eased);
            if (t < 1) frame = requestAnimationFrame(tick);
            else from.current = target;
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [target, duration, animate]);

    if (target === undefined) return undefined;
    return animate ? (value ?? 0) : target;
}
