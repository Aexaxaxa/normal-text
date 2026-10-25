import { useMemo, useState } from 'react'
import { EditorScreen, type Language, type ProcessingMode } from './components/EditorScreen'
import { ExportModal, MessageModal, NoChangesModal, UploadModal } from './components/AppModals'
import { ProcessingModal } from './components/ProcessingModal'
import { ReviewScreen } from './components/ReviewScreen'
import { exportTextFile, readSourceFile, type ExportFormat, type SourceFormat } from './lib/files'
import { analyzeTypography, buildResultText, type TypographyChange } from './lib/typography'

type Screen = 'editor' | 'review'
type MessageState = { kind: 'error' | 'success'; title: string; message: string } | null

export default function App() {
  const [screen, setScreen] = useState<Screen>('editor')
  const [text, setText] = useState('')
  const [language, setLanguage] = useState<Language>('ru')
  const [mode, setMode] = useState<ProcessingMode>('full')
  const [error, setError] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingText, setProcessingText] = useState('Применяем активные типографические правила.')
  const [changes, setChanges] = useState<TypographyChange[]>([])
  const [selectedChangeId, setSelectedChangeId] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [noChangesOpen, setNoChangesOpen] = useState(false)
  const [message, setMessage] = useState<MessageState>(null)
  const [fileName, setFileName] = useState('')
  const [sourceFormat, setSourceFormat] = useState<SourceFormat | null>(null)

  const resultText = useMemo(() => buildResultText(text, changes), [text, changes])

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setStatusMessage('Текст скопирован.')
    } catch {
      setStatusMessage('Не удалось скопировать текст. Скопируйте его вручную.')
    }
  }

  const goToEditor = () => {
    setScreen('editor')
    setSelectedChangeId(null)
    setStatusMessage('')
  }

  const handleImport = async (file: File) => {
    setUploadOpen(false)
    setProcessingText('Читаем файл и подготавливаем текст.')
    setIsProcessing(true)

    try {
      const imported = await readSourceFile(file)
      setText(imported.text)
      setFileName(imported.fileName)
      setSourceFormat(imported.format)
      setError('')
      setScreen('editor')
      setMessage({
        kind: 'success',
        title: 'Файл загружен',
        message: `Текст из «${imported.fileName}» готов к проверке.`,
      })
    } catch (cause) {
      setMessage({
        kind: 'error',
        title: 'Не удалось загрузить файл',
        message: cause instanceof Error ? cause.message : 'Проверьте формат файла и попробуйте ещё раз.',
      })
    } finally {
      setIsProcessing(false)
      setProcessingText('Применяем активные типографические правила.')
    }
  }

  const handleExport = async (format: ExportFormat) => {
    const value = screen === 'review' ? resultText : text
    const baseName = fileName ? fileName.replace(/\.(txt|docx)$/i, '') : 'normal-text-result'
    setExportOpen(false)

    try {
      await exportTextFile(value, baseName, format)
      setMessage({
        kind: 'success',
        title: 'Файл сохранён',
        message: `Результат экспортирован в формате ${format.toUpperCase()}.`,
      })
    } catch (cause) {
      setMessage({
        kind: 'error',
        title: 'Ошибка экспорта',
        message: cause instanceof Error ? cause.message : 'Не удалось сформировать файл.',
      })
    }
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="site-header__inner">
          <button className="brand-button" type="button" onClick={goToEditor} aria-label="Вернуться на главную">
            Нормальный Текст
          </button>
        </div>
      </header>

      {screen === 'editor' && (
        <EditorScreen
          text={text}
          language={language}
          mode={mode}
          error={error}
          isProcessing={isProcessing}
          fileName={fileName}
          sourceFormat={sourceFormat}
          onTextChange={(value) => {
            setText(value)
            if (error) setError('')
          }}
          onLanguageChange={setLanguage}
          onModeChange={setMode}
          onOpenUpload={() => setUploadOpen(true)}
          onSubmit={(event) => {
            event.preventDefault()
            if (!text.trim()) {
              setError('Введите текст для проверки.')
              return
            }

            setError('')
            setStatusMessage('')
            setProcessingText('Применяем активные типографические правила.')
            setIsProcessing(true)

            window.setTimeout(() => {
              try {
                const found = analyzeTypography(text, language, mode)
                setChanges(found)
                setSelectedChangeId(null)
                if (found.length) {
                  setScreen('review')
                } else {
                  setNoChangesOpen(true)
                }
              } catch {
                setMessage({
                  kind: 'error',
                  title: 'Ошибка обработки',
                  message: 'Не удалось выполнить проверку текста. Попробуйте ещё раз.',
                })
              } finally {
                setIsProcessing(false)
              }
            }, 350)
          }}
        />
      )}

      {screen === 'review' && (
        <ReviewScreen
          source={text}
          changes={changes}
          selectedChangeId={selectedChangeId}
          statusMessage={statusMessage}
          onBack={goToEditor}
          onSelectChange={(id) => setSelectedChangeId((current) => current === id ? null : id)}
          onDecision={(id, decision) => {
            setStatusMessage('')
            setChanges((current) => current.map((change) => change.id === id ? { ...change, decision } : change))
          }}
          onApplyAll={() => {
            setChanges((current) => current.map((change) => ({ ...change, decision: 'accepted' })))
            setStatusMessage('Все изменения приняты.')
          }}
          onCopy={() => void copyText(resultText)}
          onExport={() => setExportOpen(true)}
        />
      )}

      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} onFileSelected={(file) => void handleImport(file)} />}
      {exportOpen && <ExportModal onClose={() => setExportOpen(false)} onExport={(format) => void handleExport(format)} />}
      {noChangesOpen && (
        <NoChangesModal
          statusMessage={statusMessage}
          onClose={() => setNoChangesOpen(false)}
          onCopy={() => void copyText(text)}
          onExport={() => setExportOpen(true)}
        />
      )}
      {message && <MessageModal {...message} onClose={() => setMessage(null)} />}
      {isProcessing && <ProcessingModal message={processingText} />}
    </div>
  )
}
