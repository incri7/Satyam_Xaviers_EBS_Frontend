import React, { useCallback, useRef, useState } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button, Dialog } from '../../design-system';

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

    return (
        <Dialog
            open={request !== null}
            onClose={onClose}
            role="alertdialog"
            size="sm"
            icon={danger ? AlertTriangle : HelpCircle}
            iconTone={danger ? 'bad' : 'brand'}
            title={request?.title ?? ''}
            subtitle={request?.body}
            closeLabel={t('common.close')}
            // Destructive actions start on Cancel, so a reflexive Enter
            // does not delete anything.
            initialFocus={danger ? cancelRef : confirmRef}
            footer={
                <>
                    <Button ref={cancelRef} variant="quiet" onClick={onClose}>
                        {request?.cancelLabel || t('common.cancel')}
                    </Button>
                    <Button ref={confirmRef} variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
                        {request?.confirmLabel || t('common.confirm')}
                    </Button>
                </>
            }
        />
    );
};

export default ConfirmDialog;
