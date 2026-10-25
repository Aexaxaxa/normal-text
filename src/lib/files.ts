import DOMPurify from 'dompurify'
import mammoth from 'mammoth'
import { AlignmentType, Document, HeadingLevel, LevelFormat, Packer, Paragraph, TextRun } from 'docx'

export type SourceFormat = 'txt' | 'docx'
export type ExportFormat = SourceFormat

export type DocumentRun = {
  text: string
  bold?: boolean
  italic?: boolean
}

export type DocumentBlock = {
  type: 'paragraph' | 'heading' | 'list-item'
  level?: number
  ordered?: boolean
  listInstance?: number
  runs: DocumentRun[]
}

export type DocumentStructure = DocumentBlock[]

export type ImportedSource = {
  text: string
  fileName: string
  format: SourceFormat
  structure: DocumentStructure | null
}

export type ExportChange = {
  start: number
  end: number
  after: string
  decision: 'pending' | 'accepted' | 'rejected'
}

const MAX_FILE_SIZE = 10 * 1024 * 1024

function getFormat(file: File): SourceFormat {
  const lower = file.name.toLowerCase()
  if (lower.endsWith('.txt')) return 'txt'
  if (lower.endsWith('.docx')) return 'docx'
  throw new Error('Поддерживаются только файлы TXT и DOCX.')
}

function collectRuns(node: Node, bold = false, italic = false): DocumentRun[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? ''
    return text ? [{ text, bold, italic }] : []
  }
  if (!(node instanceof Element)) return []

  const tag = node.tagName.toLowerCase()
  if (tag === 'ul' || tag === 'ol') return []
  if (tag === 'br') return [{ text: '\n', bold, italic }]

  const nextBold = bold || tag === 'strong' || tag === 'b'
  const nextItalic = italic || tag === 'em' || tag === 'i'
  return Array.from(node.childNodes).flatMap((child) => collectRuns(child, nextBold, nextItalic))
}

function mergeRuns(runs: DocumentRun[]): DocumentRun[] {
  const merged: DocumentRun[] = []
  for (const run of runs) {
    const previous = merged.at(-1)
    if (previous && previous.bold === run.bold && previous.italic === run.italic) {
      previous.text += run.text
    } else {
      merged.push({ ...run })
    }
  }
  return merged
}

function parseDocxStructure(html: string): DocumentStructure {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'br'],
    ALLOWED_ATTR: [],
  })
  const document = new DOMParser().parseFromString(clean, 'text/html')
  const blocks: DocumentStructure = []
  let listInstance = 0

  for (const element of Array.from(document.body.children)) {
    const tag = element.tagName.toLowerCase()

    if (/^h[1-6]$/.test(tag)) {
      blocks.push({
        type: 'heading',
        level: Number(tag.slice(1)),
        runs: mergeRuns(collectRuns(element)),
      })
      continue
    }

    if (tag === 'p') {
      blocks.push({ type: 'paragraph', runs: mergeRuns(collectRuns(element)) })
      continue
    }

    if (tag === 'ul' || tag === 'ol') {
      listInstance += 1
      for (const item of Array.from(element.children).filter((child) => child.tagName.toLowerCase() === 'li')) {
        blocks.push({
          type: 'list-item',
          ordered: tag === 'ol',
          listInstance,
          runs: mergeRuns(collectRuns(item)),
        })
      }
    }
  }

  return blocks
}

export function structureToText(structure: DocumentStructure): string {
  return structure.map((block) => block.runs.map((run) => run.text).join('')).join('\n')
}

function txtStructure(text: string): DocumentStructure {
  return text.split('\n').map((line) => ({ type: 'paragraph', runs: [{ text: line }] }))
}

