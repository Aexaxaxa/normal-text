import type { FormEvent } from 'react'

export type Language = 'ru' | 'en'
export type ProcessingMode = 'full' | 'basic'

type EditorScreenProps = {
  text: string
  language: Language
  mode: ProcessingMode
  error: string
  isProcessing: boolean
  onTextChange: (value: string) => void
  onLanguageChange: (value: Language) => void
  onModeChange: (value: ProcessingMode) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function EditorScreen({
  text,
  language,
  mode,
  error,
  isProcessing,
  onTextChange,
  onLanguageChange,
  onModeChange,
  onSubmit,
}: EditorScreenProps) {
  return (
    <main className="page editor-page">
      <section className="editor" aria-labelledby="editor-title">
        <div className="editor-layout">
          <div className="editor-main">
            <div className="editor-intro">
              <h1 id="editor-title">
                <span className="desktop-copy">Типографическая проверка текста</span>
                <span className="mobile-copy">Проверка текста</span>
              </h1>
              <p className="editor-description">
                <span className="desktop-copy">
                  Вставьте текст. Сервис найдёт типографические нарушения по активным правилам.
                </span>
                <span className="mobile-copy">Вставьте текст для типографической проверки.</span>
              </p>
            </div>

            <form id="editor-form" className="editor-form" onSubmit={onSubmit} noValidate>
              <section className={`editor-panel${error ? ' editor-panel--error' : ''}`} aria-labelledby="source-title">
                <label className="textarea-label" id="source-title" htmlFor="source-text">
                  Исходный текст
                </label>
                <textarea
                  id="source-text"
                  name="sourceText"
                  rows={16}
                  value={text}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'source-error' : undefined}
                  onChange={(event) => onTextChange(event.target.value)}
                  placeholder="Введите или вставьте текст"
                />
                {error && (
                  <p className="field-error" id="source-error" role="alert">
                    {error}
                  </p>
                )}
              </section>

              <div className="upload-row">
                <button className="file-button" type="button" disabled title="Импорт TXT/DOCX не входит в первую версию MVP">
                  Загрузить TXT/DOCX
                </button>
              </div>
            </form>
          </div>

          <aside className="settings-panel" aria-labelledby="settings-title">
            <h2 id="settings-title">Параметры</h2>

            <div className="settings-scroll">
              <div className="field-group field-group--language">
                <label htmlFor="language">Язык</label>
                <div className="select-wrap">
                  <select
                    id="language"
                    name="language"
                    value={language}
                    onChange={(event) => onLanguageChange(event.target.value as Language)}
                  >
                    <option value="ru">Русский</option>
                    <option value="en">English</option>
                  </select>
                  <span className="select-arrow" aria-hidden="true">∨</span>
                </div>
              </div>

              <div className="field-group field-group--mode">
                <label htmlFor="mode">
                  <span className="desktop-copy">Режим обработки</span>
                  <span className="mobile-copy">Режим</span>
                </label>
                <div className="select-wrap">
                  <select
                    id="mode"
                    name="mode"
                    value={mode}
                    onChange={(event) => onModeChange(event.target.value as ProcessingMode)}
                  >
                    <option value="full">Полный / ГОСТ</option>
                    <option value="basic">Базовый</option>
                  </select>
                  <span className="select-arrow" aria-hidden="true">∨</span>
                </div>
              </div>

              <p className="rules-count">Активно правил: {mode === 'full' ? 7 : 4}</p>
            </div>

            <div className="settings-actions">
              <button className="button button--secondary" type="button" disabled title="Тонкая настройка правил не входит в первую версию MVP">
                Настроить правила
              </button>
              <button className="button button--primary" type="submit" form="editor-form" disabled={isProcessing}>
                {isProcessing ? 'Обработка…' : 'Проверить текст'}
              </button>
            </div>
          </aside>
        </div>
      </section>
    </main>
  )
}
