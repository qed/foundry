import { convertToMarkdown } from 'mammoth'

export async function extractTextFromFile(file: File): Promise<string> {
  if (
    file.type === 'text/plain' ||
    file.type === 'text/markdown' ||
    file.name.endsWith('.md') ||
    file.name.endsWith('.txt')
  ) {
    return await file.text()
  }

  if (
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.name.endsWith('.docx')
  ) {
    const arrayBuffer = await file.arrayBuffer()
    const result = await convertToMarkdown({ arrayBuffer })
    return result.value
  }

  if (file.type === 'application/pdf') {
    throw new Error(
      'PDF support requires additional setup. Please copy-paste the text instead.'
    )
  }

  throw new Error(
    `Unsupported file type. Please upload a .txt, .md, or .docx file.`
  )
}
