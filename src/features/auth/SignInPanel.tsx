import { Lock, LogOut, Shield, ShieldAlert, Smartphone, Users, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * What the sign-in page shows before anyone is signed in (Figma A01).
 * Nothing here comes from the school's data: a signed-out visitor sees
 * account-safety advice and who the app is for, never figures about students.
 */

/** Laptop: glass card at the foot of the brand panel. */
export function AccountSafetyCard() {
    const { t } = useTranslation();
    const tips: [LucideIcon, string][] = [
        [Lock, t('auth.safety.neverAsk')],
        [LogOut, t('auth.safety.sharedComputer')],
        [Smartphone, t('auth.safety.homeScreen')],
    ];
    return (
        <section
            aria-labelledby="account-safety-title"
            className="flex flex-col gap-3 rounded-[18px] bg-white/10 px-[18px] py-4 ring-1 ring-inset ring-white/18"
        >
            <div className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-white/14" aria-hidden>
                    <Shield size={18} className="text-white" />
                </span>
                <h2 id="account-safety-title" className="type-body-semibold text-white">
                    {t('auth.safety.title')}
                </h2>
            </div>
            <ul className="flex flex-col gap-2.5">
                {tips.map(([Icon, text]) => (
                    <li key={text} className="flex items-start gap-2.5 type-small text-white/86">
                        <Icon size={16} className="mt-px shrink-0 text-white/80" aria-hidden />
                        {text}
                    </li>
                ))}
            </ul>
        </section>
    );
}

/** Laptop, set-password page (Figma A03): the one rule worth repeating there. */
export function PasswordSafetyNote() {
    const { t } = useTranslation();
    return (
        <aside className="flex items-center gap-3.5 rounded-[18px] bg-white/10 px-[18px] py-4 ring-1 ring-inset ring-white/18">
            <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-white/14" aria-hidden>
                <ShieldAlert size={20} className="text-white" />
            </span>
            <div className="flex min-w-0 flex-col gap-1">
                <p className="type-body-semibold text-white">{t('auth.setPassword.note.title')}</p>
                <p className="type-small text-white/78">{t('auth.setPassword.note.body')}</p>
            </div>
        </aside>
    );
}

/** Phone and tablet: who the app is for. */
export function AudienceChip() {
    const { t } = useTranslation();
    return (
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 ring-1 ring-inset ring-white/20 type-caption-semibold text-white md:px-3.5 md:py-2 md:type-small-semibold">
            <Users size={14} aria-hidden />
            {t('auth.audience')}
        </span>
    );
}
