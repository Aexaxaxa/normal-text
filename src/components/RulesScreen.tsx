import { useMemo, useState } from 'react'
import {
  getActiveRuleIds,
  getRuleDefinitions,
  ruleCategories,
  type TypographyLanguage,
  type TypographyMode,
} from '../lib/typography'

type RulesScreenProps = {
  language: TypographyLanguage
  mode: TypographyMode
  customRuleIds: string[]
  onBack: () => void
  onSave: (mode: TypographyMode, customRuleIds: string[]) => void
}

export function RulesScreen({ language, mode, customRuleIds, onBack, onSave }: RulesScreenProps) {
  const availableRules = useMemo(() => getRuleDefinitions(language), [language])
  const initialIds = mode === 'custom'
    ? customRuleIds
    : getActiveRuleIds(language, mode, customRuleIds)
  const [draftMode, setDraftMode] = useState<TypographyMode>(mode)
  const [enabledIds, setEnabledIds] = useState<string[]>(initialIds)

  const setPreset = (nextMode: TypographyMode) => {
    setDraftMode(nextMode)
    if (nextMode === 'custom') {
      setEnabledIds(customRuleIds.length ? customRuleIds : getActiveRuleIds(language, 'full'))
    } else {
      setEnabledIds(getActiveRuleIds(language, nextMode))
    }
  }

  const updateCustom = (next: string[]) => {
    setDraftMode('custom')
    setEnabledIds(next)
  }

  const toggleRule = (ruleId: string) => {
    const next = enabledIds.includes(ruleId)
      ? enabledIds.filter((id) => id !== ruleId)
      : [...enabledIds, ruleId]
    updateCustom(next)
  }

  const toggleCategory = (categoryId: string) => {
    const ids = availableRules.filter((rule) => rule.categoryId === categoryId).map((rule) => rule.id)
    const allEnabled = ids.length > 0 && ids.every((id) => enabledIds.includes(id))
    const next = allEnabled
      ? enabledIds.filter((id) => !ids.includes(id))
      : Array.from(new Set([...enabledIds, ...ids]))
    updateCustom(next)
  }

  return (
    <main className="page rules-page">
      <section className="rules-screen" aria-labelledby="rules-title">
        <button className="rules-back" type="button" onClick={onBack}>← Назад</button>
        <div className="rules-heading">
          <h1 id="rules-title">Настройки правил</h1>
          <p>Включайте и отключайте отдельные правила. Категории помогают быстро управлять группами.</p>
        </div>

        <div className="rules-mode">
          <label htmlFor="rules-mode">Режим обработки</label>
          <div className="select-wrap">
            <select
              id="rules-mode"
              value={draftMode}
              onChange={(event) => setPreset(event.target.value as TypographyMode)}
            >
              <option value="basic">Базовый</option>
              <option value="full">Полный / ГОСТ</option>
              <option value="custom">Пользовательский</option>
            </select>
            <span className="select-arrow" aria-hidden="true">∨</span>
          </div>
          <span className="rules-active-count">Активно: {enabledIds.length}</span>
        </div>

        <div className="rules-grid">
          {ruleCategories.map((category) => {
            const categoryRules = availableRules.filter((rule) => rule.categoryId === category.id)
            if (!categoryRules.length) return null
            const enabledCount = categoryRules.filter((rule) => enabledIds.includes(rule.id)).length
            const allEnabled = enabledCount === categoryRules.length

            return (
              <section className="rule-category" key={category.id}>
                <div className="rule-category__header">
                  <div>
                    <h2>{category.title}</h2>
                    <p>{category.description}</p>
                  </div>
                  <button
                    className={`toggle-switch${allEnabled ? ' toggle-switch--on' : ''}`}
                    type="button"
                    role="switch"
                    aria-checked={allEnabled}
                    aria-label={`${allEnabled ? 'Выключить' : 'Включить'} категорию ${category.title}`}
                    onClick={() => toggleCategory(category.id)}
                  >
                    <span />
                  </button>
                </div>

                <div className="rule-list">
                  {categoryRules.map((rule) => {
                    const enabled = enabledIds.includes(rule.id)
                    return (
                      <article className="rule-row" key={rule.id}>
                        <div className="rule-copy">
                          <h3>{rule.name}</h3>
                          <p>{rule.example}</p>
                        </div>
                        <button
                          className={`toggle-switch toggle-switch--small${enabled ? ' toggle-switch--on' : ''}`}
                          type="button"
                          role="switch"
                          aria-checked={enabled}
                          aria-label={`${enabled ? 'Выключить' : 'Включить'} правило ${rule.name}`}
                          onClick={() => toggleRule(rule.id)}
                        >
                          <span />
                        </button>
                      </article>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>

        <div className="rules-actions">
          <button className="button button--primary" type="button" onClick={() => onSave(draftMode, enabledIds)}>
            Сохранить настройки
          </button>
          <button className="button button--secondary" type="button" onClick={onBack}>Назад</button>
        </div>
      </section>
    </main>
  )
}
