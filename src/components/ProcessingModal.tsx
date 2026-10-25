type ProcessingModalProps = {
  message?: string
}

export function ProcessingModal({ message = 'Применяем активные типографические правила.' }: ProcessingModalProps) {
  return (
    <div className="modal-backdrop" role="status" aria-live="polite" aria-label="Выполняется обработка">
      <div className="processing-modal">
        <span className="spinner" aria-hidden="true" />
        <div>
          <h2>Подождите немного</h2>
          <p>{message}</p>
        </div>
      </div>
    </div>
  )
}
