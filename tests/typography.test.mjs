import test from 'node:test'
import assert from 'node:assert/strict'
import {
  analyzeTypography,
  buildResultText,
  getActiveRuleCount,
  getActiveRuleIds,
  getRuleDefinitions,
} from '../.test-build/typography.js'

test('Russian presets expose 8 basic and 24 full rules', () => {
  assert.equal(getActiveRuleCount('basic', 'ru'), 8)
  assert.equal(getActiveRuleCount('full', 'ru'), 24)
  assert.equal(getRuleDefinitions('ru').length, 24)
})

test('basic mode finds core correction categories', () => {
  const source = 'Он сказал "привет"...  Потом пришёл , снова. Вес 15 кг, диапазон 10 - 15.'
  const changes = analyzeTypography(source, 'ru', 'basic')
  for (const id of ['quotes-straight', 'ellipsis', 'extra-spaces', 'space-before-punctuation', 'unit-spacing', 'numeric-range']) {
    assert.ok(changes.some((change) => change.ruleId === id), id)
  }
})

test('full Russian mode normalizes ranges, percent and units', () => {
  const source = 'Нужно 15 кг, скидка 20%, диапазон 10 - 15.'
  const changes = analyzeTypography(source, 'ru', 'full')
  const result = buildResultText(source, changes)
  assert.equal(result, 'Нужно 15 кг, скидка 20 %, диапазон 10–15.')
})

test('English mode uses English quotes and no space before percent', () => {
  const source = 'Use "example"... 20 % and 5 kg.'
  const changes = analyzeTypography(source, 'en', 'full')
  const result = buildResultText(source, changes)
  assert.equal(result, 'Use “example”… 20% and 5 kg.')
})

test('structured Russian rules normalize phone, initials and address', () => {
  const source = 'А. С. Пушкин, г. Москва, +7 (999) 123-45-67.'
  const changes = analyzeTypography(source, 'ru', 'full')
  const result = buildResultText(source, changes)
  assert.equal(result, 'А. С. Пушкин, г. Москва, +7 999 123‑45‑67.')
})

test('custom mode applies only selected rules', () => {
  const source = '"Текст"...  15 кг.'
  const ids = ['quotes-straight']
  assert.deepEqual(getActiveRuleIds('ru', 'custom', ids), ids)
  const result = buildResultText(source, analyzeTypography(source, 'ru', 'custom', ids))
  assert.equal(result, '«Текст»...  15 кг.')
})

test('rejected change is not applied to result', () => {
  const source = 'Вес 15 кг.'
  const changes = analyzeTypography(source, 'ru', 'full')
  const unit = changes.find((change) => change.ruleId === 'unit-spacing')
  assert.ok(unit)
  unit.decision = 'rejected'
  assert.equal(buildResultText(source, changes), source)
})

test('already normalized text produces no changes', () => {
  const source = 'Текст «уже» соответствует правилам: 15 кг и 10–15.'
  assert.deepEqual(analyzeTypography(source, 'ru', 'full'), [])
})
