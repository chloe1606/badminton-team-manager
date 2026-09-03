import { Button } from './Button'

interface ConfirmDialogProps {
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  isConfirming?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  isConfirming = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
      <div className="modal-box">
        <h2 id="confirm-dialog-title">{title}</h2>
        <p>{description}</p>
        <div className="form-actions">
          <Button variant="danger" disabled={isConfirming} onClick={onConfirm}>
            {isConfirming ? 'Working…' : confirmLabel}
          </Button>
          <Button variant="secondary" disabled={isConfirming} onClick={onCancel}>
            {cancelLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
