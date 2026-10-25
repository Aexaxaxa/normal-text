import mammoth from 'mammoth'
import { Document, Packer, Paragraph, TextRun } from 'docx'

export type SourceFormat = 'txt' | 'docx'
export type ExportFormat = SourceFormat

export type ImportedSource = {
  text: string
  fileName: string
  format: SourceFormat
}

const MAX_FILE_SIZE = 10 * 1024 * 1024

function getFormat(file: File): SourceFormat {
  const lower = file.name.toLowerCase()
  if (lower.endsWith('.txt')) return 'txt'
  if (lower.endsWith('.docx')) return 'docx'
  throw new Error('Поддерживаются только файлы TXT и DOCX.')
}

export async function readSourceFile(file: File): Promise<ImportedSource> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Файл слишком большой. Максимальный размер — 10 МБ.')
  }

  const format = getFormat(file)
  let text = ''

  if (format === 'txt') {
    text = await file.text()
  } else {
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    text = result.value
  }

  const normalized = text.replace(/\r\n/g, '\n').trimEnd()
  if (!normalized.trim()) {
    throw new Error('В файле не найден текст для обработки.')
  }

  return { text: normalized, fileName: file.name, format }
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

export async function exportTextFile(text: string, baseName: string, format: ExportFormat) {
  if (!text.trim()) throw new Error('Нет текста для экспорта.')

  if (format === 'txt') {
    downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), `${baseName}.txt`)
    return
  }

  const paragraphs = text.split('\n').map((line) => new Paragraph({
    children: [new TextRun(line || ' ')],
  }))
  const document = new Document({ sections: [{ children: paragraphs }] })
  const blob = await Packer.toBlob(document)
  downloadBlob(blob, `${baseName}.docx`)
}
