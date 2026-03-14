'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

export interface RewriteSelectionRequest {
  selectedText: string;
  paragraphText: string;
  beforeText: string;
  afterText: string;
}

interface DashboardPostEditorProps {
  content: string;
  onChange: (nextContent: string) => void;
  onRewriteSelection?: (selection: RewriteSelectionRequest) => Promise<string | null>;
}

interface ActiveSelection extends RewriteSelectionRequest {
  from: number;
  to: number;
  tooltipX: number;
  tooltipY: number;
}

export default function DashboardPostEditor({
  content,
  onChange,
  onRewriteSelection,
}: DashboardPostEditorProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [activeSelection, setActiveSelection] = useState<ActiveSelection | null>(null);
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewriteError, setRewriteError] = useState('');
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'focus:outline-none',
        spellcheck: 'true',
      },
    },
    onUpdate: ({ editor: nextEditor }) => {
      onChange(nextEditor.getHTML());
    },
  });

  const clearSelection = useCallback(() => {
    setActiveSelection(null);
    setRewriteError('');
  }, []);

  const refreshSelection = useCallback(() => {
    if (!editor || !wrapperRef.current || !onRewriteSelection) {
      clearSelection();
      return;
    }

    const { state, view } = editor;
    const { selection, doc } = state;

    if (selection.empty || selection.from === selection.to || !editor.isFocused) {
      clearSelection();
      return;
    }

    const { $from, $to, from, to } = selection;
    if (!$from.sameParent($to) || !$from.parent.isTextblock) {
      clearSelection();
      return;
    }

    const selectedText = doc.textBetween(from, to, ' ').replace(/\s+/g, ' ').trim();
    if (!selectedText) {
      clearSelection();
      return;
    }

    const paragraphStart = from - $from.parentOffset;
    const paragraphEnd = paragraphStart + $from.parent.content.size;
    const paragraphText = doc.textBetween(paragraphStart, paragraphEnd, ' ').replace(/\s+/g, ' ').trim();
    const beforeText = doc.textBetween(paragraphStart, from, ' ').replace(/\s+/g, ' ').trim();
    const afterText = doc.textBetween(to, paragraphEnd, ' ').replace(/\s+/g, ' ').trim();

    const startCoords = view.coordsAtPos(from);
    const endCoords = view.coordsAtPos(to);
    const wrapperRect = wrapperRef.current.getBoundingClientRect();
    const centerX = ((startCoords.left + endCoords.right) / 2) - wrapperRect.left;
    const topY = startCoords.top - wrapperRect.top - 10;

    setActiveSelection({
      from,
      to,
      selectedText,
      paragraphText,
      beforeText,
      afterText,
      tooltipX: Math.max(24, Math.min(centerX, wrapperRect.width - 24)),
      tooltipY: Math.max(0, topY),
    });
    setRewriteError('');
  }, [clearSelection, editor, onRewriteSelection]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    if (editor.getHTML() !== content) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const handleSelectionChange = () => {
      refreshSelection();
    };

    const handleBlur = () => {
      window.setTimeout(() => {
        if (!editor.isFocused) {
          clearSelection();
        }
      }, 0);
    };

    editor.on('selectionUpdate', handleSelectionChange);
    editor.on('transaction', handleSelectionChange);
    editor.on('focus', handleSelectionChange);
    editor.on('blur', handleBlur);

    return () => {
      editor.off('selectionUpdate', handleSelectionChange);
      editor.off('transaction', handleSelectionChange);
      editor.off('focus', handleSelectionChange);
      editor.off('blur', handleBlur);
    };
  }, [clearSelection, editor, refreshSelection]);

  async function handleRewrite() {
    if (!editor || !activeSelection || !onRewriteSelection || isRewriting) {
      return;
    }

    setIsRewriting(true);
    setRewriteError('');

    try {
      const replacement = await onRewriteSelection({
        selectedText: activeSelection.selectedText,
        paragraphText: activeSelection.paragraphText,
        beforeText: activeSelection.beforeText,
        afterText: activeSelection.afterText,
      });

      if (!replacement?.trim()) {
        setRewriteError('Try again');
        return;
      }

      editor
        .chain()
        .focus()
        .insertContentAt({ from: activeSelection.from, to: activeSelection.to }, replacement.trim())
        .run();

      clearSelection();
    } catch (error) {
      console.error('Failed to rewrite selected text:', error);
      setRewriteError('Try again');
    } finally {
      setIsRewriting(false);
    }
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <EditorContent editor={editor} />
      {activeSelection && onRewriteSelection ? (
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            void handleRewrite();
          }}
          disabled={isRewriting}
          style={{
            position: 'absolute',
            left: activeSelection.tooltipX,
            top: activeSelection.tooltipY,
            transform: 'translate(-50%, -100%)',
            zIndex: 3,
            appearance: 'none',
            border: '1px solid rgba(6, 61, 82, 0.16)',
            borderRadius: '999px',
            background: '#fff',
            boxShadow: '0 12px 28px rgba(3, 28, 37, 0.14)',
            color: rewriteError ? '#b43f29' : '#063d52',
            cursor: isRewriting ? 'progress' : 'pointer',
            fontSize: '12px',
            fontWeight: 600,
            lineHeight: 1,
            padding: '8px 12px',
            whiteSpace: 'nowrap',
          }}
        >
          {isRewriting ? 'Rewriting...' : rewriteError || 'Rewrite'}
        </button>
      ) : null}
    </div>
  );
}
