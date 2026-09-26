import logo from '../../assets/logo.png';
import { cn } from '../../utils/cn';

/**
 * The school crest in a white disc. Mirrors Figma "School crest".
 * `ring` adds the soft halo used on the navy surfaces.
 */
export interface SchoolCrestProps {
    size?: number;
    ring?: boolean;
    className?: string;
    /** Leave empty where the school name is already written next to the crest. */
    alt?: string;
}

export function SchoolCrest({ size = 42, ring = false, className, alt = '' }: SchoolCrestProps) {
    return (
        <span
            className={cn(
                'inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-white',
                ring && 'ring-3 ring-white/24',
                className,
            )}
            style={{ width: size, height: size }}
        >
            <img src={logo} alt={alt} width={size} height={size} className="size-full object-contain" />
        </span>
    );
}
