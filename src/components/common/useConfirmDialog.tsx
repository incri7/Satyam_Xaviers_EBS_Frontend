import { useCallback, useState } from 'react';

import { ConfirmDialog, type ConfirmRequest } from './ConfirmDialog';

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
