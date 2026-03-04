'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import { useCallback, useEffect } from 'react';

interface WritualEditorProps {
  onUpdate: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function WritualEditor({
  onUpdate,
  disabled = false,
  placeholder = 'Start writing...',
}: WritualEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: {},
        orderedList: {},
        blockquote: {},
        horizontalRule: {},
        bold: {},
        italic: {},
        // Disable things we don't need
        code: false,
        codeBlock: false,
        strike: false,
      }),
      Placeholder.configure({ placeholder }),
      Typography,
    ],
    editorProps: {
      attributes: {
        class: 'writual-tiptap-editor',
      },
    },
    onUpdate: ({ editor }) => {
      // Export as markdown-like plain text for storage/copy
      onUpdate(editorToMarkdown(editor));
    },
    editable: !disabled,
  });

  // Sync disabled state
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [editor, disabled]);

  return <EditorContent editor={editor} />;
}

/**
 * Convert TipTap editor JSON to plain markdown text.
 * This keeps the stored content portable and exportable.
 * We use a loose JSONNode type because TipTap's strict types
 * don't expose .content on all node variants.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JSONNode = { type?: string; text?: string; marks?: { type: string }[]; content?: JSONNode[]; attrs?: Record<string, any> };

function editorToMarkdown(editor: ReturnType<typeof useEditor>): string {
  if (!editor) return '';

  const doc = editor.getJSON() as JSONNode;
  if (!doc.content) return '';

  const lines: string[] = [];

  for (const node of doc.content) {
    switch (node.type) {
      case 'heading': {
        const level = node.attrs?.level ?? 1;
        const prefix = '#'.repeat(level as number);
        lines.push(`${prefix} ${inlineToMarkdown(node.content)}`);
        break;
      }
      case 'paragraph':
        lines.push(inlineToMarkdown(node.content));
        break;
      case 'bulletList':
        if (node.content) {
          for (const item of node.content) {
            lines.push(`- ${inlineToMarkdown(item.content?.[0]?.content)}`);
          }
        }
        break;
      case 'orderedList':
        if (node.content) {
          node.content.forEach((item, i) => {
            lines.push(`${i + 1}. ${inlineToMarkdown(item.content?.[0]?.content)}`);
          });
        }
        break;
      case 'blockquote':
        if (node.content) {
          for (const child of node.content) {
            lines.push(`> ${inlineToMarkdown(child.content)}`);
          }
        }
        break;
      case 'horizontalRule':
        lines.push('---');
        break;
      default:
        lines.push(inlineToMarkdown(node.content));
    }
  }

  return lines.join('\n');
}

function inlineToMarkdown(content?: JSONNode[]): string {
  if (!content) return '';

  return content
    .map((node) => {
      let text = node.text ?? '';
      if (node.marks) {
        for (const mark of node.marks) {
          if (mark.type === 'bold') text = `**${text}**`;
          if (mark.type === 'italic') text = `*${text}*`;
        }
      }
      return text;
    })
    .join('');
}

/**
 * Hook to get the plain text (no markdown) for word counting.
 */
export function getPlainText(editor: ReturnType<typeof useEditor>): string {
  if (!editor) return '';
  return editor.getText();
}
