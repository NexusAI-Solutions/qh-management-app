"use client"

import { useEffect, useRef } from "react"
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html"
import { InitialConfigType, LexicalComposer } from "@lexical/react/LexicalComposer"
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin"
import { ContentEditable } from "./ui/content-editable"
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { ListPlugin } from "@lexical/react/LexicalListPlugin"
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin"
import { ToolbarPlugin } from "./plugins/toolbar-plugin"
import { HeadingNode, QuoteNode } from "@lexical/rich-text"
import { ListItemNode, ListNode } from "@lexical/list"
import { CodeNode } from "@lexical/code"
import { LinkNode } from "@lexical/link"
import { $getRoot } from "lexical"
import { editorTheme } from "./themes/editor-theme"
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary"

interface RichTextEditorProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
}

function SetInitialContent({ content }: { content: string }) {
  const [editor] = useLexicalComposerContext()
  const isFirstRender = useRef(true)
  
  useEffect(() => {
    if (isFirstRender.current && content) {
      isFirstRender.current = false
      editor.update(() => {
        const parser = new DOMParser()
        const dom = parser.parseFromString(content, "text/html")
        const nodes = $generateNodesFromDOM(editor, dom)
        const root = $getRoot()
        root.clear()
        root.append(...nodes)
      })
    }
  }, [content, editor])
  
  return null
}

function EditorContent({ value, onChange, placeholder }: Pick<RichTextEditorProps, 'value' | 'onChange' | 'placeholder'>) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const html = $generateHtmlFromNodes(editor)
        onChange?.(html)
      })
    })
  }, [editor, onChange])

  return (
    <>
      <ToolbarPlugin />
      <div className="relative">
        <RichTextPlugin
          contentEditable={
            <ContentEditable 
              className="min-h-[200px] px-3 py-2" 
              placeholder={placeholder}
            />
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <ListPlugin />
        <LinkPlugin />
        <SetInitialContent content={value || ''} />
      </div>
    </>
  )
}

export function RichTextEditor({
  value = "",
  onChange,
  placeholder = "Text toevoegen...",
  className,
}: RichTextEditorProps) {
  const initialConfig: InitialConfigType = {
    namespace: "RichTextEditor",
    theme: editorTheme,
    onError: (error: Error) => {
      console.error(error)
    },
    nodes: [
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      CodeNode,
      LinkNode,
    ],
  }

  return (
    <div className={className}>
      <LexicalComposer initialConfig={initialConfig}>
        <div className="border rounded-lg overflow-hidden">
          <EditorContent 
            value={value}
            onChange={onChange}
            placeholder={placeholder}
          />
        </div>
      </LexicalComposer>
    </div>
  )
}