import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';

import { SchoolCrest } from '../../design-system';
import { LanguageSwitch } from '../../components/LanguageSwitch';
import { useDateFormat } from '../../hooks/useDateFormat';
import { currentAcademicYearBS } from '../../utils/academicYear';
import { toNepaliDigits } from '../../utils/nepaliDate';

/**
 * Frame for the signed-out screens (sign in, forgot password, set password,
 * parent registration). Figma: section "A  Sign in and account".
 *
 * - Phone: navy brand band on top (crest, name, purpose, chip), form below
 *   on white, help line right after the form.
 * - Tablet (md): everything on the navy gradient; the form in a white card,
 *   the chip under the card, the help line at the foot.
 * - Laptop (lg): split. 600px brand panel on the left, form centred on white.
 *
 * The form is rendered once; only its container changes per breakpoint, so
 * nothing is duplicated in the DOM or in the tab order.
 */
export interface AuthLayoutProps {
    children: ReactNode;
    /** Card at the foot of the laptop brand panel. */
    panelFooter?: ReactNode;
    /** Pill in the phone band and under the tablet card. */
    chip?: ReactNode;
    /** Line under the school name. Defaults to what the app is for. */
    purpose?: string;
    /**
     * Phone: a slim band (crest and name on one row, no purpose or chip), for
     * screens whose form is long enough to need the room (Figma A03).
     */
    compactBand?: boolean;
}

export function AuthLayout({ children, panelFooter, chip, purpose: purposeProp, compactBand = false }: AuthLayoutProps) {
    const { t } = useTranslation();
    const df = useDateFormat();
    const yearBS = currentAcademicYearBS();
    const year = df.lang === 'ne' ? toNepaliDigits(yearBS) : yearBS;
    const schoolName = t('app.school');
    const purpose = purposeProp ?? t('auth.brand.purpose');

    return (
        <div className="relative flex min-h-dvh flex-col bg-surface font-ui text-ink md:bg-hero lg:flex-row lg:bg-none lg:bg-surface">
            {/* Laptop brand panel */}
            <aside className="relative hidden shrink-0 flex-col justify-between overflow-hidden bg-hero px-14 pt-12 pb-11 text-white lg:flex lg:w-[42%] lg:max-w-[600px]">
                <Aurora />
                <div className="relative flex flex-col gap-[22px]">
                    <SchoolCrest size={72} ring />
                    <p className="type-display-xl">{schoolName}</p>
                    <p className="type-body-l text-white/86">{purpose}</p>
                </div>
                <div className="relative flex flex-col gap-[22px]">
                    {panelFooter}
                    <div className="flex justify-between gap-4 type-caption text-white/62">
                        <span>{t('auth.brand.academicYear', { year })}</span>
                        <span>{df.date(new Date(), 'long')}</span>
                    </div>
                </div>
            </aside>

            {/* Phone brand band */}
            {compactBand ? (
                <header className="relative overflow-hidden rounded-b-panel bg-hero px-5 pt-[max(env(safe-area-inset-top),16px)] pb-[18px] text-white md:hidden">
                    <Aurora />
                    <div className="relative flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                            <SchoolCrest size={40} ring />
                            <p className="type-small-semibold">{schoolName}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <WebsiteLink tone="light" compact />
                            <LanguageSwitch className="shrink-0" />
                        </div>
                    </div>
                </header>
            ) : (
                <header className="relative overflow-hidden rounded-b-panel bg-hero px-5 pt-[max(env(safe-area-inset-top),20px)] pb-[22px] text-white md:hidden">
                    <Aurora />
                    <div className="relative flex flex-col gap-3.5">
                        <div className="flex items-center justify-between gap-3">
                            <SchoolCrest size={52} ring />
                            <div className="flex items-center gap-2">
                                <WebsiteLink tone="light" />
                                <LanguageSwitch />
                            </div>
                        </div>
                        <p className="type-h2">{schoolName}</p>
                        <p className="type-small text-white/84">{purpose}</p>
                        {chip}
                    </div>
                </header>
            )}

            {/* Tablet top bar and purpose line */}
            <header className="relative hidden items-center justify-between gap-4 px-16 pt-9 text-white md:flex lg:hidden">
                <div className="flex items-center gap-3">
                    <SchoolCrest size={48} ring />
                    <p className="type-h3">{schoolName}</p>
                </div>
                <div className="flex items-center gap-3">
                    <WebsiteLink tone="light" />
                    <LanguageSwitch />
                </div>
            </header>
            <p className="mx-auto mt-7 hidden max-w-[640px] px-6 text-center type-body-l text-white/86 md:block lg:hidden">
                {purpose}
            </p>

            <main className="relative flex flex-col md:flex-1 lg:px-10 lg:pt-7 lg:pb-9">
                <div className="hidden items-center justify-between lg:flex">
                    <WebsiteLink tone="dark" />
                    <LanguageSwitch />
                </div>
                <div className="flex flex-col md:flex-1 md:items-center md:pt-7 lg:justify-center lg:pt-0">
                    <div className="w-full animate-rise px-5 pt-6 md:w-[520px] md:rounded-panel md:bg-surface md:px-10 md:py-9 md:shadow-e3 lg:max-w-[400px] lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none">
                        {children}
                    </div>
                    {chip && <div className="mt-7 hidden md:flex lg:hidden">{chip}</div>}
                </div>
                <p className="px-5 py-6 text-center type-small text-muted md:text-white/80 lg:pb-0 lg:text-muted">
                    {t('auth.help.prefix')}{' '}
                    <a
                        href="mailto:support@sxebs.edu.np"
                        className="rounded-sm type-small-semibold text-primary-text outline-none hover:underline focus-visible:ring-3 focus-visible:ring-focus/60 md:text-white lg:text-primary-text"
                    >
                        {t('auth.help.link')}
                    </a>
                </p>
            </main>
        </div>
    );
}

/**
 * Back to the school's public website, which shares the domain at "/". A plain link, not the
 * router: the website is a separate page, served by nginx.
 */
function WebsiteLink({ tone, compact = false }: { tone: 'light' | 'dark'; compact?: boolean }) {
    const { t } = useTranslation();
    const colour = tone === 'light'
        ? 'text-white/90 hover:text-white focus-visible:ring-white/60'
        : 'text-primary-text hover:underline focus-visible:ring-focus/60';
    return (
        <a
            href="/"
            aria-label={compact ? t('auth.website') : undefined}
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-sm type-small-semibold outline-none focus-visible:ring-3 ${colour}`}
        >
            <ArrowLeft aria-hidden className="size-4" />
            {compact ? null : <span>{t('auth.website')}</span>}
        </a>
    );
}

/** Slow drifting light behind the brand surfaces. Paused by reduced-motion. */
function Aurora() {
    return (
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-1/4 -right-1/4 size-[80%] rounded-full bg-sx-blue-500/45 blur-3xl animate-drift-a" />
            <div className="absolute -bottom-1/3 -left-1/4 size-[70%] rounded-full bg-sx-blue-300/20 blur-3xl animate-drift-b" />
        </div>
    );
}
