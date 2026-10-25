import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { RulesScreen } from '../../src/components/RulesScreen'

describe('Requirement 3: configurable typography rules', () => {
  test('category switch has mixed state when only part of its rules are enabled', () => {
    render(
      <RulesScreen
        language="ru"
        mode="custom"
        customRuleIds={['quotes-straight']}
        onBack={vi.fn()}
        onSave={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('checkbox', { name: /все правила категории «Кавычки»/i }),
    ).toHaveAttribute('aria-checked', 'mixed')
  })

  test('category switch enables all rules and then disables all rules', async () => {
    const user = userEvent.setup()
    render(
      <RulesScreen
        language="ru"
        mode="custom"
        customRuleIds={['quotes-straight']}
        onBack={vi.fn()}
        onSave={vi.fn()}
      />,
    )

    const category = screen.getByRole('checkbox', { name: /все правила категории «Кавычки»/i })

    await user.click(category)
    expect(category).toHaveAttribute('aria-checked', 'true')

    await user.click(category)
    expect(category).toHaveAttribute('aria-checked', 'false')
  })

  test('saving a changed rule set returns custom mode and selected rule ids', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(
      <RulesScreen
        language="ru"
        mode="full"
        customRuleIds={[]}
        onBack={vi.fn()}
        onSave={onSave}
      />,
    )

    await user.click(screen.getByRole('switch', { name: /Выключить правило «Прямые кавычки»/i }))
    await user.click(screen.getByRole('button', { name: /Сохранить настройки/i }))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0][0]).toBe('custom')
    expect(onSave.mock.calls[0][1]).not.toContain('quotes-straight')
  })
})
