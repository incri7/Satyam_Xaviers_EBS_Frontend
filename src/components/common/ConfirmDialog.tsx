import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

import { cn } from '../../utils/cn';

export interface ConfirmRequest {
    /** What is about to happen, as a question. */
    title: string;
    /** Which record, and what follows from it. */
    body?: string;
    /** The verb, repeated from the button that opened this. */
    confirmLabel?: string;
    cancelLabel?: string;
    /** 'danger' for anything that destroys or removes. */
    tone?: 'danger' | 'neutral';
    onConfirm: () => void;
}

/**
 * Replaces window.confirm.
 *
 * The native dialog renders browser chrome — "localhost:8080 says" — and most
 * call sites passed it the word "Confirm?", which names neither the record nor
 * the consequence. This asks a real question, says which record it affects,
 * and labels the button with the verb rather than "OK".
 *
 * Returns the dialog to render and the function that opens it, so a call site
 * needs no provider:
 *
 *   const [confirmUI, confirm] = useConfirmDialog();
 *   ...
 *   {confirmUI}
 *   onClick={() => confirm({ title: '…', onConfirm: () => mutate(id) })}
 */
export function useConfirmDialog() {
    const [request, setRequest] = useState<ConfirmRequest | null>(null);
    const confirm = useCallback((req: ConfirmRequest) => setRequest(req), []);
    const close = useCallback(() => setRequest(null), []);

    const ui = (
        <ConfirmDialog
            request={request}
            onClose={close}
            onConfirm={() => {
                request?.onConfirm();
                close();
            }}
        />
    );

    return [ui, confirm] as const;
}

const ConfirmDialog: React.FC<{
    request: ConfirmRequest | null;
    onClose: () => void;
    onConfirm: () => void;
}> = ({ request, onClose, onConfirm }) => {
    const { t } = useTranslation();
    const cancelRef = useRef<HTMLButtonElement>(null);
    const confirmRef = useRef<HTMLButtonElement>(null);
    const danger = request?.tone !== 'neutral';

    useEffect(() => {
        if (!request) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        // Destructive actions start focused on Cancel, so a reflexive Enter
        // does not delete anything.
        (danger ? cancelRef : confirmRef).current?.focus();
        return () => document.removeEventListener('keydown', onKey);
    }, [request, danger, onClose]);

    return (
        <AnimatePresence>
            {request && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) onClose();
                    }}
                >
                    <motion.div
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="confirm-title"
                        aria-describedby={request.body ? 'confirm-body' : undefined}
                        initial={{ opacity: 0, scale: 0.97, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97, y: 8 }}
                        transition={{ duration: 0.14 }}
                        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
                    >
                        <div className="p-6 flex gap-4">
                            <div
                                className={cn(
                                    'w-11 h-11 rounded-2xl flex items-center justify-center shrink-0',
                                    danger ? 'bg-red-50 text-red-600' : 'bg-brand/10 text-brand',
                                )}
                            >
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h2 id="confirm-title" className="text-lg font-bold text-slate-900">
                                    {request.title}
                                </h2>
                                {request.body && (
                                    <p id="confirm-body" className="mt-1.5 text-sm text-slate-500 leading-relaxed">
                                        {request.body}
                                    </p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label={t('common.close')}
                                className="p-1.5 h-fit text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                            <button
                                ref={cancelRef}
                                type="button"
                                onClick={onClose}
                                className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                            >
                                {request.cancelLabel || t('common.cancel')}
                            </button>
                            <button
                                ref={confirmRef}
                                type="button"
                                onClick={onConfirm}
                                className={cn(
                                    'px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-colors',
                                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                                    danger
                                        ? 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500'
                                        : 'bg-brand hover:bg-brand-dark focus-visible:ring-brand',
                                )}
                            >
                                {request.confirmLabel || t('common.confirm')}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ConfirmDialog;
