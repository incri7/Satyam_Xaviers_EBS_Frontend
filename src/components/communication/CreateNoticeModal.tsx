import { NoticeDialog } from '../../features/notices/NoticeDialog';

interface CreateNoticeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
}

/** Figma H05 "Post notice", opened from the dashboard and the notices page. */
export function CreateNoticeModal({ isOpen, onClose, onCreated }: CreateNoticeModalProps) {
    if (!isOpen) return null;
    return <NoticeDialog mode="create" onClose={onClose} onSaved={() => { onCreated(); onClose(); }} />;
}
