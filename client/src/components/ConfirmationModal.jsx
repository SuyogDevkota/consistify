import Modal from './Modal';

export default function ConfirmationModal({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  busy = false,
}) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="modal-heading">
        <span className="eyebrow">PLEASE CONFIRM</span>
        <h2>{title}</h2>
        {message ? <p>{message}</p> : null}
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>
          {cancelLabel}
        </button>
        <button type="button" className="btn btn-primary" onClick={onConfirm} disabled={busy}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
