'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Save,
  CheckCircle2,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Download,
  Copy,
  RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DiagramType, MermaidContent } from '@/lib/blueprints/system-diagram-template'
import { DIAGRAM_TEMPLATES, DIAGRAM_TYPE_OPTIONS } from '@/lib/blueprints/system-diagram-template'

interface SystemDiagramEditorProps {
  content: MermaidContent | null
  onSave: (content: MermaidContent) => Promise<void>
}

export function SystemDiagramEditor({ content, onSave }: SystemDiagramEditorProps) {
  const [code, setCode] = useState(content?.code || '')
  const [diagramType, setDiagramType] = useState<DiagramType>(content?.diagram_type || 'flowchart')
  const [svgOutput, setSvgOutput] = useState('')
  const [renderError, setRenderError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [isDirty, setIsDirty] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [splitPos, setSplitPos] = useState(50) // percentage
  const [isResizing, setIsResizing] = useState(false)

  const previewRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const renderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const renderIdRef = useRef(0)

  // Render Mermaid diagram
  const renderDiagram = useCallback(async (mermaidCode: string) => {
    const currentId = ++renderIdRef.current

    try {
      const mermaid = (await import('mermaid')).default
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        themeVariables: {
          darkMode: true,
          background: '#0f1117',
          primaryColor: '#1a1d27',
          primaryTextColor: '#e4e7ec',
          primaryBorderColor: '#00d4ff',
          lineColor: '#5a5f73',
          secondaryColor: '#252830',
          tertiaryColor: '#1a1d27',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        },
        flowchart: { curve: 'basis' },
        sequence: { mirrorActors: false },
      })

      const { svg } = await mermaid.render(`mermaid-${currentId}`, mermaidCode.trim())

      if (currentId === renderIdRef.current) {
        setSvgOutput(svg)
        setRenderError(null)
      }
    } catch (err) {
      if (currentId === renderIdRef.current) {
        setSvgOutput('')
        const msg = err instanceof Error ? err.message : 'Syntax error in diagram'
        // Clean up mermaid error messages
        const cleaned = msg.replace(/Parse error on line \d+:/, (m) => m).split('\n')[0]
        setRenderError(cleaned)
      }
    }
  }, [])

  // Debounced render on code change
  useEffect(() => {
    if (renderTimerRef.current) clearTimeout(renderTimerRef.current)
    renderTimerRef.current = setTimeout(() => {
      if (code.trim()) {
        renderDiagram(code)
      } else {
        setSvgOutput('')
        setRenderError(null)
      }
    }, 500)
    return () => {
      if (renderTimerRef.current) clearTimeout(renderTimerRef.current)
    }
  }, [code, renderDiagram])

  // Save logic
  const doSave = useCallback(async (mermaidCode: string, dType: DiagramType) => {
    setSaveStatus('saving')
    try {
      await onSave({ type: 'mermaid', diagram_type: dType, code: mermaidCode })
      setSaveStatus('saved')
      setIsDirty(false)
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 5000)
    }
  }, [onSave])

  const debouncedSave = useCallback((mermaidCode: string, dType: DiagramType) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => doSave(mermaidCode, dType), 2000)
  }, [doSave])

  // Ctrl+S manual save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        doSave(code, diagramType)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [code, diagramType, doSave])

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (renderTimerRef.current) clearTimeout(renderTimerRef.current)
    }
  }, [])

  // Prevent navigation with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  // Handle code changes
  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode)
    setIsDirty(true)
    debouncedSave(newCode, diagramType)
  }, [diagramType, debouncedSave])

  // Handle diagram type switch
  const handleDiagramTypeChange = useCallback((newType: DiagramType) => {
    if (newType === diagramType) return
    if (code.trim() && code !== DIAGRAM_TEMPLATES[diagramType]) {
      const confirmed = window.confirm('This will replace your current diagram with a template. Continue?')
      if (!confirmed) return
    }
    setDiagramType(newType)
    const newCode = DIAGRAM_TEMPLATES[newType]
    setCode(newCode)
    setIsDirty(true)
    debouncedSave(newCode, newType)
  }, [code, diagramType, debouncedSave])

  // Zoom controls
  const handleZoomIn = useCallback(() => setZoom((z) => Math.min(z + 0.25, 3)), [])
  const handleZoomOut = useCallback(() => setZoom((z) => Math.max(z - 0.25, 0.25)), [])
  const handleZoomReset = useCallback(() => {
    setZoom(1)
    setPanOffset({ x: 0, y: 0 })
  }, [])

  // Pan controls
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    setIsPanning(true)
    setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y })
  }, [panOffset])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return
    setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y })
  }, [isPanning, panStart])

  const handleMouseUp = useCallback(() => setIsPanning(false), [])

  // Resize handle
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)

    const handleResizeMove = (moveEvent: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const newPos = ((moveEvent.clientX - rect.left) / rect.width) * 100
      setSplitPos(Math.max(20, Math.min(80, newPos)))
    }

    const handleResizeEnd = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleResizeMove)
      document.removeEventListener('mouseup', handleResizeEnd)
    }

    document.addEventListener('mousemove', handleResizeMove)
    document.addEventListener('mouseup', handleResizeEnd)
  }, [])

  // Copy code to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
    } catch { /* clipboard not available */ }
  }, [code])

  // Export SVG
  const handleExportSVG = useCallback(() => {
    if (!svgOutput) return
    const blob = new Blob([svgOutput], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'diagram.svg'
    a.click()
    URL.revokeObjectURL(url)
  }, [svgOutput])

  // Export PNG
  const handleExportPNG = useCallback(() => {
    if (!svgOutput) return
    const svgEl = previewRef.current?.querySelector('svg')
    if (!svgEl) return

    const canvas = document.createElement('canvas')
    const bbox = svgEl.getBoundingClientRect()
    canvas.width = bbox.width * 2
    canvas.height = bbox.height * 2
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.scale(2, 2)
    const img = new Image()
    const svgBlob = new Blob([svgOutput], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)
    img.onload = () => {
      ctx.fillStyle = '#0f1117'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, bbox.width, bbox.height)
      URL.revokeObjectURL(url)
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = 'diagram.png'
      a.click()
    }
    img.src = url
  }, [svgOutput])

  // Line count for editor gutter
  const lineCount = code.split('\n').length

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border-default bg-bg-secondary flex-shrink-0 flex-wrap">
        {/* Diagram type selector */}
        <div className="flex items-center gap-1 mr-2">
          {DIAGRAM_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleDiagramTypeChange(opt.value)}
              className={cn(
                'px-2 py-1 rounded text-[10px] font-medium transition-colors',
                diagramType === opt.value
                  ? 'bg-accent-cyan/10 text-accent-cyan'
                  : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary'
              )}
              title={opt.description}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-border-default mx-1" />

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className="p-1.5 rounded text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          title="Copy code"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>

        {/* Zoom controls */}
        <button
          onClick={handleZoomOut}
          className="p-1.5 rounded text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="text-[10px] text-text-tertiary min-w-[36px] text-center">{Math.round(zoom * 100)}%</span>
        <button
          onClick={handleZoomIn}
          className="p-1.5 rounded text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleZoomReset}
          className="p-1.5 rounded text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          title="Reset zoom & pan"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-5 bg-border-default mx-1" />

        {/* Fullscreen toggle */}
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-1.5 rounded text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          title={isFullscreen ? 'Exit fullscreen preview' : 'Fullscreen preview'}
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>

        <div className="w-px h-5 bg-border-default mx-1" />

        {/* Export buttons */}
        <button
          onClick={handleExportSVG}
          disabled={!svgOutput}
          className={cn(
            'px-2 py-1 rounded text-[10px] font-medium transition-colors',
            svgOutput
              ? 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
              : 'text-text-tertiary/40 cursor-not-allowed'
          )}
          title="Download SVG"
        >
          <span className="flex items-center gap-1">
            <Download className="w-3 h-3" />
            SVG
          </span>
        </button>
        <button
          onClick={handleExportPNG}
          disabled={!svgOutput}
          className={cn(
            'px-2 py-1 rounded text-[10px] font-medium transition-colors',
            svgOutput
              ? 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
              : 'text-text-tertiary/40 cursor-not-allowed'
          )}
          title="Download PNG"
        >
          <span className="flex items-center gap-1">
            <Download className="w-3 h-3" />
            PNG
          </span>
        </button>

        <div className="flex-1" />

        {/* Unsaved indicator */}
        {isDirty && saveStatus === 'idle' && (
          <span className="w-2 h-2 rounded-full bg-accent-warning flex-shrink-0" title="Unsaved changes" />
        )}

        {/* Save status */}
        <div className="flex items-center gap-1.5 ml-2">
          {saveStatus === 'saving' && (
            <>
              <Save className="w-3.5 h-3.5 text-text-tertiary animate-pulse" />
              <span className="text-xs text-text-tertiary">Saving...</span>
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-accent-success" />
              <span className="text-xs text-accent-success">Saved</span>
            </>
          )}
          {saveStatus === 'error' && (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-accent-error" />
              <span className="text-xs text-accent-error">Failed to save</span>
            </>
          )}
        </div>
      </div>

      {/* Split view: Code editor + Preview */}
      <div ref={containerRef} className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Code editor (left) */}
        {!isFullscreen && (
          <div
            className="flex flex-col overflow-hidden border-r border-border-default"
            style={{ width: `${splitPos}%` }}
          >
            <div className="flex-1 flex overflow-auto bg-bg-primary">
              {/* Line numbers */}
              <div className="flex-shrink-0 py-3 px-2 text-right select-none bg-bg-secondary border-r border-border-default/50">
                {Array.from({ length: lineCount }, (_, i) => (
                  <div key={i} className="text-[11px] leading-5 text-text-tertiary/50 font-mono">
                    {i + 1}
                  </div>
                ))}
              </div>
              {/* Code textarea */}
              <textarea
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                onKeyDown={(e) => {
                  // Tab support
                  if (e.key === 'Tab') {
                    e.preventDefault()
                    const target = e.target as HTMLTextAreaElement
                    const start = target.selectionStart
                    const end = target.selectionEnd
                    if (e.shiftKey) {
                      // Outdent: remove leading spaces
                      const before = code.substring(0, start)
                      const lineStart = before.lastIndexOf('\n') + 1
                      const linePrefix = code.substring(lineStart, start)
                      if (linePrefix.startsWith('    ')) {
                        const newCode = code.substring(0, lineStart) + code.substring(lineStart + 4)
                        handleCodeChange(newCode)
                        setTimeout(() => {
                          target.selectionStart = Math.max(lineStart, start - 4)
                          target.selectionEnd = Math.max(lineStart, end - 4)
                        }, 0)
                      }
                    } else {
                      const newCode = code.substring(0, start) + '    ' + code.substring(end)
                      handleCodeChange(newCode)
                      setTimeout(() => {
                        target.selectionStart = target.selectionEnd = start + 4
                      }, 0)
                    }
                  }
                }}
                spellCheck={false}
                className="flex-1 py-3 px-3 bg-transparent text-text-primary font-mono text-[13px] leading-5 resize-none outline-none placeholder:text-text-tertiary min-w-0"
                placeholder="Enter Mermaid diagram code..."
                aria-label="Mermaid diagram code editor"
              />
            </div>
          </div>
        )}

        {/* Resize handle */}
        {!isFullscreen && (
          <div
            className={cn(
              'w-1 cursor-col-resize hover:bg-accent-cyan/30 transition-colors flex-shrink-0 z-10 -ml-0.5 -mr-0.5',
              isResizing && 'bg-accent-cyan/30'
            )}
            onMouseDown={handleResizeStart}
          />
        )}

        {/* Preview (right) */}
        <div
          className="flex flex-col overflow-hidden bg-bg-primary"
          style={{ width: isFullscreen ? '100%' : `${100 - splitPos}%` }}
        >
          {/* Preview header */}
          <div className="flex items-center px-3 py-1 border-b border-border-default/50 bg-bg-secondary flex-shrink-0">
            <span className="text-[10px] text-text-tertiary uppercase tracking-wide">Preview</span>
          </div>

          {/* Preview content */}
          <div
            ref={previewRef}
            className={cn(
              'flex-1 overflow-hidden flex items-center justify-center',
              isPanning ? 'cursor-grabbing' : 'cursor-grab'
            )}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {renderError ? (
              <div className="p-4 max-w-md text-center">
                <AlertCircle className="w-8 h-8 text-accent-error/50 mx-auto mb-2" />
                <p className="text-xs text-accent-error font-mono break-words">{renderError}</p>
              </div>
            ) : svgOutput ? (
              <div
                style={{
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                  transformOrigin: 'center center',
                  transition: isPanning ? 'none' : 'transform 0.15s ease',
                }}
                className="[&_svg]:max-w-none"
                dangerouslySetInnerHTML={{ __html: svgOutput }}
              />
            ) : (
              <p className="text-xs text-text-tertiary">Enter diagram code to see preview</p>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="h-8 flex items-center gap-4 px-4 border-t border-border-default bg-bg-secondary flex-shrink-0">
        <span className="text-xs text-text-tertiary">{lineCount} lines</span>
        <span className="text-xs text-text-tertiary capitalize">{diagramType}</span>
      </div>
    </div>
  )
}
