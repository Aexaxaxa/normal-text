import {
  IconArrowLeft,
  IconArrowsDiff,
  IconCheck,
  IconCopy,
  IconDownload,
  IconEye,
  IconFilter,
  IconX,
} from '@tabler/icons-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { TypographyChange } from '../lib/typography'

type ReviewScreenProps = {
  source: string
  changes: TypographyChange[]
  selectedChangeId: string | null
  statusMessage: string
  onDecision: (id: string, decision: 'accepted' | 'rejected') => void
  onApplyAll: () => void
  onRejectAll: () => void
  onSelectChange: (id: string) => void
  onCopy: () => void
  onExport: () => void
  onBack: () => void
}

function visibleFragment(value: string, fallback: string) {
  if (!value) return fallback
  return value.replace(/\u00a0/g, '⍽').replace(/\t/g, '⇥')
}

function HighlightMarker() {
  return <mark className="result-highlight result-highlight--marker" data-selected-highlight="true" aria-label="Позиция изменения">│</mark>
}

function SourceText({ source, changes, selectedChangeId }: Pick<ReviewScreenProps, 'source' | 'changes' | 'selectedChangeId'>) {
  const selected = changes.find((change) => change.id === selectedChangeId)
  if (!selected) return <>{source}</>

  const before = source.slice(0, selected.start)
  const selectedText = source.slice(selected.start, selected.end)
  const after = source.slice(selected.end)

  return (
    <>
      {before}
      {selectedText
        ? <mark className="result-highlight" data-selected-highlight="true">{selectedText}</mark>
        : <HighlightMarker />}
      {after}
    </>
  )
}

