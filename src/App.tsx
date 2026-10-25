import { useState } from 'react'
import { EditorScreen, type Language, type ProcessingMode } from './components/EditorScreen'

export default function App() {
  const [text, setText] = useState('')
  const [language, setLanguage] = useState<Language>('ru')
  const [mode, setMode] = useState<ProcessingMode>('full')
  const [error, setError] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="site-header__inner">
          <p className="project-name">Нормальный Текст</p>
        </div>
      </header>

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
          setIsProcessing(true)
          window.setTimeout(() => setIsProcessing(false), 300)
        }}
      />
    </div>
  )
}
