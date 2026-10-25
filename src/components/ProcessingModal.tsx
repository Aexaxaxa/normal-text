export function ProcessingModal() {
  return (
    <div className="modal-backdrop" role="status" aria-live="polite" aria-label="Текст обрабатывается">
      <div className="processing-modal">
        <span className="spinner" aria-hidden="true" />
        <div>
          <h2>Проверяем текст</h2>
          <p>Применяем активные типографические правила.</p>
        </div>
      </div>
    </div>
  )
}
