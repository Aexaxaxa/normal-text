import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test } from 'vitest'
import App from '../../src/App'

function renderApp() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  )
}

describe('Requirement 1: text validation and processing', () => {
  test('empty text shows validation error and does not open Review', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('button', { name: /Проверить текст/i }))

    expect(await screen.findByRole('heading', { name: 'Нет текста для проверки' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Результат' })).not.toBeInTheDocument()
  })

  test('text with typographic violations opens Review with detected changes', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.type(
      screen.getByLabelText('Исходный текст'),
      'Он сказал "привет"...  Вес 15 кг, диапазон 10 - 15.',
    )
    await user.click(screen.getByRole('button', { name: /Проверить текст/i }))

    expect(await screen.findByRole('heading', { name: 'Результат' }, { timeout: 1500 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Найденные изменения' })).toBeInTheDocument()
    expect(screen.getByText('Прямые кавычки')).toBeInTheDocument()
  })

  test('already correct text shows the no-changes modal over the editor', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.type(screen.getByLabelText('Исходный текст'), 'Привет.')
    await user.click(screen.getByRole('button', { name: /Проверить текст/i }))

    expect(await screen.findByRole('heading', { name: 'Изменений не найдено' }, { timeout: 1500 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Типографическая проверка текста' })).toBeInTheDocument()
  })
})
