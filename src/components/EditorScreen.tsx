import { IconCheck, IconChevronDown, IconSettings, IconUpload } from '@tabler/icons-react'
import type { FormEvent } from 'react'
import type { SourceFormat } from '../lib/files'
import type { TypographyLanguage, TypographyMode } from '../lib/typography'

type EditorScreenProps = {
  text: string
  language: TypographyLanguage
  mode: TypographyMode
  activeRuleCount: number
  error: string
  isProcessing: boolean
  fileName: string
  sourceFormat: SourceFormat | null
  onTextChange: (value: string) => void
  onLanguageChange: (value: TypographyLanguage) => void
  onModeChange: (value: TypographyMode) => void
  onOpenUpload: () => void
  onOpenRules: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function EditorScreen({
  text,
  language,
  mode,
  activeRuleCount,
  error,
  isProcessing,
  fileName,
  sourceFormat,
  onTextChange,
  onLanguageChange,
  onModeChange,
  onOpenUpload,
  onOpenRules,
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
                  Вставьте текст или загрузите TXT/DOCX. Сервис найдёт типографические нарушения по активным правилам.
                </span>
                <span className="mobile-copy">Вставьте текст или загрузите документ.</span>
              </p>
            </div>

            <form id="editor-form" className="editor-form" onSubmit={onSubmit} noValidate>
              <section className={`editor-panel${error ? ' editor-panel--error' : ''}`} aria-labelledby="source-title">
                <label className="textarea-label" id="source-title" htmlFor="source-text">Исходный текст</label>
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
                {error && <p className="field-error" id="source-error" role="alert">{error}</p>}
              </section>

              <div className="upload-row">
                <button className="file-button" type="button" onClick={onOpenUpload}>
                  <IconUpload size={17} stroke={1.8} aria-hidden="true" />Загрузить TXT/DOCX
                </button>
                {fileName && <span className="file-meta" title={fileName}>{fileName} · {sourceFormat?.toUpperCase()}</span>}
              </div>
            </form>
          </div>

          <aside className="settings-panel" aria-labelledby="settings-title">
            <h2 id="settings-title">Параметры</h2>
            <div className="settings-scroll">
              <div className="field-group field-group--language">
                <label htmlFor="language">Язык</label>
                <div className="select-wrap">
                  <select id="language" value={language} onChange={(event) => onLanguageChange(event.target.value as TypographyLanguage)}>
                    <option value="ru">Русский</option>
                    <option value="en">English</option>
                  </select>
                  <IconChevronDown className="select-arrow" size={16} stroke={1.9} aria-hidden="true" />
                </div>
              </div>

              <div className="field-group field-group--mode">
                <label htmlFor="mode"><span className="desktop-copy">Режим обработки</span><span className="mobile-copy">Режим</span></label>
                <div className="select-wrap">
                  <select id="mode" value={mode} onChange={(event) => onModeChange(event.target.value as TypographyMode)}>
                    <option value="full">Полный</option>
                    <option value="basic">Базовый</option>
                    <option value="custom">Пользовательский</option>
                  </select>
                  <IconChevronDown className="select-arrow" size={16} stroke={1.9} aria-hidden="true" />
                </div>
              </div>

              <p className="rules-count">Активно правил: {activeRuleCount}</p>
            </div>

            <div className="settings-actions">
              <button className="button button--secondary" type="button" onClick={onOpenRules}>
                <IconSettings size={17} stroke={1.8} aria-hidden="true" />Настроить правила
              </button>
              <button className="button button--primary" type="submit" form="editor-form" disabled={isProcessing}>
                <IconCheck size={17} stroke={1.9} aria-hidden="true" />
                {isProcessing ? 'Обработка…' : 'Проверить текст'}
              </button>
            </div>
          </aside>
        </div>
      </section>
    </main>
  )
}
