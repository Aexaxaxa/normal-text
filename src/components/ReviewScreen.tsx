import { useState, type ReactNode } from 'react'
import type { TypographyChange } from '../lib/typography'

type ReviewScreenProps = {
  source: string
  changes: TypographyChange[]
  selectedChangeId: string | null
  statusMessage: string
  onDecision: (id: string, decision: 'accepted' | 'rejected') => void
  onApplyAll: () => void
  onSelectChange: (id: string) => void
  onCopy: () => void
  onBack: () => void
}

function ResultText({ source, changes, selectedChangeId }: Pick<ReviewScreenProps, 'source' | 'changes' | 'selectedChangeId'>) {
  const sorted = [...changes].sort((a, b) => a.start - b.start)
  const parts: ReactNode[] = []
  let cursor = 0

  sorted.forEach((change) => {
    if (change.start > cursor) parts.push(source.slice(cursor, change.start))
    const value = change.decision === 'rejected' ? source.slice(change.start, change.end) : change.after
    if (selectedChangeId === change.id) {
      parts.push(<mark key={change.id} className="result-highlight">{value}</mark>)
    } else {
      parts.push(value)
    }
    cursor = change.end
  })

  parts.push(source.slice(cursor))
  return <>{parts}</>
}

export function ReviewScreen({
  source,
  changes,
  selectedChangeId,
  statusMessage,
  onDecision,
  onApplyAll,
  onSelectChange,
  onCopy,
  onBack,
}: ReviewScreenProps) {
  const [compareMode, setCompareMode] = useState(false)
  const accepted = changes.filter((change) => change.decision === 'accepted').length
  const rejected = changes.filter((change) => change.decision === 'rejected').length

  return (
    <main className="page review-page">
      <div className="review-layout">
        <section className="review-result" aria-labelledby="result-title">
          <div className="review-heading-row">
            <h1 className="review-heading" id="result-title">Результат</h1>
            <button className="back-button" type="button" onClick={onBack}>
              <span aria-hidden="true">←</span>
              Вернуться к редактированию
            </button>
          </div>

          <div className="stats-toolbar">
            <div className="stats-row" aria-label="Статистика изменений">
              <div className="stat-chip"><span>Найдено</span><strong>{changes.length}</strong></div>
              <div className="stat-chip"><span>Принято</span><strong>{accepted}</strong></div>
              <div className="stat-chip"><span>Отклонено</span><strong>{rejected}</strong></div>
            </div>
            <button
              className={`compare-button${compareMode ? ' compare-button--active' : ''}`}
              type="button"
              aria-pressed={compareMode}
              onClick={() => setCompareMode((value) => !value)}
            >
              {compareMode ? 'Один результат' : 'Сравнить тексты'}
            </button>
          </div>

          <section className={`result-card${compareMode ? ' result-card--compare' : ''}`} aria-labelledby="processed-text-title">
            {compareMode ? (
              <div className="comparison-grid">
                <div className="comparison-pane">
                  <h2>Исходный текст</h2>
                  <p className="result-text">{source}</p>
                </div>
                <div className="comparison-pane comparison-pane--result">
                  <h2 id="processed-text-title">Результат</h2>
                  <p className="result-text">
                    <ResultText source={source} changes={changes} selectedChangeId={selectedChangeId} />
                  </p>
                </div>
              </div>
            ) : (
              <>
                <h2 id="processed-text-title">Обработанный текст</h2>
                <p className="result-text">
                  <ResultText source={source} changes={changes} selectedChangeId={selectedChangeId} />
                </p>
              </>
            )}
          </section>
        </section>

        <section className="changes-panel" aria-labelledby="changes-title">
          <h2 id="changes-title">Найденные изменения</h2>

          <div className="change-list">
            {changes.map((change) => (
              <article className={`change-card${selectedChangeId === change.id ? ' change-card--selected' : ''}`} key={change.id}>
                <div className="change-card__heading">
                  <h3>{change.ruleName}</h3>
                  {change.decision !== 'pending' && (
                    <span className={`decision-badge decision-badge--${change.decision}`}>
                      {change.decision === 'accepted' ? 'Принято' : 'Отклонено'}
                    </span>
                  )}
                </div>

                <div className="change-example change-example--before">
                  <span>Было</span>
                  <p>{change.before || 'Пробел отсутствует'}</p>
                </div>
                <div className="change-example change-example--after">
                  <span>Стало</span>
                  <p>{change.after || 'Удалить пробел'}</p>
                </div>

                <div className="change-actions">
                  <button
                    className="button button--primary change-action"
                    type="button"
                    aria-pressed={change.decision === 'accepted'}
                    onClick={() => onDecision(change.id, 'accepted')}
                  >
                    Принять
                  </button>
                  <button
                    className="button button--secondary change-action"
                    type="button"
                    aria-pressed={change.decision === 'rejected'}
                    onClick={() => onDecision(change.id, 'rejected')}
                  >
                    Отклонить
                  </button>
                  <button className="button button--outline change-action change-action--view" type="button" onClick={() => onSelectChange(change.id)}>
                    Посмотреть в тексте
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="review-footer">
            <div className="review-actions">
              <button className="button button--primary" type="button" onClick={onApplyAll}>Применить все</button>
              <button className="button button--secondary" type="button" onClick={onCopy}>Копировать текст</button>
              <button className="button button--secondary" type="button" disabled title="Экспорт файлов не входит в первую версию MVP">Экспортировать</button>
            </div>
            <p className="copy-status" aria-live="polite">{statusMessage}</p>
          </div>
        </section>
      </div>
    </main>
  )
}
