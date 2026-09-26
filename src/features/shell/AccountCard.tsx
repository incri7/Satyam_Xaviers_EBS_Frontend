import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogOut, UserCircle } from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/useAuthStore';
import { cn } from '../../utils/cn';
import { initialsOf, useDisplayName } from './identity';
import { useAcademicYearLabel } from './useAcademicYear';

/**
 * Foot of the sidebar (Figma "Year and account"): who is signed in, their
 * role and the academic year. Opens the account menu (profile, sign out).
 */
export function AccountCard({ onNavigate }: { onNavigate?: () => void }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { logout } = useAuth();
    const user = useAuthStore((s) => s.user);
    const name = useDisplayName();
    const year = useAcademicYearLabel();
    const [open, setOpen] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);
    const menuId = useId();

    useEffect(() => {
        if (!open) return;
        const onPointer = (e: PointerEvent) => {
            if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('pointerdown', onPointer);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('pointerdown', onPointer);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    if (!user) return null;
    const role = t(`shell.roles.${user.role}`, { defaultValue: user.role });

    const go = (to: string) => { setOpen(false); onNavigate?.(); navigate(to); };

    return (
        <div ref={wrapRef} className="relative">
            {open && (
                <div
                    id={menuId}
                    role="menu"
                    aria-label={t('shell.account.menu')}
                    className="absolute inset-x-0 bottom-full mb-2 animate-rise rounded-row border border-line bg-surface p-1.5 text-ink shadow-e3"
                >
                    <MenuItem icon={UserCircle} onClick={() => go('/profile')}>{t('shell.account.profile')}</MenuItem>
                    <MenuItem icon={LogOut} tone="bad" onClick={() => { setOpen(false); logout(); }}>{t('shell.account.signOut')}</MenuItem>
                </div>
            )}
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={open ? menuId : undefined}
                className="flex w-full items-center gap-2.5 rounded-row bg-white/8 p-3 text-left ring-1 ring-inset ring-white/10 outline-none transition-colors hover:bg-white/12 focus-visible:ring-2 focus-visible:ring-white/60"
            >
                <span className="flex min-w-0 flex-1 flex-col gap-px">
                    <span className="truncate type-small-semibold text-white">{name}</span>
                    <span className="truncate type-caption text-white/66">{t('shell.account.roleYear', { role, year })}</span>
                </span>
                <Avatar name={name} src={user.profile_image_url} />
            </button>
        </div>
    );
}

export function Avatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
    // Old accounts carry the literal placeholder "string" from the API docs.
    if (src && src !== 'string') {
        return <img src={src} alt="" className={cn('size-[34px] shrink-0 rounded-full object-cover', className)} />;
    }
    return (
        <span aria-hidden className={cn('grid size-[34px] shrink-0 place-items-center rounded-full bg-white type-caption-semibold text-primary-text', className)}>
            {initialsOf(name)}
        </span>
    );
}

function MenuItem({
    icon: Icon,
    tone,
    onClick,
    children,
}: {
    icon: typeof LogOut;
    tone?: 'bad';
    onClick: () => void;
    children: string;
}) {
    return (
        <button
            type="button"
            role="menuitem"
            onClick={onClick}
            className={cn(
                'flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 type-small-medium outline-none transition-colors',
                'focus-visible:bg-sunken',
                tone === 'bad' ? 'text-bad hover:bg-bad-soft' : 'text-ink hover:bg-sunken',
            )}
        >
            <Icon size={16} aria-hidden />
            {children}
        </button>
    );
}
