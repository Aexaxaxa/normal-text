import test from 'node:test'
import assert from 'node:assert/strict'
import {
  analyzeTypography,
  buildResultText,
  getActiveRuleCount,
  getActiveRuleIds,
  getRuleDefinitions,
} from '../.test-build/typography.js'

test('Russian and English full presets are materially different', () => {
  const ru = getRuleDefinitions('ru')
  const en = getRuleDefinitions('en')
  assert.ok(ru.length >= 35, \`RU rules: ${ru.length}\`)
  assert.ok(en.length >= 20, \`EN rules: ${en.length}\`)
  assert.notEqual(getActiveRuleCount('full', 'ru'), getActiveRuleCount('full', 'en'))
  assert.ok(ru.some((rule) => rule.id === 'phone-format'))
  assert.ok(!en.some((rule) => rule.id === 'phone-format'))
  assert.ok(en.some((rule) => rule.id === 'apostrophe-en'))
  assert.ok(!ru.some((rule) => rule.id === 'apostrophe-en'))
})

test('basic Russian mode finds core correction categories', () => {
  const source = 'Он сказал "привет"...  Потом пришёл , снова. Вес 15 кг, диапазон 10 - 15.'
  const changes = analyzeTypography(source, 'ru', 'basic')
  for (const id of ['quotes-straight', 'ellipsis', 'extra-spaces', 'space-before-punctuation', 'unit-spacing', 'numeric-range']) {
    assert.ok(changes.some((change) => change.ruleId === id), id)
  }
})

test('full Russian mode normalizes non-breaking spaces, range, percent and units', () => {
  const source = 'В доме нужно 15 кг, скидка 20%, диапазон 10 - 15 и 10 шт.'
  const result = buildResultText(source, analyzeTypography(source, 'ru', 'full'))
  assert.equal(result, 'В доме нужно 15 кг, скидка 20 %, диапазон 10–15 и 10 шт.')
})

test('full Russian mode covers extra rule families', () => {
  const source = 'Площадь 15 м2, бюджет 5 млн, дата 25 октября 2026 г., кое кто пришел из за дождя.'
  const changes = analyzeTypography(source, 'ru', 'full')
  const ids = new Set(changes.map((change) => change.ruleId))
  for (const id of ['unit-powers', 'magnitude-nbsp-ru', 'day-month-nbsp-ru', 'year-nbsp-ru', 'ru-hyphen-koe', 'ru-hyphen-izza-izpod']) {
    assert.ok(ids.has(id), id)
  }
})

test('English mode uses English quotes, apostrophes, em dash and English spacing', () => {
  const source = 'Dr. Smith said "don\\'t worry" - it is 20 % in London.'
  const result = buildResultText(source, analyzeTypography(source, 'en', 'full'))
  assert.equal(result, 'Dr. Smith said “don’t worry” — it is 20% in London.')
})

test('English currency and abbreviation rules differ from Russian ones', () => {
  const source = 'Price is $ 100, e. g. No. 5.'
  const changes = analyzeTypography(source, 'en', 'full')
  const result = buildResultText(source, changes)
  assert.equal(result, 'Price is $100, e.g. No. 5.')
  assert.ok(changes.some((change) => change.ruleId === 'currency-en'))
  assert.ok(changes.some((change) => change.ruleId === 'english-abbreviations'))
})

test('structured Russian rules normalize phone, initials and address', () => {
  const source = 'А. С. Пушкин, г. Москва, +7 (999) 123-45-67.'
  const changes = analyzeTypography(source, 'ru', 'full')
  const result = buildResultText(source, changes)
  assert.equal(result, 'А. С. Пушкин, г. Москва, +7 999 123‑45‑67.')
})

test('common symbol rules normalize fractions, math signs and arrows', () => {
  const source = '1/2 != 1/4 -> 3/4.'
  const result = buildResultText(source, analyzeTypography(source, 'en', 'full'))
  assert.equal(result, '½ ≠ ¼ → ¾.')
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

test('already normalized Russian text produces no changes', () => {
  const source = 'Текст «уже» соответствует правилам: 15 кг и 10–15.'
  assert.deepEqual(analyzeTypography(source, 'ru', 'full'), [])
})
