export type TypographyLanguage = 'ru' | 'en'
export type TypographyMode = 'basic' | 'full' | 'custom'
export type ChangeDecision = 'pending' | 'accepted' | 'rejected'
export type RuleCategoryId = 'quotes' | 'dashes' | 'spaces' | 'numbers' | 'datetime' | 'structured' | 'ranges' | 'symbols'

type PresetMode = Exclude<TypographyMode, 'custom'>

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

export type TypographyRuleMeta = {
  id: string
  name: string
  categoryId: RuleCategoryId
  category: string
  description: string
  example: string
  languages: TypographyLanguage[]
  modes: PresetMode[]
}

export type RuleCategory = {
  id: RuleCategoryId
  title: string
  description: string
}

type Candidate = Omit<TypographyChange, 'id' | 'decision'> & { priority: number }
type Rule = TypographyRuleMeta & {
  priority: number
  find: (text: string, language: TypographyLanguage) => Candidate[]
}

type RegexRuleConfig = Omit<Rule, 'find'> & {
  pattern: RegExp | ((language: TypographyLanguage) => RegExp)
  replace: (match: RegExpExecArray, language: TypographyLanguage) => string
  skip?: (match: RegExpExecArray, text: string, language: TypographyLanguage) => boolean
}

export const ruleCategories: RuleCategory[] = [
  { id: 'quotes', title: 'Кавычки', description: 'Прямые, русские и вложенные кавычки' },
  { id: 'dashes', title: 'Тире и дефисы', description: 'Контекстное тире, минус и неразрывный дефис' },
  { id: 'spaces', title: 'Пробелы', description: 'Неразрывные, лишние и служебные пробелы' },
  { id: 'numbers', title: 'Числа и единицы', description: 'Проценты, единицы, валюты и числовые конструкции' },
  { id: 'datetime', title: 'Дата и время', description: 'Форматирование дат и времени' },
  { id: 'structured', title: 'Структурированные конструкции', description: 'Телефоны, адреса, инициалы и сокращения' },
  { id: 'ranges', title: 'Диапазоны', description: 'Числовые диапазоны через короткое тире' },
  { id: 'symbols', title: 'Специальные символы', description: 'Многоточие, знаки ©/®/™ и номер' },
]

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

function regexRule(config: RegexRuleConfig): Rule {
  const rule: Rule = {
    ...config,
    find(text, language) {
      const source = typeof config.pattern === 'function' ? config.pattern(language) : config.pattern
      const flags = source.flags.includes('g') ? source.flags : source.flags + 'g'
      const pattern = new RegExp(source.source, flags)
      const result: Candidate[] = []
      let match: RegExpExecArray | null

      while ((match = pattern.exec(text)) !== null) {
        if (config.skip?.(match, text, language)) continue
        const after = config.replace(match, language)
        if (after !== match[0]) {
          result.push(candidate(rule, match.index, match.index + match[0].length, match[0], after, config.priority))
        }
        if (match[0].length === 0) pattern.lastIndex += 1
      }
      return result
    },
  }
  return rule
}

