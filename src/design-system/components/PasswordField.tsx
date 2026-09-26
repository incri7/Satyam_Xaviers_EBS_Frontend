import { useState, type KeyboardEvent } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

import { TextField, type TextFieldProps } from './TextField';

/**
 * TextField for passwords: a show/hide toggle, and a Caps Lock warning the
 * moment it is detected, which is the usual reason a correct password fails.
 *
 * Copy is passed in so the component stays free of any i18n dependency.
 */
export interface PasswordFieldProps extends Omit<TextFieldProps, 'type' | 'endAdornment'> {
    showLabel?: string;
    hideLabel?: string;
    capsLockMessage?: string;
}

export function PasswordField({
    showLabel = 'Show password',
    hideLabel = 'Hide password',
    capsLockMessage = 'Caps Lock is on',
    hint,
    error,
    onKeyUp,
    onKeyDown,
    leftIcon = Lock,
    ...rest
}: PasswordFieldProps) {
    const [visible, setVisible] = useState(false);
    const [capsLock, setCapsLock] = useState(false);

    const trackCaps = (e: KeyboardEvent<HTMLInputElement>) => {
        setCapsLock(e.getModifierState?.('CapsLock') ?? false);
    };

    return (
        <TextField
            {...rest}
            type={visible ? 'text' : 'password'}
            leftIcon={leftIcon}
            error={error}
            hint={capsLock && !error ? capsLockMessage : hint}
            onKeyDown={(e) => { trackCaps(e); onKeyDown?.(e); }}
            onKeyUp={(e) => { trackCaps(e); onKeyUp?.(e); }}
            endAdornment={
                <button
                    type="button"
                    onClick={() => setVisible((v) => !v)}
                    aria-label={visible ? hideLabel : showLabel}
                    aria-pressed={visible}
                    disabled={rest.disabled}
                    className="-mr-1 grid size-9 shrink-0 place-items-center rounded-full text-muted outline-none transition-colors hover:bg-sunken hover:text-ink-2 focus-visible:ring-3 focus-visible:ring-focus/60 disabled:pointer-events-none"
                >
                    {visible ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
                </button>
            }
        />
    );
}
