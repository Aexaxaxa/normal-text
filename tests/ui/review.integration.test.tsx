import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { ReviewScreen } from '../../src/components/ReviewScreen'
import type { TypographyChange } from '../../src/lib/typography'

const source = '"Test" and 15 kg.'

const initialChanges: TypographyChange[] = [
  {
    id: 'quotes-1',
    ruleId: 'quotes-straight',
    ruleName: 'Прямые кавычки',
    category: 'Кавычки',
    start: 0,
    end: 6,
    before: '"Test"',
    after: '“Test”',
    decision: 'pending',
  },
  {
    id: 'unit-1',
    ruleId: 'unit-spacing',
    ruleName: 'Число + единица',
    category: 'Пробелы',
    start: 13,
    end: 14,
    before: ' ',
    after: '\u00a0',
    decision: 'pending',
  },
]

function ReviewHarness() {
  const [changes, setChanges] = useState(initialChanges)
  const [selected, setSelected] = useState<string | null>(null)
  const [status, setStatus] = useState('')

  return (
    <ReviewScreen
      source={source}
      changes={changes}
      selectedChangeId={selected}
      statusMessage={status}
      onDecision={(id, decision) => setChanges((current) => current.map((change) => change.id === id ? { ...change, decision } : change))}
      onApplyAll={() => {
        setChanges((current) => current.map((change) => ({ ...change, decision: 'accepted' })))
        setStatus('Все изменения приняты.')
      }}
      onRejectAll={() => {
        setChanges((current) => current.map((change) => ({ ...change, decision: 'rejected' })))
        setStatus('Все изменения отклонены.')
      }}
      onSelectChange={setSelected}
      onCopy={vi.fn()}
      onExport={vi.fn()}
      onBack={vi.fn()}
    />
  )
}

describe('Requirement 2: review and decision workflow', () => {
  test('individual change can be accepted and rejected', async () => {
    const user = userEvent.setup()
    render(<ReviewHarness />)

    const acceptButtons = screen.getAllByRole('button', { name: 'Принять' })
    await user.click(acceptButtons[0])
    expect(screen.getByText('Принято')).toBeInTheDocument()

    const rejectButtons = screen.getAllByRole('button', { name: 'Отклонить' })
    await user.click(rejectButtons[0])
    expect(screen.getByText('Отклонено')).toBeInTheDocument()
  })

  test('Apply all accepts every change and shows confirmation', async () => {
    const user = userEvent.setup()
    render(<ReviewHarness />)

    await user.click(screen.getByRole('button', { name: 'Принять все' }))

    expect(screen.getAllByText('Принято')).toHaveLength(2)
    expect(screen.getByText('Все изменения приняты.')).toBeInTheDocument()
  })

  test('comparison mode and View in text highlight the selected fragment in both panes', async () => {
    const user = userEvent.setup()
    const { container } = render(<ReviewHarness />)

    await user.click(screen.getByRole('button', { name: 'Сравнить тексты' }))
    expect(screen.getByRole('heading', { name: 'Исходный текст' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Результат' })).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: 'Посмотреть' })[0])

    expect(container.querySelectorAll('[data-selected-highlight="true"]').length).toBeGreaterThanOrEqual(2)
  })
})
