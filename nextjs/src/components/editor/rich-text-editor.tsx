"use client"

import { useEffect, useRef, useState } from "react"
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
import { 
  $getRoot, 
  $createParagraphNode, 
  $isElementNode,
  $isDecoratorNode,
  $isTextNode,
  LexicalNode 
} from "lexical"
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
  const previousContent = useRef<string>("")
  
  useEffect(() => {
    // Only update if content actually changed
    if (previousContent.current !== content) {
      previousContent.current = content
      
      editor.update(() => {
        const root = $getRoot()
        root.clear()
        
        if (content && content.trim() !== "") {
          try {
            const parser = new DOMParser()
            const dom = parser.parseFromString(content, "text/html")
            const nodes = $generateNodesFromDOM(editor, dom)
            
            // Process nodes to ensure they can be added to root
            const nodesToAdd: LexicalNode[] = []
            
            nodes.forEach(node => {
              if (!node) return
              
              // Only element nodes and decorator nodes can be added to root
              if ($isElementNode(node) || $isDecoratorNode(node)) {
                nodesToAdd.push(node)
              } else if ($isTextNode(node)) {
                // If it's a text node, wrap it in a paragraph
                const paragraph = $createParagraphNode()
                paragraph.append(node)
                nodesToAdd.push(paragraph)
              }
              // Skip any other node types
            })
            
            if (nodesToAdd.length > 0) {
              nodesToAdd.forEach(node => {
                root.append(node)
              })
            } else {
              // If no valid nodes, add an empty paragraph
              root.append($createParagraphNode())
            }
          } catch (error) {
            console.error("Error parsing content:", error)
            // On error, just add an empty paragraph
            root.append($createParagraphNode())
          }
        } else {
          // If no content, add an empty paragraph
          root.append($createParagraphNode())
        }
      })
    }
  }, [content, editor])
  
  return null
}

function EditorContent({ value, onChange, placeholder }: Pick<RichTextEditorProps, 'value' | 'onChange' | 'placeholder'>) {
  const [editor] = useLexicalComposerContext()
  const isUpdatingFromOutside = useRef(false)

  useEffect(() => {
    const unregister = editor.registerUpdateListener(({ editorState, dirtyElements, dirtyLeaves, prevEditorState, tags }) => {
      // Skip updates that are from setting initial content
      if (tags.has('history-skip')) return
      if (isUpdatingFromOutside.current) {
        isUpdatingFromOutside.current = false
        return
      }
      
      editorState.read(() => {
        const html = $generateHtmlFromNodes(editor)
        onChange?.(html)
      })
    })

    return () => {
      unregister()
    }
  }, [editor, onChange])

  // Mark when we're updating from outside
  useEffect(() => {
    isUpdatingFromOutside.current = true
  }, [value])

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
  // Create a unique key for each tab's content
  const contentKey = useRef(value)
  const [editorKey, setEditorKey] = useState(() => Math.random().toString(36))

  useEffect(() => {
    // Only reset editor if we're switching to completely different content
    // This helps when switching tabs
    if (contentKey.current !== value && 
        (contentKey.current === "" || value === "" || 
         Math.abs(contentKey.current.length - value.length) > 100)) {
      contentKey.current = value
      setEditorKey(Math.random().toString(36))
    }
  }, [value])

  const initialConfig: InitialConfigType = {
    namespace: "RichTextEditor",
    theme: editorTheme,
    onError: (error: Error) => {
      console.error("Lexical error:", error)
    },
    nodes: [
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      CodeNode,
      LinkNode,
    ],
    editorState: null, // Let the editor initialize empty
  }

  return (
    <div className={className}>
      <LexicalComposer key={editorKey} initialConfig={initialConfig}>
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