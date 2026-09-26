import React, { useRef } from 'react';
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

export const ConfirmDialog: React.FC<{
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
