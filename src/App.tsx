import { useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { EditorScreen } from './components/EditorScreen'
import { ExportModal, MessageModal, NoChangesModal, UploadModal } from './components/AppModals'
import { ProcessingModal } from './components/ProcessingModal'
import { ReviewScreen } from './components/ReviewScreen'
import { RulesScreen } from './components/RulesScreen'
import { exportTextFile, readSourceFile, type DocumentStructure, type ExportFormat, type SourceFormat } from './lib/files'
import {
  analyzeTypography,
  buildResultText,
  getActiveRuleIds,
  type TypographyChange,
  type TypographyLanguage,
  type TypographyMode,
} from './lib/typography'

type MessageState = { kind: 'error' | 'success'; title: string; message: string } | null
type CustomRules = Record<TypographyLanguage, string[]>

const SETTINGS_KEY = 'normal-text-settings-v1'

function defaultCustomRules(): CustomRules {
  return {
    ru: getActiveRuleIds('ru', 'full'),
    en: getActiveRuleIds('en', 'full'),
  }
}

function loadSettings(): { language: TypographyLanguage; mode: TypographyMode; custom: CustomRules } {
  const fallback = { language: 'ru' as const, mode: 'full' as const, custom: defaultCustomRules() }

  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return fallback

    const parsed = JSON.parse(raw) as Partial<{
      language: TypographyLanguage
      mode: TypographyMode
      custom: CustomRules
    }>

    return {
      language: parsed.language === 'en' ? 'en' : 'ru',
      mode: parsed.mode === 'basic' || parsed.mode === 'custom' ? parsed.mode : 'full',
      custom: {
        ru: Array.isArray(parsed.custom?.ru) ? parsed.custom.ru : fallback.custom.ru,
        en: Array.isArray(parsed.custom?.en) ? parsed.custom.en : fallback.custom.en,
      },
    }
  } catch {
    return fallback
  }
}

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const initial = useMemo(loadSettings, [])

  const [text, setText] = useState('')
  const [language, setLanguage] = useState<TypographyLanguage>(initial.language)
  const [mode, setMode] = useState<TypographyMode>(initial.mode)
  const [customRules, setCustomRules] = useState<CustomRules>(initial.custom)
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
  const [documentStructure, setDocumentStructure] = useState<DocumentStructure | null>(null)

  const activeRuleIds = useMemo(
    () => getActiveRuleIds(language, mode, customRules[language]),
    [language, mode, customRules],
  )
  const resultText = useMemo(() => buildResultText(text, changes), [text, changes])
  const isReviewRoute = location.pathname === '/review'

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ language, mode, custom: customRules }))
    } catch {
      // Настройки не должны блокировать приложение, если localStorage недоступен.
    }
  }, [language, mode, customRules])

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setStatusMessage('Текст скопирован.')
    } catch {
      setStatusMessage('Не удалось скопировать текст. Скопируйте его вручную.')
    }
  }

  const goToEditor = () => {
    navigate('/')
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
      setDocumentStructure(imported.structure)
      setError('')
      navigate('/')
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
    const value = isReviewRoute ? resultText : text
    const baseName = fileName ? fileName.replace(/\.(txt|docx)$/i, '') : 'normal-text-result'
    setExportOpen(false)

    try {
      await exportTextFile(value, baseName, format, {
        structure: documentStructure,
        sourceText: text,
        changes: isReviewRoute ? changes : [],
      })
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

  const startProcessing = () => {
    if (!text.trim()) {
      setError('Введите текст для проверки.')
      setMessage({
        kind: 'error',
        title: 'Нет текста для проверки',
        message: 'Введите текст вручную или загрузите файл TXT/DOCX.',
      })
      return
    }

    if (activeRuleIds.length === 0) {
      setMessage({
        kind: 'error',
        title: 'Нет активных правил',
        message: 'Включите хотя бы одно правило в настройках перед запуском проверки.',
      })
      return
    }

    setError('')
    setStatusMessage('')
    setProcessingText('Применяем активные типографические правила.')
    setIsProcessing(true)

    window.setTimeout(() => {
      try {
        const found = analyzeTypography(text, language, mode, customRules[language])
        setChanges(found)
        setSelectedChangeId(null)

        if (found.length) {
          navigate('/review')
        } else {
          navigate('/')
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
  }

  const editorElement = (
    <EditorScreen
      text={text}
      language={language}
      mode={mode}
      activeRuleCount={activeRuleIds.length}
      error={error}
      isProcessing={isProcessing}
      fileName={fileName}
      sourceFormat={sourceFormat}
      onTextChange={(value) => {
        setText(value)
        setDocumentStructure(null)
        if (error) setError('')
      }}
      onLanguageChange={setLanguage}
      onModeChange={setMode}
      onOpenUpload={() => setUploadOpen(true)}
      onOpenRules={() => navigate('/rules')}
      onSubmit={(event) => {
        event.preventDefault()
        startProcessing()
      }}
    />
  )

  const rulesElement = (
    <RulesScreen
      language={language}
      mode={mode}
      customRuleIds={customRules[language]}
      onBack={goToEditor}
      onSave={(nextMode, ids) => {
        setMode(nextMode)
        setCustomRules((current) => ({ ...current, [language]: ids }))
        navigate('/')
        setMessage({
          kind: 'success',
          title: 'Настройки сохранены',
          message: `Активно правил: ${getActiveRuleIds(language, nextMode, ids).length}.`,
        })
      }}
    />
  )

  const reviewElement = text.trim() && changes.length ? (
    <ReviewScreen
      source={text}
      changes={changes}
      selectedChangeId={selectedChangeId}
      statusMessage={statusMessage}
      onBack={goToEditor}
      onSelectChange={(id) => setSelectedChangeId((current) => current === id ? null : id)}
      onDecision={(id, decision) => {
        setStatusMessage('')
        setChanges((current) =>
          current.map((change) => change.id === id ? { ...change, decision } : change),
        )
      }}
      onApplyAll={() => {
        setChanges((current) => current.map((change) => ({ ...change, decision: 'accepted' })))
        setStatusMessage('Все изменения приняты.')
      }}
      onRejectAll={() => {
        setChanges((current) => current.map((change) => ({ ...change, decision: 'rejected' })))
        setStatusMessage('Все изменения отклонены.')
      }}
      onCopy={() => void copyText(resultText)}
      onExport={() => setExportOpen(true)}
    />
  ) : (
    <Navigate to="/" replace />
  )

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="site-header__inner">
          <button className="brand-button" type="button" onClick={goToEditor} aria-label="Вернуться на главную">
            Нормальный Текст
          </button>
        </div>
      </header>

      <Routes>
        <Route path="/" element={editorElement} />
        <Route path="/rules" element={rulesElement} />
        <Route path="/review" element={reviewElement} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {uploadOpen && (
        <UploadModal
          onClose={() => setUploadOpen(false)}
          onFileSelected={(file) => void handleImport(file)}
        />
      )}
      {exportOpen && (
        <ExportModal
          onClose={() => setExportOpen(false)}
          onExport={(format) => void handleExport(format)}
        />
      )}
      {noChangesOpen && (
        <NoChangesModal
          statusMessage={statusMessage}
          onClose={() => setNoChangesOpen(false)}
          onCopy={() => void copyText(text)}
          onExport={() => {
            setNoChangesOpen(false)
            setExportOpen(true)
          }}
        />
      )}
      {message && <MessageModal {...message} onClose={() => setMessage(null)} />}
      {isProcessing && <ProcessingModal message={processingText} />}
    </div>
  )
}