export async function readSourceFile(file: File): Promise<ImportedSource> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Файл слишком большой. Максимальный размер — 10 МБ.')
  }

  const format = getFormat(file)

  if (format === 'txt') {
    const raw = (await file.text()).replace(/\r\n/g, '\n').trimEnd()
    if (!raw.trim()) throw new Error('В файле не найден текст для обработки.')
    return { text: raw, fileName: file.name, format, structure: txtStructure(raw) }
  }

  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.convertToHtml({ arrayBuffer })
  const structure = parseDocxStructure(result.value)
  const text = structureToText(structure).replace(/\r\n/g, '\n').trimEnd()

  if (!text.trim()) {
    const fallback = await mammoth.extractRawText({ arrayBuffer })
    const fallbackText = fallback.value.replace(/\r\n/g, '\n').trimEnd()
    if (!fallbackText.trim()) throw new Error('В DOCX не найден поддерживаемый текст.')
    return { text: fallbackText, fileName: file.name, format, structure: txtStructure(fallbackText) }
  }

  return { text, fileName: file.name, format, structure }
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function applyChangesToRuns(structure: DocumentStructure, sourceText: string, changes: ExportChange[]): DocumentStructure {
  const active = changes.filter((change) => change.decision !== 'rejected').sort((a, b) => a.start - b.start)
  if (!active.length) return structure.map((block) => ({ ...block, runs: block.runs.map((run) => ({ ...run })) }))

  let globalOffset = 0
  const transformed = structure.map((block, blockIndex) => {
    const nextRuns: DocumentRun[] = []
    for (const run of block.runs) {
      const runStart = globalOffset
      const runEnd = runStart + run.text.length
      const local = active.filter((change) => change.start >= runStart && change.end <= runEnd)
      let cursor = 0
      let value = ''
      for (const change of local) {
        const start = change.start - runStart
        const end = change.end - runStart
        value += run.text.slice(cursor, start) + change.after
        cursor = end
      }
      value += run.text.slice(cursor)
      nextRuns.push({ ...run, text: value })
      globalOffset = runEnd
    }
    if (blockIndex < structure.length - 1) globalOffset += 1
    return { ...block, runs: nextRuns }
  })

  return transformed
}

function headingValue(level = 1) {
  const values = [
    HeadingLevel.HEADING_1,
    HeadingLevel.HEADING_2,
    HeadingLevel.HEADING_3,
    HeadingLevel.HEADING_4,
    HeadingLevel.HEADING_5,
    HeadingLevel.HEADING_6,
  ]
  return values[Math.max(0, Math.min(5, level - 1))]
}

function createDocxParagraphs(
  text: string,
  structure: DocumentStructure | null,
  sourceText: string | undefined,
  changes: ExportChange[],
): Paragraph[] {
  if (!structure || !sourceText || structureToText(structure) !== sourceText) {
    return text.split('\n').map((line) => new Paragraph({ children: [new TextRun(line || ' ')] }))
  }

  const transformed = applyChangesToRuns(structure, sourceText, changes)
  const transformedText = structureToText(transformed)

  if (transformedText !== text) {
    const lines = text.split('\n')
    return lines.map((line, index) => {
      const sourceBlock = structure[index]
      const base = [new TextRun(line || ' ')]
      if (sourceBlock?.type === 'heading') return new Paragraph({ heading: headingValue(sourceBlock.level), children: base })
      if (sourceBlock?.type === 'list-item') {
        return new Paragraph({
          children: base,
          ...(sourceBlock.ordered
            ? { numbering: { reference: 'normal-text-numbering', level: 0, instance: sourceBlock.listInstance ?? 1 } }
            : { bullet: { level: 0 } }),
        })
      }
      return new Paragraph({ children: base })
    })
  }

  return transformed.map((block) => {
    const runs = block.runs.map((run) => new TextRun({
      text: run.text || ' ',
      bold: run.bold,
      italics: run.italic,
    }))

    if (block.type === 'heading') return new Paragraph({ heading: headingValue(block.level), children: runs })
    if (block.type === 'list-item') {
      return new Paragraph({
        children: runs.length ? runs : [new TextRun(' ')],
        ...(block.ordered
          ? { numbering: { reference: 'normal-text-numbering', level: 0, instance: block.listInstance ?? 1 } }
          : { bullet: { level: 0 } }),
      })
    }
    return new Paragraph({ children: runs.length ? runs : [new TextRun(' ')] })
  })
}

export async function exportTextFile(
  text: string,
  baseName: string,
  format: ExportFormat,
  options: {
    structure?: DocumentStructure | null
    sourceText?: string
    changes?: ExportChange[]
  } = {},
) {
  if (!text.trim()) throw new Error('Нет текста для экспорта.')

  if (format === 'txt') {
    downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), `${baseName}.txt`)
    return
  }

  const paragraphs = createDocxParagraphs(
    text,
    options.structure ?? null,
    options.sourceText,
    options.changes ?? [],
  )
  const document = new Document({
    numbering: {
      config: [
        {
          reference: 'normal-text-numbering',
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: '%1.',
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: { left: 720, hanging: 260 },
                },
              },
            },
          ],
        },
      ],
    },
    sections: [{ children: paragraphs }],
  })
  const blob = await Packer.toBlob(document)
  downloadBlob(blob, `${baseName}.docx`)
}
