'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import LinkExtension from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Code,
  Quote,
  Link2,
  Undo2,
  Redo2,
  Save,
  CheckCircle2,
  AlertCircle,
  ListTree,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Heading {
  id: string
  level: number
  text: string
  pos: number
}

interface RequirementsEditorProps {
  content: string
  onSave: (html: string) => Promise<void>
  readOnly?: boolean
  toolbarExtra?: React.ReactNode
  versionPanel?: React.ReactNode
  onContentSaved?: (html: string, previousHtml: string) => void
}

export function RequirementsEditor({
  content,
  onSave,
  readOnly = false,
  toolbarExtra,
  versionPanel,
  onContentSaved,
}: RequirementsEditorProps) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [wordCount, setWordCount] = useState(0)
  const [headings, setHeadings] = useState<Heading[]>([])
  const [showOutline, setShowOutline] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedContentRef = useRef<string>(content)

  const doSave = useCallback(async (html: string) => {
    setSaveStatus('saving')
    try {
      const previousHtml = lastSavedContentRef.current
      await onSave(html)
      lastSavedContentRef.current = html
      onContentSaved?.(html, previousHtml)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 5000)
    }
  }, [onSave, onContentSaved])

  const debouncedSave = useCallback((html: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      doSave(html)
    }, 2000)
  }, [doSave])

  const extractHeadings = useCallback((editorInstance: ReturnType<typeof useEditor>) => {
    if (!editorInstance) return
    const newHeadings: Heading[] = []
    editorInstance.state.doc.descendants((node, pos) => {
      if (node.type.name === 'heading') {
        newHeadings.push({
          id: `heading-${pos}`,
          level: node.attrs.level as number,
          text: node.textContent,
          pos,
        })
      }
    })
    setHeadings(newHeadings)
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      LinkExtension.configure({
        openOnClick: false,
      }),
      Underline,
    ],
    content,
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: 'prose-foundry outline-none min-h-[400px]',
      },
    },
    onCreate: ({ editor: ed }) => {
      const text = ed.getText()
      setWordCount(text.split(/\s+/).filter(Boolean).length)
      extractHeadings(ed)
    },
    onUpdate: ({ editor: ed }) => {
      const text = ed.getText()
      setWordCount(text.split(/\s+/).filter(Boolean).length)
      extractHeadings(ed)
      debouncedSave(ed.getHTML())
    },
  })

  // Ctrl+S manual save
  useEffect(() => {
    if (readOnly) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (editor) {
          if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
          doSave(editor.getHTML())
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [editor, doSave, readOnly])

  // Save on blur (only if pending changes)
  useEffect(() => {
    if (!editor || readOnly) return
    const handleBlur = () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
        doSave(editor.getHTML())
      }
    }
    editor.on('blur', handleBlur)
    return () => { editor.off('blur', handleBlur) }
  }, [editor, doSave, readOnly])

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  const readingTime = Math.max(1, Math.ceil(wordCount / 200))

  const scrollToHeading = useCallback((pos: number) => {
    if (!editor) return
    const { view } = editor
    const domAtPos = view.domAtPos(pos + 1)
    const el = domAtPos.node instanceof HTMLElement
      ? domAtPos.node
      : domAtPos.node.parentElement
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    editor.commands.setTextSelection(pos + 1)
  }, [editor])

  const handleInsertLink = useCallback(() => {
    if (!editor) return
    const previousUrl = editor.getAttributes('link').href || ''
    const url = window.prompt('Enter URL:', previousUrl)
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
  }, [editor])

  if (!editor) return null

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-border-default bg-bg-secondary flex-shrink-0 flex-wrap">
        {!readOnly && (
          <>
            <ToolbarButton
              icon={<Bold className="w-4 h-4" />}
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              tooltip="Bold (Ctrl+B)"
            />
            <ToolbarButton
              icon={<Italic className="w-4 h-4" />}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              tooltip="Italic (Ctrl+I)"
            />
            <ToolbarButton
              icon={<UnderlineIcon className="w-4 h-4" />}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              isActive={editor.isActive('underline')}
              tooltip="Underline (Ctrl+U)"
            />

            <Divider />

            <ToolbarButton
              icon={<Heading1 className="w-4 h-4" />}
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              isActive={editor.isActive('heading', { level: 1 })}
              tooltip="Heading 1"
            />
            <ToolbarButton
              icon={<Heading2 className="w-4 h-4" />}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              isActive={editor.isActive('heading', { level: 2 })}
              tooltip="Heading 2"
            />
            <ToolbarButton
              icon={<Heading3 className="w-4 h-4" />}
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              isActive={editor.isActive('heading', { level: 3 })}
              tooltip="Heading 3"
            />

            <Divider />

            <ToolbarButton
              icon={<List className="w-4 h-4" />}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
              tooltip="Bullet List"
            />
            <ToolbarButton
              icon={<ListOrdered className="w-4 h-4" />}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive('orderedList')}
              tooltip="Ordered List"
            />

            <Divider />

            <ToolbarButton
              icon={<Code className="w-4 h-4" />}
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              isActive={editor.isActive('codeBlock')}
              tooltip="Code Block"
            />
            <ToolbarButton
              icon={<Quote className="w-4 h-4" />}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive('blockquote')}
              tooltip="Blockquote"
            />

            <Divider />

            <ToolbarButton
              icon={<Link2 className="w-4 h-4" />}
              onClick={handleInsertLink}
              isActive={editor.isActive('link')}
              tooltip="Link (Ctrl+K)"
            />

            <Divider />

            <ToolbarButton
              icon={<Undo2 className="w-4 h-4" />}
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              tooltip="Undo"
            />
            <ToolbarButton
              icon={<Redo2 className="w-4 h-4" />}
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              tooltip="Redo"
            />
          </>
        )}

        <div className="flex-1" />

        {/* Extra toolbar buttons (import/export) */}
        {toolbarExtra}

        {/* Outline toggle */}
        {headings.length > 0 && (
          <ToolbarButton
            icon={<ListTree className="w-4 h-4" />}
            onClick={() => setShowOutline(!showOutline)}
            isActive={showOutline}
            tooltip="Document Outline"
          />
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

      {/* Editor + Outline */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Editor content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">
            <EditorContent editor={editor} />
          </div>
        </div>

        {/* Document outline */}
        {showOutline && headings.length > 0 && (
          <div className="w-56 border-l border-border-default bg-bg-secondary overflow-y-auto p-3 flex-shrink-0">
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
              Contents
            </h4>
            <nav className="space-y-0.5">
              {headings.map((heading) => (
                <button
                  key={heading.id}
                  onClick={() => scrollToHeading(heading.pos)}
                  className="text-xs text-left w-full px-2 py-1 rounded truncate transition-colors text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
                  style={{ paddingLeft: `${8 + (heading.level - 1) * 12}px` }}
                  title={heading.text}
                >
                  {heading.text}
                </button>
              ))}
            </nav>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="h-8 flex items-center gap-4 px-4 border-t border-border-default bg-bg-secondary flex-shrink-0">
        <span className="text-xs text-text-tertiary">{wordCount.toLocaleString()} words</span>
        <span className="text-xs text-text-tertiary">{readingTime} min read</span>
      </div>

      {/* Version History Panel */}
      {versionPanel}
    </div>
  )
}

function ToolbarButton({
  icon,
  onClick,
  isActive,
  disabled,
  tooltip,
}: {
  icon: React.ReactNode
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  tooltip: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={cn(
        'p-1.5 rounded transition-colors',
        isActive
          ? 'bg-accent-cyan/15 text-accent-cyan'
          : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
        disabled && 'opacity-30 cursor-not-allowed hover:bg-transparent'
      )}
    >
      {icon}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-5 bg-border-default mx-0.5" />
}