function ResultText({ source, changes, selectedChangeId }: Pick<ReviewScreenProps, 'source' | 'changes' | 'selectedChangeId'>) {
  const sorted = [...changes].sort((a, b) => a.start - b.start)
  const parts: ReactNode[] = []
  let cursor = 0

  sorted.forEach((change) => {
    if (change.start > cursor) parts.push(source.slice(cursor, change.start))
    const value = change.decision === 'rejected' ? source.slice(change.start, change.end) : change.after

    if (selectedChangeId === change.id) {
      parts.push(value
        ? <mark key={change.id} className="result-highlight" data-selected-highlight="true">{value}</mark>
        : <span key={change.id}><HighlightMarker /></span>)
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
  onRejectAll,
  onSelectChange,
  onCopy,
  onExport,
  onBack,
}: ReviewScreenProps) {
  const [compareMode, setCompareMode] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const accepted = changes.filter((change) => change.decision === 'accepted').length
  const rejected = changes.filter((change) => change.decision === 'rejected').length

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const change of changes) counts.set(change.category, (counts.get(change.category) ?? 0) + 1)
    return Array.from(counts.entries()).sort(([a], [b]) => a.localeCompare(b, 'ru'))
  }, [changes])

  const visibleChanges = categoryFilter === 'all'
    ? changes
    : changes.filter((change) => change.category === categoryFilter)

  useEffect(() => {
    if (!selectedChangeId) return
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('[data-selected-highlight="true"]')?.scrollIntoView({
        block: 'center',
        behavior: 'smooth',
      })
    })
  }, [selectedChangeId, compareMode])

  return (
    <main className="page review-page">
      <div className="review-layout">
        <section className="review-result" aria-labelledby="result-title">
          <div className="review-heading-row">
            <h1 className="review-heading" id="result-title">Результат</h1>
            <button className="back-button" type="button" onClick={onBack}>
              <IconArrowLeft size={17} stroke={1.8} aria-hidden="true" />
              Назад
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
              <IconArrowsDiff size={17} stroke={1.8} aria-hidden="true" />
              {compareMode ? 'Один результат' : 'Сравнить тексты'}
            </button>
          </div>

          <section className={`result-card${compareMode ? ' result-card--compare' : ''}`} aria-labelledby="processed-text-title">
            {compareMode ? (
              <div className="comparison-grid">
                <div className="comparison-pane">
                  <h2>Исходный текст</h2>
                  <p className="result-text"><SourceText source={source} changes={changes} selectedChangeId={selectedChangeId} /></p>
                </div>
                <div className="comparison-pane comparison-pane--result">
                  <h2 id="processed-text-title">Результат</h2>
                  <p className="result-text"><ResultText source={source} changes={changes} selectedChangeId={selectedChangeId} /></p>
                </div>
              </div>
            ) : (
              <>
                <h2 id="processed-text-title">Обработанный текст</h2>
                <p className="result-text"><ResultText source={source} changes={changes} selectedChangeId={selectedChangeId} /></p>
              </>
            )}
          </section>
        </section>

        <section className="changes-panel" aria-labelledby="changes-title">
          <div className="changes-heading-row">
            <h2 id="changes-title">Найденные изменения</h2>
            <label className="change-filter">
              <IconFilter size={15} stroke={1.8} aria-hidden="true" />
              <span className="visually-hidden">Фильтр изменений</span>
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                <option value="all">Все ({changes.length})</option>
                {categoryCounts.map(([category, count]) => (
                  <option value={category} key={category}>{category} ({count})</option>
                ))}
              </select>
            </label>
          </div>

          <div className="change-list">
            {visibleChanges.map((change) => (
              <article className={`change-card${selectedChangeId === change.id ? ' change-card--selected' : ''}`} key={change.id}>
                <div className="change-card__heading">
                  <div>
                    <h3>{change.ruleName}</h3>
                    {change.after.includes('\u00a0') && <span className="nbsp-hint">⍽ — неразрывный пробел</span>}
                  </div>
                  {change.decision !== 'pending' && (
                    <span className={`decision-badge decision-badge--${change.decision}`}>
                      {change.decision === 'accepted' ? 'Принято' : 'Отклонено'}
                    </span>
                  )}
                </div>

                <div className="change-comparison">
                  <div className="change-example change-example--before">
                    <span>Было</span>
                    <p>{visibleFragment(change.before, '∅')}</p>
                  </div>
                  <div className="change-example change-example--after">
                    <span>Стало</span>
                    <p>{visibleFragment(change.after, '∅')}</p>
                  </div>
                </div>

                <div className="change-actions">
                  <button className="button button--primary change-action" type="button" aria-pressed={change.decision === 'accepted'} onClick={() => onDecision(change.id, 'accepted')}>
                    <IconCheck size={16} stroke={1.9} aria-hidden="true" />Принять
                  </button>
                  <button className="button button--secondary change-action" type="button" aria-pressed={change.decision === 'rejected'} onClick={() => onDecision(change.id, 'rejected')}>
                    <IconX size={16} stroke={1.9} aria-hidden="true" />Отклонить
                  </button>
                  <button className="button button--outline change-action change-action--view" type="button" onClick={() => onSelectChange(change.id)}>
                    <IconEye size={16} stroke={1.8} aria-hidden="true" />Посмотреть
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="review-footer">
            <div className="review-actions review-actions--full">
              <button className="button button--primary" type="button" onClick={onApplyAll}>
                <IconCheck size={16} stroke={1.9} aria-hidden="true" />Принять все
              </button>
              <button className="button button--secondary" type="button" onClick={onRejectAll}>
                <IconX size={16} stroke={1.9} aria-hidden="true" />Отклонить все
              </button>
              <button className="button button--secondary" type="button" onClick={onCopy}>
                <IconCopy size={16} stroke={1.8} aria-hidden="true" />Копировать
              </button>
              <button className="button button--secondary" type="button" onClick={onExport}>
                <IconDownload size={16} stroke={1.8} aria-hidden="true" />Экспорт
              </button>
            </div>
            <p className="copy-status" aria-live="polite">{statusMessage}</p>
          </div>
        </section>
      </div>
    </main>
  )
}
