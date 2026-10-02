import { cn } from '../../utils/cn';

/** The field box (border, focus ring, error), for controls built outside these components. */
export const fieldBox = (error?: string, disabled?: boolean) =>
    cn(
        'rounded-field border-[1.5px] bg-surface font-ui text-base font-medium text-ink outline-none md:text-sm',
        'transition-[border-color,box-shadow] duration-150 ease-sx',
        disabled
            ? 'border-line-subtle bg-sunken text-muted'
            : error
              ? 'border-bad shadow-[0_0_0_4px_rgb(216_53_42/0.14)]'
              : 'border-line focus:border-sx-blue-500 focus:shadow-[0_0_0_4px_rgb(44_107_192/0.18)]',
    );
