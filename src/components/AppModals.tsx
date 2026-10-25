import { useRef } from 'react'
import type { ExportFormat } from '../lib/files'

type ModalBaseProps = {
  onClose: () => void
}

export function UploadModal({ onClose, onFileSelected }: ModalBaseProps & { onFileSelected: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="upload-title">
      <section className="app-modal upload-modal">
        <button className="modal-close" type="button" onClick={onClose} aria-label="Закрыть">×</button>
        <p className="modal-kicker">Импорт</p>
        <h2 id="upload-title">Загрузить документ</h2>
        <p className="modal-description">Поддерживаются файлы TXT и DOCX размером до 10 МБ.</p>

        <button className="upload-dropzone" type="button" onClick={() => inputRef.current?.click()}>
          <strong>Выбрать файл</strong>
          <span>TXT или DOCX</span>
        </button>
        <input
          ref={inputRef}
          className="visually-hidden"
          type="file"
          accept=".txt,.docx,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) onFileSelected(file)
          }}
        />

        <div className="modal-actions">
          <button className="button button--secondary" type="button" onClick={onClose}>Отмена</button>
        </div>
      </section>
    </div>
  )
}

export function ExportModal({ onClose, onExport }: ModalBaseProps & { onExport: (format: ExportFormat) => void }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="export-title">
      <section className="app-modal export-modal">
        <button className="modal-close" type="button" onClick={onClose} aria-label="Закрыть">×</button>
        <p className="modal-kicker">Экспорт</p>
        <h2 id="export-title">Сохранить результат</h2>
        <p className="modal-description">Выберите формат итогового файла.</p>
        <div className="export-options">
          <button className="export-option" type="button" onClick={() => onExport('txt')}>
            <strong>TXT</strong>
            <span>Простой текст без форматирования</span>
          </button>
          <button className="export-option" type="button" onClick={() => onExport('docx')}>
            <strong>DOCX</strong>
            <span>Документ Word с сохранением абзацев</span>
          </button>
        </div>
      </section>
    </div>
  )
}

export function NoChangesModal({
  onClose,
  onCopy,
  onExport,
  statusMessage,
}: ModalBaseProps & { onCopy: () => void; onExport: () => void; statusMessage: string }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="no-changes-title">
      <section className="app-modal no-changes-modal">
        <button className="modal-close" type="button" onClick={onClose} aria-label="Закрыть">×</button>
        <div className="success-icon" aria-hidden="true">✓</div>
        <div className="no-changes-copy">
          <h2 id="no-changes-title">Изменений не найдено</h2>
          <p>Текст уже соответствует выбранным типографическим правилам.</p>
        </div>
        <div className="no-changes-actions">
          <button className="button button--primary" type="button" onClick={onCopy}>Копировать текст</button>
          <button className="button button--secondary" type="button" onClick={onExport}>Экспортировать</button>
          <button className="button button--secondary" type="button" onClick={onClose}>Вернуться к тексту</button>
        </div>
        <p className="modal-status" aria-live="polite">{statusMessage}</p>
      </section>
    </div>
  )
}

export function MessageModal({
  kind,
  title,
  message,
  onClose,
}: ModalBaseProps & { kind: 'error' | 'success'; title: string; message: string }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="message-title">
      <section className="app-modal message-modal">
        <button className="modal-close" type="button" onClick={onClose} aria-label="Закрыть">×</button>
        <div className={`message-icon message-icon--${kind}`} aria-hidden="true">{kind === 'success' ? '✓' : '!'}</div>
        <div>
          <h2 id="message-title">{title}</h2>
          <p>{message}</p>
        </div>
        <div className="modal-actions">
          <button className="button button--primary" type="button" onClick={onClose}>Понятно</button>
        </div>
      </section>
    </div>
  )
}
