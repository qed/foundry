/**
 * Text extraction utilities for artifacts.
 * Extracts searchable text from PDF, DOCX, CSV, MD, TXT files.
 */

const MAX_CONTENT_LENGTH = 500 * 1024 // 500KB max extracted text

/**
 * Extract text content from a file buffer based on file type.
 * Returns null for unsupported types (images, audio, etc.).
 */
export async function extractText(
  buffer: Buffer,
  fileType: string
): Promise<string | null> {
  try {
    let text: string | null = null

    switch (fileType.toLowerCase()) {
      case 'pdf':
        text = await extractPdfText(buffer)
        break
      case 'docx':
        text = await extractDocxText(buffer)
        break
      case 'csv':
        text = extractCsvText(buffer)
        break
      case 'md':
      case 'txt':
        text = extractPlainText(buffer)
        break
      case 'png':
      case 'jpg':
      case 'jpeg':
        // Images: just use filename placeholder (handled by caller)
        return null
      case 'mp3':
      case 'wav':
      case 'm4a':
      case 'aac':
        // Audio: transcription deferred to future phase
        return null
      default:
        return null
    }

    if (text) {
      // Truncate to max length
      if (text.length > MAX_CONTENT_LENGTH) {
        text = text.slice(0, MAX_CONTENT_LENGTH)
      }
      // Clean up whitespace
      text = text.replace(/\s+/g, ' ').trim()
    }

    return text || null
  } catch (error) {
    console.error(`Text extraction failed for ${fileType}:`, error)
    return null
  }
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import('pdf-parse')
  const parser = new PDFParse({ data: new Uint8Array(buffer) })
  const result = await parser.getText()
  await parser.destroy()
  return result.text
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}

function extractCsvText(buffer: Buffer): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Papa = require('papaparse') as typeof import('papaparse')
  const csv = new TextDecoder().decode(buffer)
  const parsed = Papa.parse(csv)
  return (parsed.data as string[][])
    .map((row) => row.join(' | '))
    .join('\n')
}

function extractPlainText(buffer: Buffer): string {
  return new TextDecoder().decode(buffer)
}
