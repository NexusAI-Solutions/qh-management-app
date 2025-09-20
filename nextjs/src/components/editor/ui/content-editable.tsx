import { ContentEditable as LexicalContentEditable } from "@lexical/react/LexicalContentEditable"
import { cn } from "@/lib/utils"
import { forwardRef } from "react"

interface ContentEditableProps {
  className?: string
  placeholder?: string
  placeholderClassName?: string
}

export const ContentEditable = forwardRef<HTMLDivElement, ContentEditableProps>(
  ({ className, placeholder = "Start typing...", placeholderClassName }, ref) => {
    return (
      <LexicalContentEditable
        ref={ref}
        className={cn(
          "min-h-[200px] resize-none px-3 py-2 text-sm outline-none font-sans",
          className
        )}
        aria-placeholder={placeholder}
        placeholder={
          <div className={cn(
            "pointer-events-none absolute top-2 left-3 text-muted-foreground font-sans",
            placeholderClassName
          )}>
            {placeholder}
          </div>
        }
      />
    )
  }
)

ContentEditable.displayName = "ContentEditable"