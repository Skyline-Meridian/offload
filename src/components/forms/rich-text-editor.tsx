'use client'

import Link from '@tiptap/extension-link'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Bold, Italic, Link as LinkIcon, List, ListOrdered } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'

type Props = {
  /** The form field that receives the HTML. */
  name: string
  label: string
  defaultValue?: string
  errors?: readonly string[]
  hint?: string
}

/** Bold, italic, lists and links. The server cleans the HTML again on save, so this is a convenience, not the safety net. */
export function RichTextEditor({ name, label, defaultValue = '', errors, hint }: Props): React.JSX.Element {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: false, code: false, codeBlock: false, blockquote: false, horizontalRule: false, strike: false }),
      Link.configure({ openOnClick: false, autolink: true, protocols: ['mailto'] }),
    ],
    content: defaultValue,
    editorProps: { attributes: { 'aria-labelledby': `${name}-label`, role: 'textbox', 'aria-multiline': 'true', class: 'rich-text text-body min-h-menu p-sm focus:outline-none' } },
  })

  const html = editor?.getHTML() ?? defaultValue
  const toggleLink = (): void => {
    if (!editor) return
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run()
      return
    }
    const url = window.prompt('Link address (https://…)')
    if (url) editor.chain().focus().setLink({ href: url }).run()
  }

  return (
    <div className="flex flex-col gap-2xs">
      <span id={`${name}-label`} className="text-label">
        {label}
      </span>
      <input type="hidden" name={name} value={editor?.isEmpty ? '' : html} />
      <div className="bg-surface border-thin border-border">
        <div className="border-border flex gap-2xs border-b p-2xs" role="toolbar" aria-label="Formatting">
          <Button variant="ghost" size="sm" aria-label="Bold" onPress={() => editor?.chain().focus().toggleBold().run()}>
            <Icon icon={Bold} size="sm" />
          </Button>
          <Button variant="ghost" size="sm" aria-label="Italic" onPress={() => editor?.chain().focus().toggleItalic().run()}>
            <Icon icon={Italic} size="sm" />
          </Button>
          <Button variant="ghost" size="sm" aria-label="Bulleted list" onPress={() => editor?.chain().focus().toggleBulletList().run()}>
            <Icon icon={List} size="sm" />
          </Button>
          <Button variant="ghost" size="sm" aria-label="Numbered list" onPress={() => editor?.chain().focus().toggleOrderedList().run()}>
            <Icon icon={ListOrdered} size="sm" />
          </Button>
          <Button variant="ghost" size="sm" aria-label="Link" onPress={toggleLink}>
            <Icon icon={LinkIcon} size="sm" />
          </Button>
        </div>
        <EditorContent editor={editor} />
      </div>
      {hint ? <p className="text-hint">{hint}</p> : null}
      {errors?.length ? <p className="text-body text-error">{errors.join(' ')}</p> : null}
    </div>
  )
}
