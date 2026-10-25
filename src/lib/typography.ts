export type TypographyLanguage = 'ru' | 'en'
export type TypographyMode = 'basic' | 'full'
export type ChangeDecision = 'pending' | 'accepted' | 'rejected'

export type TypographyChange = {
  id: string
  ruleId: string
  ruleName: string
  category: string
  start: number
  end: number
  before: string
  after: string
  decision: ChangeDecision
}

type Candidate = Omit<TypographyChange, 'id' | 'decision'> & { priority: number }

type Rule = {
  id: string
  name: string
  category: string
  modes: TypographyMode[]
  find: (text: string, language: TypographyLanguage) => Candidate[]
}

function candidate(
  rule: Pick<Rule, 'id' | 'name' | 'category'>,
  start: number,
  end: number,
  before: string,
  after: string,
  priority: number,
): Candidate {
  return {
    ruleId: rule.id,
    ruleName: rule.name,
    category: rule.category,
    start,
    end,
    before,
    after,
    priority,
  }
}

const quoteRule: Rule = {
  id: 'quotes',
  name: 'Кавычки',
  category: 'Кавычки',
  modes: ['basic', 'full'],
  find(text, language) {
    const result: Candidate[] = []
    const pattern = /"([^"\n]+)"/g
    let match: RegExpExecArray | null
    const [open, close] = language === 'ru' ? ['«', '»'] : ['“', '”']

    while ((match = pattern.exec(text)) !== null) {
      result.push(candidate(this, match.index, match.index + match[0].length, match[0], `${open}${match[1]}${close}`, 10))
    }

    return result
  },
}

const punctuationSpaceRule: Rule = {
  id: 'space-before-punctuation',
  name: 'Пробел перед знаком',
  category: 'Пробелы',
  modes: ['basic', 'full'],
  find(text) {
    const result: Candidate[] = []
    const pattern = /[ \t]+(?=[,.;:!?])/g
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      result.push(candidate(this, match.index, match.index + match[0].length, match[0], '', 20))
    }
    return result
  },
}

const extraSpacesRule: Rule = {
  id: 'extra-spaces',
  name: 'Лишние пробелы',
  category: 'Пробелы',
  modes: ['basic', 'full'],
  find(text) {
    const result: Candidate[] = []
    const pattern = /[ \t]{2,}/g
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      result.push(candidate(this, match.index, match.index + match[0].length, match[0], ' ', 30))
    }
    return result
  },
}

const ellipsisRule: Rule = {
  id: 'ellipsis',
  name: 'Многоточие',
  category: 'Знаки',
  modes: ['basic', 'full'],
  find(text) {
    const result: Candidate[] = []
    const pattern = /\.\.\./g
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      result.push(candidate(this, match.index, match.index + 3, '...', '…', 40))
    }
    return result
  },
}

const rangeRule: Rule = {
  id: 'numeric-range',
  name: 'Числовой диапазон',
  category: 'Диапазоны',
  modes: ['full'],
  find(text) {
    const result: Candidate[] = []
    const pattern = /(\d)([ \t]*-[ \t]*)(\d)/g
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      const start = match.index + match[1].length
      result.push(candidate(this, start, start + match[2].length, match[2], '–', 50))
    }
    return result
  },
}

const percentRule: Rule = {
  id: 'percent-spacing',
  name: 'Проценты',
  category: 'Числа и знаки',
  modes: ['full'],
  find(text, language) {
    const result: Candidate[] = []
    const pattern = /(\d)([ \t]*)(%)/g
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      const start = match.index + match[1].length
      const before = match[2]
      const after = language === 'ru' ? '\u00A0' : ''
      if (before !== after) {
        result.push(candidate(this, start, start + before.length, before, after, 60))
      }
    }
    return result
  },
}

const unitRule: Rule = {
  id: 'unit-spacing',
  name: 'Неразрывный пробел',
  category: 'Единицы измерения',
  modes: ['full'],
  find(text, language) {
    const result: Candidate[] = []
    const units = language === 'ru'
      ? 'кг|мг|г|т|км|см|мм|м|мл|л'
      : 'kg|mg|g|t|km|cm|mm|m|ml|l'
    const pattern = new RegExp(`(\\d)([ \\t]+)(?=(?:${units})(?:$|[\\s.,;:!?]))`, 'gi')
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      const start = match.index + match[1].length
      if (match[2] !== '\u00A0') {
        result.push(candidate(this, start, start + match[2].length, match[2], '\u00A0', 70))
      }
    }
    return result
  },
}

export const typographyRules: Rule[] = [
  quoteRule,
  punctuationSpaceRule,
  extraSpacesRule,
  ellipsisRule,
  rangeRule,
  percentRule,
  unitRule,
]

export function getActiveRuleCount(mode: TypographyMode): number {
  return typographyRules.filter((rule) => rule.modes.includes(mode)).length
}

export function analyzeTypography(
  text: string,
  language: TypographyLanguage,
  mode: TypographyMode,
): TypographyChange[] {
  const candidates = typographyRules
    .filter((rule) => rule.modes.includes(mode))
    .flatMap((rule) => rule.find(text, language))
    .sort((a, b) => a.start - b.start || a.priority - b.priority || (b.end - b.start) - (a.end - a.start))

  const accepted: Candidate[] = []
  for (const item of candidates) {
    const overlaps = accepted.some((existing) => item.start < existing.end && item.end > existing.start)
    if (!overlaps && item.before !== item.after) accepted.push(item)
  }

  return accepted.map(({ priority: _priority, ...item }, index) => ({
    ...item,
    id: `${item.ruleId}-${item.start}-${index}`,
    decision: 'pending',
  }))
}

export function buildResultText(source: string, changes: TypographyChange[]): string {
  const active = changes
    .filter((change) => change.decision !== 'rejected')
    .sort((a, b) => a.start - b.start)

  let result = ''
  let cursor = 0
  for (const change of active) {
    result += source.slice(cursor, change.start)
    result += change.after
    cursor = change.end
  }
  result += source.slice(cursor)
  return result
}