const rules: Rule[] = [
  regexRule({
    id: 'quotes-straight',
    name: 'Прямые кавычки',
    categoryId: 'quotes',
    category: 'Кавычки',
    description: 'Заменяет прямые кавычки на типографические для выбранного языка.',
    example: '"Текст" → «Текст»',
    languages: ['ru', 'en'],
    modes: ['basic', 'full'],
    priority: 10,
    pattern: /"([^"\n]+)"/g,
    replace: (m, language) => language === 'ru' ? `«${m[1]}»` : `“${m[1].replace(/([A-Za-z])'([A-Za-z])/g, '$1’$2')}”`,
  }),
  regexRule({
    id: 'quotes-nested',
    name: 'Вложенные кавычки',
    categoryId: 'quotes',
    category: 'Кавычки',
    description: 'Оформляет кавычки второго уровня внутри русских «ёлочек».',
    example: '«Он сказал "да"» → «Он сказал „да“»',
    languages: ['ru'],
    modes: ['full'],
    priority: 5,
    pattern: /«([^«»\n]*?)"([^"\n]+)"([^«»\n]*?)»/g,
    replace: (m) => `«${m[1]}„${m[2]}“${m[3]}»`,
  }),
  regexRule({
    id: 'dash-between-words',
    name: 'Тире между словами',
    categoryId: 'dashes',
    category: 'Тире и дефисы',
    description: 'Заменяет дефис между словами на контекстное тире.',
    example: 'слово - слово → слово — слово',
    languages: ['ru', 'en'],
    modes: ['basic', 'full'],
    priority: 30,
    pattern: /(?<=[A-Za-zА-Яа-яЁё»”"'\)])([ \t]+-[ \t]+)(?=[A-Za-zА-Яа-яЁё«“"'\(])/g,
    replace: () => ' — ',
  }),
  regexRule({
    id: 'ordinal-nbhyphen',
    name: 'Порядковые числительные',
    categoryId: 'dashes',
    category: 'Тире и дефисы',
    description: 'Использует неразрывный дефис в русских порядковых числительных.',
    example: '5-й → 5‑й',
    languages: ['ru'],
    modes: ['full'],
    priority: 40,
    pattern: /(\d+)-(й|я|е|го|му|м|ми|х)(?=$|[\s.,;:!?])/gi,
    replace: (m) => `${m[1]}‑${m[2]}`,
  }),
  regexRule({
    id: 'minus-sign',
    name: 'Знак минуса',
    categoryId: 'dashes',
    category: 'Тире и дефисы',
    description: 'Заменяет дефис перед отрицательным числом на математический минус.',
    example: '-5 → −5',
    languages: ['ru', 'en'],
    modes: ['full'],
    priority: 45,
    pattern: /(^|[\s(])-(\d+(?:[.,]\d+)?)/gm,
    replace: (m) => `${m[1]}−${m[2]}`,
  }),
  regexRule({
    id: 'extra-spaces',
    name: 'Лишние пробелы',
    categoryId: 'spaces',
    category: 'Пробелы',
    description: 'Схлопывает несколько обычных пробелов в один.',
    example: 'слово  слово → слово слово',
    languages: ['ru', 'en'],
    modes: ['basic', 'full'],
    priority: 60,
    pattern: /[ \t]{2,}/g,
    replace: () => ' ',
  }),
  regexRule({
    id: 'space-before-punctuation',
    name: 'Пробел перед знаком',
    categoryId: 'spaces',
    category: 'Пробелы',
    description: 'Удаляет пробел перед запятой, точкой и другими знаками.',
    example: 'слово , → слово,',
    languages: ['ru', 'en'],
    modes: ['basic', 'full'],
    priority: 65,
    pattern: /[ \t]+(?=[,.;:!?](?!=))/g,
    replace: () => '',
  }),
  regexRule({
    id: 'short-word-nbsp',
    name: 'Неразрывный пробел после короткого слова',
    categoryId: 'spaces',
    category: 'Пробелы',
    description: 'Не даёт коротким русским предлогам и союзам отрываться от следующего слова.',
    example: 'в доме → в⍽доме',
    languages: ['ru'],
    modes: ['full'],
    priority: 70,
    pattern: /(^|[\s([{«])(в|к|с|у|о|и|а|но|на|за|по|из|от|до|во|ко|со)[ \t]+(?=\S)/gi,
    replace: (m) => `${m[1]}${m[2]} `,
  }),
  regexRule({
    id: 'unit-spacing',
    name: 'Число + единица',
    categoryId: 'spaces',
    category: 'Пробелы',
    description: 'Связывает число и единицу измерения неразрывным пробелом.',
    example: '15 кг → 15⍽кг',
    languages: ['ru', 'en'],
    modes: ['basic', 'full'],
    priority: 75,
    pattern: (language) => {
      const units = language === 'ru'
        ? 'кг|мг|г|т|км|см|мм|м|мл|л|ч|мин|с'
        : 'kg|mg|g|t|km|cm|mm|m|ml|l|h|min|s'
      return new RegExp(`(\\d(?:[.,]\\d+)?)([ \\t]+)(?=(?:${units})(?:$|[\\s.,;:!?]))`, 'gi')
    },
    replace: (m) => `${m[1]} `,
  }),
  regexRule({
    id: 'percent-spacing',
    name: 'Проценты',
    categoryId: 'numbers',
    category: 'Числа и единицы',
    description: 'Нормализует пробел между числом и знаком процента.',
    example: '20% → 20 %',
    languages: ['ru', 'en'],
    modes: ['basic', 'full'],
    priority: 100,
    pattern: /(\d(?:[.,]\d+)?)[ \t]*(%)/g,
    replace: (m, language) => language === 'ru' ? `${m[1]} %` : `${m[1]}%`,
  }),
  regexRule({
    id: 'thousands-spacing',
    name: 'Разряды больших чисел',
    categoryId: 'numbers',
    category: 'Числа и единицы',
    description: 'Разделяет пяти- и шестизначные числа неразрывным пробелом.',
    example: '15000 → 15⍽000',
    languages: ['ru', 'en'],
    modes: ['full'],
    priority: 105,
    pattern: /(^|[^\d])(\d{2,3})[ \t]?(\d{3})(?=$|[^\d])/g,
    replace: (m) => `${m[1]}${m[2]} ${m[3]}`,
  }),
  regexRule({
    id: 'currency-spacing',
    name: 'Число + валюта (RU)',
    categoryId: 'numbers',
    category: 'Числа и единицы',
    description: 'Связывает числовое значение и следующий знак валюты неразрывным пробелом.',
    example: '100 ₽ → 100⍽₽',
    languages: ['ru'],
    modes: ['full'],
    priority: 110,
    pattern: /(\d(?:[.,]\d+)?)[ \t]+(?=[₽€$])/g,
    replace: (m) => `${m[1]} `,
  }),
  regexRule({
    id: 'dimensions-sign',
    name: 'Размеры через ×',
    categoryId: 'numbers',
    category: 'Числа и единицы',
    description: 'Заменяет букву x/х между размерами на знак умножения.',
    example: '10x20 → 10×20',
    languages: ['ru', 'en'],
    modes: ['full'],
    priority: 115,
    pattern: /(\d(?:[.,]\d+)?)[ \t]*[xх×][ \t]*(\d(?:[.,]\d+)?)/gi,
    replace: (m) => `${m[1]}×${m[2]}`,
  }),
  regexRule({
    id: 'degree-temperature',
    name: 'Температура',
    categoryId: 'numbers',
    category: 'Числа и единицы',
    description: 'Нормализует запись температуры со знаком градуса.',
    example: '20 oC → 20 °C',
    languages: ['ru', 'en'],
    modes: ['full'],
    priority: 120,
    pattern: /(\d(?:[.,]\d+)?)[ \t]*(?:o|°)[ \t]*C(?=$|[\s.,;:!?])/gi,
    replace: (m) => `${m[1]} °C`,
  }),
  regexRule({
    id: 'date-spacing',
    name: 'Дата',
    categoryId: 'datetime',
    category: 'Дата и время',
    description: 'Убирает лишние пробелы внутри даты формата ДД.ММ.ГГГГ.',
    example: '25. 10. 2026 → 25.10.2026',
    languages: ['ru', 'en'],
    modes: ['full'],
    priority: 140,
    pattern: /(\d{1,2})[ \t]*\.[ \t]*(\d{1,2})[ \t]*\.[ \t]*(\d{4})/g,
    replace: (m) => `${m[1]}.${m[2]}.${m[3]}`,
  }),
  regexRule({
    id: 'time-spacing',
    name: 'Время',
    categoryId: 'datetime',
    category: 'Дата и время',
    description: 'Убирает лишние пробелы вокруг двоеточия во времени.',
    example: '12 : 30 → 12:30',
    languages: ['ru', 'en'],
    modes: ['full'],
    priority: 145,
    pattern: /(\d{1,2})[ \t]*:[ \t]*(\d{2})/g,
    replace: (m) => `${m[1]}:${m[2]}`,
  }),
  regexRule({
    id: 'phone-format',
    name: 'Телефон',
    categoryId: 'structured',
    category: 'Структурированные конструкции',
    description: 'Приводит российский номер к единому типографическому виду.',
    example: '+7 (999) 123-45-67 → +7 999 123‑45‑67',
    languages: ['ru'],
    modes: ['full'],
    priority: 160,
    pattern: /(?:\+?7|8)[ \t()-]*(\d{3})[ \t()-]*(\d{3})[ \t-]*(\d{2})[ \t-]*(\d{2})(?=$|[^\d])/g,
    replace: (m) => `+7 ${m[1]} ${m[2]}‑${m[3]}‑${m[4]}`,
  }),
  regexRule({
    id: 'address-nbsp',
    name: 'Адресные сокращения',
    categoryId: 'structured',
    category: 'Структурированные конструкции',
    description: 'Добавляет неразрывную связь после адресного сокращения.',
    example: 'г. Москва → г. Москва',
    languages: ['ru'],
    modes: ['full'],
    priority: 165,
    pattern: /(^|[\s(])((?:г|ул|д|кв|стр|корп)\.)[ \t]+(?=\S)/gi,
    replace: (m) => `${m[1]}${m[2]} `,
  }),
  regexRule({
    id: 'initials-nbsp',
    name: 'Инициалы и фамилия',
    categoryId: 'structured',
    category: 'Структурированные конструкции',
    description: 'Связывает инициалы и фамилию неразрывными пробелами.',
    example: 'А. С. Пушкин → А. С. Пушкин',
    languages: ['ru'],
    modes: ['full'],
    priority: 170,
    pattern: /(^|[\s(])([А-ЯЁ])\.[ \t]+([А-ЯЁ])\.[ \t]+([А-ЯЁ][а-яё]+)/g,
    replace: (m) => `${m[1]}${m[2]}. ${m[3]}. ${m[4]}`,
  }),
  regexRule({
    id: 'abbreviations-nbsp',
    name: 'Сокращения',
    categoryId: 'structured',
    category: 'Структурированные конструкции',
    description: 'Связывает части устойчивых сокращений.',
    example: 'т. д. → т. д.',
    languages: ['ru'],
    modes: ['full'],
    priority: 175,
    pattern: /(?:и[ \t]+)?т\.[ \t]+[дп]\./gi,
    replace: (m) => m[0].replace(/[ \t]+/g, ' '),
  }),
  regexRule({
    id: 'apostrophe-en',
    name: 'Типографский апостроф',
    categoryId: 'quotes',
    category: 'Кавычки',
    description: 'Заменяет машинописный апостроф внутри английских слов на типографский.',
    example: "don't → don’t",
    languages: ['en'],
    modes: ['basic', 'full'],
    priority: 12,
    pattern: /([A-Za-z])'([A-Za-z])/g,
    replace: (m) => `${m[1]}’${m[2]}`,
  }),
  regexRule({
    id: 'ru-hyphen-izza-izpod',
    name: 'Из-за и из-под',
    categoryId: 'dashes',
    category: 'Тире и дефисы',
    description: 'Исправляет раздельное написание устойчивых русских предлогов.',
    example: 'из за → из-за',
    languages: ['ru'],
    modes: ['full'],
    priority: 22,
    pattern: /(^|[\s([{«])из[ \t]+(за|под)(?=$|[\s,.;:!?\])}»])/gi,
    replace: (m) => `${m[1]}из-${m[2].toLowerCase()}`,
  }),
  regexRule({
    id: 'ru-hyphen-koe',
    name: 'Частица «кое-»',
    categoryId: 'dashes',
    category: 'Тире и дефисы',
    description: 'Ставит дефис после «кое» и «кой» перед словом.',
    example: 'кое кто → кое-кто',
    languages: ['ru'],
    modes: ['full'],
    priority: 23,
    pattern: /(^|[\s([{«])(кое|кой)[ \t]+([А-Яа-яЁё]+)/gi,
    replace: (m) => `${m[1]}${m[2]}-${m[3]}`,
  }),
  regexRule({
    id: 'ru-hyphen-particles',
    name: 'Частицы -то, -либо, -нибудь',
    categoryId: 'dashes',
    category: 'Тире и дефисы',
    description: 'Ставит дефис перед русскими постфиксами -то, -либо и -нибудь.',
    example: 'кто то → кто-то',
    languages: ['ru'],
    modes: ['full'],
    priority: 24,
    pattern: /(^|[\s([{«])([А-Яа-яЁё]+)[ \t]+(то|либо|нибудь)(?=$|[\s,.;:!?\])}»])/gi,
    replace: (m) => `${m[1]}${m[2]}-${m[3].toLowerCase()}`,
  }),
  regexRule({
    id: 'trailing-spaces',
    name: 'Пробелы в конце строки',
    categoryId: 'spaces',
    category: 'Пробелы',
    description: 'Удаляет пробелы и табы перед переносом строки или концом текста.',
    example: 'строка··↵ → строка↵',
    languages: ['ru', 'en'],
    modes: ['full'],
    priority: 58,
    pattern: /[ \t]+(?=\n|$)/g,
    replace: () => '',
  }),
  regexRule({
    id: 'bracket-spacing',
    name: 'Пробелы у скобок',
    categoryId: 'spaces',
    category: 'Пробелы',
    description: 'Убирает лишний пробел сразу после открывающей или перед закрывающей скобкой.',
    example: '( текст ) → (текст)',
    languages: ['ru', 'en'],
    modes: ['full'],
    priority: 64,
    pattern: /([(\[{])[ \t]+|[ \t]+(?=[)\]}])/g,
    replace: (m) => m[1] || '',
  }),
  regexRule({
    id: 'short-word-nbsp-en',
    name: 'Неразрывный пробел после короткого слова (EN)',
    categoryId: 'spaces',
    category: 'Пробелы',
    description: 'Связывает короткие английские артикли, союзы и предлоги со следующим словом.',
    example: 'in London → in⍽London',
    languages: ['en'],
    modes: ['full'],
    priority: 71,
    pattern: /(^|[\s([{“])((?:a|an|the|in|on|at|to|of|by|as|or|and|but))[ \t]+(?=\S)/gi,
    replace: (m) => `${m[1]}${m[2]} `,
  }),
  regexRule({
    id: 'unit-powers',
    name: 'Квадратные и кубические единицы',
    categoryId: 'numbers',
    category: 'Числа и единицы',
    description: 'Заменяет m2/m3 и м2/м3 на типографские ²/³.',
    example: '15 м2 → 15⍽м²',
    languages: ['ru', 'en'],
    modes: ['full'],
    priority: 78,
    pattern: (language) => language === 'ru'
      ? /(\d(?:[.,]\d+)?)[ \t]+(мм|см|дм|м|км)(?:\^?)(2|3)(?=$|[\s.,;:!?])/gi
      : /(\d(?:[.,]\d+)?)[ \t]+(mm|cm|dm|m|km)(?:\^?)(2|3)(?=$|[\s.,;:!?])/gi,
    replace: (m) => `${m[1]} ${m[2]}${m[3] === '2' ? '²' : '³'}`,
  }),
  regexRule({
    id: 'pieces-nbsp-ru',
    name: 'Число + «шт.»',
    categoryId: 'numbers',
    category: 'Числа и единицы',
    description: 'Ставит неразрывный пробел между числом и сокращением «шт.».',
    example: '10 шт. → 10⍽шт.',
    languages: ['ru'],
    modes: ['full'],
    priority: 80,
    pattern: /(\d(?:[.,]\d+)?)[ \t]+(?=шт\.?(?:$|[\s,;:!?]))/gi,
    replace: (m) => `${m[1]} `,
  }),
  regexRule({
    id: 'dpi-nbsp',
    name: 'Число + dpi/lpi',
    categoryId: 'numbers',
    category: 'Числа и единицы',
    description: 'Связывает значение разрешения с dpi или lpi.',
    example: '300 dpi → 300⍽dpi',
    languages: ['ru', 'en'],
    modes: ['full'],
    priority: 82,
    pattern: /(\d+(?:[.,]\d+)?)[ \t]+(?=(?:dpi|lpi)(?:$|[\s.,;:!?]))/gi,
    replace: (m) => `${m[1]} `,
  }),
  regexRule({
    id: 'magnitude-nbsp-ru',
    name: 'Тысячи, миллионы и миллиарды',
    categoryId: 'numbers',
    category: 'Числа и единицы',
    description: 'Связывает число с сокращениями тыс., млн, млрд и трлн.',
    example: '5 млн → 5⍽млн',
    languages: ['ru'],
    modes: ['full'],
    priority: 83,
    pattern: /(\d(?:[.,]\d+)?)[ \t]+(?=(?:тыс\.?|млн|млрд|трлн)(?:$|[\s.,;:!?]))/gi,
    replace: (m) => `${m[1]} `,
  }),
  regexRule({
    id: 'currency-en',
    name: 'Валюта перед числом (EN)',
    categoryId: 'numbers',
    category: 'Числа и единицы',
    description: 'Убирает лишний пробел между английским знаком валюты и числом.',
    example: '$ 100 → $100',
    languages: ['en'],
    modes: ['full'],
    priority: 111,
    pattern: /([$£€¥])[ \t]+(\d(?:[.,]\d+)?)/g,
    replace: (m) => `${m[1]}${m[2]}`,
  }),
  regexRule({
    id: 'fraction-symbols',
    name: 'Типографские дроби',
    categoryId: 'numbers',
    category: 'Числа и единицы',
    description: 'Заменяет распространённые простые дроби на единый символ.',
    example: '1/2 → ½',
    languages: ['ru', 'en'],
    modes: ['full'],
    priority: 116,
    pattern: /\b(1\/2|1\/4|3\/4)\b/g,
    replace: (m) => m[1] === '1/2' ? '½' : m[1] === '1/4' ? '¼' : '¾',
  }),
  regexRule({
    id: 'math-signs',
    name: 'Математические знаки',
    categoryId: 'numbers',
    category: 'Числа и единицы',
    description: 'Заменяет машинописные комбинации на математические символы.',
    example: '!=, <=, >=, +- → ≠, ≤, ≥, ±',
    languages: ['ru', 'en'],
    modes: ['full'],
    priority: 118,
    pattern: /!=|<=|>=|~=|\+\-/g,
    replace: (m) => ({ '!=': '≠', '<=': '≤', '>=': '≥', '~=': '≅', '+-': '±' }[m[0]] || m[0]),
  }),
  regexRule({
    id: 'iso-date-ru',
    name: 'Дата ISO',
    categoryId: 'datetime',
    category: 'Дата и время',
    description: 'Преобразует русскую дату YYYY-MM-DD в DD.MM.YYYY.',
    example: '2026-10-25 → 25.10.2026',
    languages: ['ru'],
    modes: ['full'],
    priority: 142,
    pattern: /\b(\d{4})-(\d{2})-(\d{2})\b/g,
    replace: (m) => `${m[3]}.${m[2]}.${m[1]}`,
  }),
  regexRule({
    id: 'day-month-nbsp-ru',
    name: 'Число + месяц',
    categoryId: 'datetime',
    category: 'Дата и время',
    description: 'Не даёт числу отрываться от названия русского месяца.',
    example: '25 октября → 25⍽октября',
    languages: ['ru'],
    modes: ['full'],
    priority: 148,
    pattern: /(\d{1,2})[ \t]+(?=(?:января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)(?:$|[\s,.;:!?]))/gi,
    replace: (m) => `${m[1]} `,
  }),
  regexRule({
    id: 'year-nbsp-ru',
    name: 'Год',
    categoryId: 'datetime',
    category: 'Дата и время',
    description: 'Связывает год и сокращение «г.» неразрывным пробелом.',
    example: '2026 г. → 2026⍽г.',
    languages: ['ru'],
    modes: ['full'],
    priority: 149,
    pattern: /(\d{4})[ \t]+(?=г\.(?:$|[\s,;:!?]))/gi,
    replace: (m) => `${m[1]} `,
  }),
  regexRule({
    id: 'particles-nbsp-ru',
    name: 'Неразрывный пробел перед частицами',
    categoryId: 'structured',
    category: 'Структурированные конструкции',
    description: 'Связывает частицы ли, ль, же, бы и б с предыдущим словом.',
    example: 'сделал бы → сделал⍽бы',
    languages: ['ru'],
    modes: ['full'],
    priority: 172,
    pattern: /([А-Яа-яЁё]+)[ \t]+(ли|ль|же|бы|б)(?=$|[\s,.;:!?])/gi,
    replace: (m) => `${m[1]} ${m[2]}`,
  }),
  regexRule({
    id: 'company-nbsp-ru',
    name: 'ООО/ПАО + название',
    categoryId: 'structured',
    category: 'Структурированные конструкции',
    description: 'Связывает форму организации с её названием.',
    example: 'ООО Ромашка → ООО⍽Ромашка',
    languages: ['ru'],
    modes: ['full'],
    priority: 174,
    pattern: /\b(ООО|ОАО|ЗАО|ПАО|НИИ)[ \t]+(?=[«"А-ЯЁA-Z])/g,
    replace: (m) => `${m[1]} `,
  }),
  regexRule({
    id: 'ps-nbsp-ru',
    name: 'P. S. / P. P. S.',
    categoryId: 'structured',
    category: 'Структурированные конструкции',
    description: 'Связывает части постскриптума неразрывными пробелами.',
    example: 'P. S. → P.⍽S.',
    languages: ['ru'],
    modes: ['full'],
    priority: 176,
    pattern: /\bP\.[ \t]+(?:P\.[ \t]+)?S\./g,
    replace: (m) => m[0].replace(/[ \t]+/g, ' '),
  }),
  regexRule({
    id: 'honorific-nbsp-en',
    name: 'Обращение + фамилия (EN)',
    categoryId: 'structured',
    category: 'Структурированные конструкции',
    description: 'Связывает Mr., Mrs., Ms., Dr. и Prof. с именем или фамилией.',
    example: 'Dr. Smith → Dr.⍽Smith',
    languages: ['en'],
    modes: ['full'],
    priority: 178,
    pattern: /\b(Mr|Mrs|Ms|Dr|Prof)\.[ \t]+(?=[A-Z])/g,
    replace: (m) => `${m[1]}. `,
  }),
  regexRule({
    id: 'english-abbreviations',
    name: 'Сокращения e.g. / i.e.',
    categoryId: 'structured',
    category: 'Структурированные конструкции',
    description: 'Убирает случайные пробелы внутри распространённых английских сокращений.',
    example: 'e. g. → e.g.',
    languages: ['en'],
    modes: ['full'],
    priority: 179,
    pattern: /\b(e|i)\.[ \t]+(g|e)\./gi,
    replace: (m) => `${m[1]}.${m[2]}.`,
  }),
  regexRule({
    id: 'number-sign-en',
    name: 'No. + номер (EN)',
    categoryId: 'symbols',
    category: 'Специальные символы',
    description: 'Связывает английское сокращение No. с номером.',
    example: 'No. 5 → No.⍽5',
    languages: ['en'],
    modes: ['full'],
    priority: 231,
    pattern: /\bNo\.[ \t]+(?=\d)/g,
    replace: () => 'No. ',
  }),
  regexRule({
    id: 'arrows',
    name: 'Стрелки',
    categoryId: 'symbols',
    category: 'Специальные символы',
    description: 'Заменяет текстовые стрелки на единые символы.',
    example: '->, <- → →, ←',
    languages: ['ru', 'en'],
    modes: ['full'],
    priority: 232,
    pattern: /->|<-/g,
    replace: (m) => m[0] === '->' ? '→' : '←',
  }),
  regexRule({
    id: 'ruble-symbol',
    name: 'Символ рубля',
    categoryId: 'symbols',
    category: 'Специальные символы',
    description: 'Опционально заменяет «руб.» после числа на символ ₽.',
    example: '100 руб. → 100⍽₽',
    languages: ['ru'],
    modes: [],
    priority: 235,
    pattern: /(\d(?:[.,]\d+)?)[ \t]+руб\.?/gi,
    replace: (m) => `${m[1]} ₽`,
  }),
  regexRule({
    id: 'numeric-range',
    name: 'Числовые диапазоны',
    categoryId: 'ranges',
    category: 'Диапазоны',
    description: 'Использует короткое тире без пробелов для числового диапазона.',
    example: '2024-2026 → 2024–2026',
    languages: ['ru', 'en'],
    modes: ['basic', 'full'],
    priority: 200,
    pattern: /(\d{1,4})([ \t]*-[ \t]*)(\d{1,4})/g,
    skip: (m, text) => {
      const before = text[m.index - 1]
      const after = text[m.index + m[0].length]
      return before === '-' || after === '-'
    },
    replace: (m) => `${m[1]}–${m[3]}`,
  }),
  regexRule({
    id: 'ellipsis',
    name: 'Многоточие',
    categoryId: 'symbols',
    category: 'Специальные символы',
    description: 'Заменяет три точки на единый символ многоточия.',
    example: '... → …',
    languages: ['ru', 'en'],
    modes: ['basic', 'full'],
    priority: 220,
    pattern: /\.\.\./g,
    replace: () => '…',
  }),
  regexRule({
    id: 'special-symbols',
    name: '©, ® и ™',
    categoryId: 'symbols',
    category: 'Специальные символы',
    description: 'Заменяет текстовые обозначения специальных знаков.',
    example: '(c), (r), (tm) → ©, ®, ™',
    languages: ['ru', 'en'],
    modes: ['full'],
    priority: 225,
    pattern: /\((c|r|tm)\)/gi,
    replace: (m) => {
      const value = m[1].toLowerCase()
      return value === 'c' ? '©' : value === 'r' ? '®' : '™'
    },
  }),
  regexRule({
    id: 'numero-sign',
    name: '№, §, рис. и стр.',
    categoryId: 'symbols',
    category: 'Специальные символы',
    description: 'Связывает номер, параграф и ссылочные сокращения с числом неразрывным пробелом.',
    example: 'N 5, § 3, рис. 2 → № 5, § 3, рис. 2',
    languages: ['ru'],
    modes: ['full'],
    priority: 230,
    pattern: /(№|N|§|рис\.|стр\.)[ \t]*(\d+)/gi,
    replace: (m) => `${m[1].toLowerCase() === 'n' ? '№' : m[1]} ${m[2]}`,
  }),
]

export const typographyRules: TypographyRuleMeta[] = rules.map(({ find: _find, priority: _priority, ...meta }) => meta)

export function getRuleDefinitions(language: TypographyLanguage): TypographyRuleMeta[] {
  return typographyRules.filter((rule) => rule.languages.includes(language))
}

export function getActiveRuleIds(
  language: TypographyLanguage,
  mode: TypographyMode,
  customRuleIds: string[] = [],
): string[] {
  const available = rules.filter((rule) => rule.languages.includes(language))
  if (mode === 'custom') {
    const allowed = new Set(available.map((rule) => rule.id))
    return customRuleIds.filter((id) => allowed.has(id))
  }
  return available.filter((rule) => rule.modes.includes(mode)).map((rule) => rule.id)
}

export function getActiveRuleCount(
  mode: TypographyMode,
  language: TypographyLanguage = 'ru',
  customRuleIds: string[] = [],
): number {
  return getActiveRuleIds(language, mode, customRuleIds).length
}

export function analyzeTypography(
  text: string,
  language: TypographyLanguage,
  mode: TypographyMode,
  customRuleIds: string[] = [],
): TypographyChange[] {
  const enabled = new Set(getActiveRuleIds(language, mode, customRuleIds))
  const candidates = rules
    .filter((rule) => rule.languages.includes(language) && enabled.has(rule.id))
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
