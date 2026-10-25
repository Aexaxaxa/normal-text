import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeTypography, buildResultText, getActiveRuleCount } from '../.test-build/typography.js'

test('basic mode finds four categories of basic corrections', () => {
  const source = 'Он сказал "привет"...  Потом пришёл , снова.'
  const changes = analyzeTypography(source, 'ru', 'basic')
  assert.equal(getActiveRuleCount('basic'), 4)
  assert.ok(changes.some((change) => change.ruleId === 'quotes'))
  assert.ok(changes.some((change) => change.ruleId === 'ellipsis'))
  assert.ok(changes.some((change) => change.ruleId === 'extra-spaces'))
  assert.ok(changes.some((change) => change.ruleId === 'space-before-punctuation'))
})

test('full Russian mode normalizes ranges, percent and units', () => {
  const source = 'Нужно 15 кг, скидка 20%, диапазон 10 - 15.'
  const changes = analyzeTypography(source, 'ru', 'full')
  const result = buildResultText(source, changes)

  assert.equal(getActiveRuleCount('full'), 7)
  assert.equal(result, 'Нужно 15\u00A0кг, скидка 20\u00A0%, диапазон 10–15.')
})

test('English mode uses English quotes and no space before percent', () => {
  const source = 'Use "example"... 20 % and 5 kg.'
  const changes = analyzeTypography(source, 'en', 'full')
  const result = buildResultText(source, changes)

  assert.equal(result, 'Use “example”… 20% and 5\u00A0kg.')
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
  const source = 'Текст «уже» соответствует правилам: 15\u00A0кг и 10–15.'
  assert.deepEqual(analyzeTypography(source, 'ru', 'full'), [])
})
