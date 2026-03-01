declare module 'mammoth' {
  interface ConversionResult {
    value: string
    messages: Array<{ type: string; message: string }>
  }

  interface Input {
    arrayBuffer?: ArrayBuffer
    buffer?: Buffer
    path?: string
  }

  function convertToMarkdown(input: Input): Promise<ConversionResult>
  function convertToHtml(input: Input): Promise<ConversionResult>
  function extractRawText(input: Input): Promise<ConversionResult>

  export { convertToMarkdown, convertToHtml, extractRawText }
}
