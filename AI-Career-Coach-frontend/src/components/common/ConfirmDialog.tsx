import { AlertTriangle } from 'lucide-react';
import Button from './Button';
import Modal from './Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  isLoading?: boolean;
}

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Delete', isLoading = false }: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center">
          <AlertTriangle size={22} className="text-red-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-100 mb-1">{title}</h3>
          <p className="text-sm text-gray-400">{message}</p>
        </div>
        <div className="flex gap-3 w-full">
          <Button variant="outline" fullWidth onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button variant="danger" fullWidth onClick={onConfirm} isLoading={isLoading}>{confirmLabel}</Button>
        </div>
      </div>
    </Modal>
  );
}
