import { useMemo, useState } from 'react'
import { EditorScreen, type Language, type ProcessingMode } from './components/EditorScreen'
import { NoChangesScreen } from './components/NoChangesScreen'
import { ProcessingModal } from './components/ProcessingModal'
import { ReviewScreen } from './components/ReviewScreen'
import { analyzeTypography, buildResultText, type TypographyChange } from './lib/typography'

type Screen = 'editor' | 'review' | 'no-changes'

export default function App() {
  const [screen, setScreen] = useState<Screen>('editor')
  const [text, setText] = useState('')
  const [language, setLanguage] = useState<Language>('ru')
  const [mode, setMode] = useState<ProcessingMode>('full')
  const [error, setError] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [changes, setChanges] = useState<TypographyChange[]>([])
  const [selectedChangeId, setSelectedChangeId] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState('')

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
          onTextChange={(value) => {
            setText(value)
            if (error) setError('')
          }}
          onLanguageChange={setLanguage}
          onModeChange={setMode}
          onSubmit={(event) => {
            event.preventDefault()
            if (!text.trim()) {
              setError('Введите текст для проверки.')
              return
            }

            setError('')
            setStatusMessage('')
            setIsProcessing(true)
            window.setTimeout(() => {
              const found = analyzeTypography(text, language, mode)
              setChanges(found)
              setSelectedChangeId(null)
              setIsProcessing(false)
              setScreen(found.length ? 'review' : 'no-changes')
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
        />
      )}

      {screen === 'no-changes' && (
        <NoChangesScreen
          copyStatus={statusMessage}
          onBack={goToEditor}
          onCopy={() => void copyText(text)}
        />
      )}

      {isProcessing && <ProcessingModal />}
    </div>
  )
}
