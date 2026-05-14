"use client";

import { useEffect, useImperativeHandle, forwardRef } from 'react';
// 1. ADDED: Mark and mergeAttributes imported here
import { useEditor, EditorContent, Extension, Mark, mergeAttributes } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { TextStyle } from '@tiptap/extension-text-style';
import { Bold, Italic, List } from 'lucide-react';

// Custom Font Size Extension
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() { return { types: ['textStyle'] }; },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontSize: {
          default: null,
          parseHTML: element => element.style.fontSize || null,
          renderHTML: attributes => {
            if (!attributes.fontSize) return {};
            return { style: `font-size: ${attributes.fontSize}` };
          },
        },
      },
    }];
  },
  addCommands() {
    return {
      setFontSize: (fontSize: string) => ({ chain }: any) => {
        return chain().setMark('textStyle', { fontSize }).run();
      },
    } as any;
  },
});

// --- 2. NEW: THE HIGHLIGHT EXTENSION ---
// This prevents TipTap from deleting our yellow highlights!
const HighlightMark = Mark.create({
  name: 'highlightMark',
  parseHTML() {
    return [{ tag: 'mark[data-highlight="true"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['mark', mergeAttributes(HTMLAttributes, { style: 'background-color: #fef08a; border-radius: 3px;' }), 0];
  },
});
// ----------------------------------------

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) return null;
  return (
    <div className="flex gap-2 p-3 mb-4 border-b border-gray-200 bg-gray-50 rounded-t-xl items-center sticky top-0 z-10 print:hidden">
      <select
        onChange={(e) => editor.chain().focus().setFontSize(e.target.value).run()}
        value={editor.getAttributes('textStyle').fontSize || '12pt'}
        className="p-1.5 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium"
      >
        {["9pt", "10pt", "11pt", "12pt", "14pt", "16pt", "18pt", "20pt", "24pt"].map(size => (
          <option key={size} value={size}>{size.replace('pt', '')}</option>
        ))}
      </select>
      <div className="w-[1px] h-6 bg-gray-300 mx-2 self-center"></div>
      <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-2 rounded-lg transition ${editor.isActive('bold') ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-600 hover:bg-gray-200'}`}><Bold size={18} /></button>
      <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-2 rounded-lg transition ${editor.isActive('italic') ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'}`}><Italic size={18} /></button>
      <div className="w-[1px] h-6 bg-gray-300 mx-2 self-center"></div>
      <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-2 rounded-lg transition ${editor.isActive('bulletList') ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'}`}><List size={18} /></button>
      <div className="w-[1px] h-6 bg-gray-300 mx-2 self-center"></div>
      <button onClick={() => editor.chain().focus().insertContent(' • ').run()} className="px-3 py-1 flex items-center justify-center rounded-lg transition text-gray-600 hover:bg-gray-200 font-black text-xl leading-none pb-2">•</button>
    </div>
  );
};

const ResumeEditor = forwardRef(({ value, onChange }: { value: string; onChange: (text: string) => void }, ref) => {
  const editor = useEditor({
    // 3. ADDED: HighlightMark included in the extensions list
    extensions: [StarterKit, TextStyle, FontSize, HighlightMark, Placeholder.configure({ placeholder: 'Upload your resume to begin...' })],
    content: value,
    editorProps: { attributes: { class: 'focus:outline-none min-h-[700px] px-8 pb-8 print:min-h-0 print:px-0 print:pb-0 text-gray-800 text-[12pt] leading-relaxed transition-all duration-200' } },
    onUpdate: ({ editor }) => { onChange(editor.getHTML()); },
  });

  useImperativeHandle(ref, () => ({
    clearHighlight: () => {
      if (!editor) return;
      let currentHtml = editor.getHTML();
      if (currentHtml.includes('data-highlight="true"')) {
        // Updated to remove the <mark> tag instead of span
        const clearedHtml = currentHtml.replace(/<mark data-highlight="true"[^>]*>(.*?)<\/mark>/gi, '$1');
        editor.commands.setContent(clearedHtml); 
      }
    },

    highlightText: (oldText: string) => {
      if (!editor) return;
      let cleanOldText = oldText.replace(/^[\s•\-\*]+/, '').trim();
      cleanOldText = cleanOldText.replace(/^["']|["']$/g, '').trim();

      const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const words = cleanOldText.split(/\s+/).filter(w => w.length > 0).map(escapeRegExp);
      if (words.length === 0) return;

      const flexibleGap = '(?:<[^>]+>|\\s|&nbsp;)*';
      const corePattern = words.join(flexibleGap);
      const findRegex = new RegExp(`(${corePattern})`, 'i');

      let currentHtml = editor.getHTML();
      // Clean existing marks first
      currentHtml = currentHtml.replace(/<mark data-highlight="true"[^>]*>(.*?)<\/mark>/gi, '$1');

      if (findRegex.test(currentHtml)) {
         // Updated to use our new <mark> tag
         const updatedHtml = currentHtml.replace(findRegex, `<mark data-highlight="true">$1</mark>`);
         editor.commands.setContent(updatedHtml); 
      }
    },

    replaceText: (oldText: string, newText: string) => {
      if (!editor) return;
      let currentHtml = editor.getHTML();

      // Clear marks before replacing
      currentHtml = currentHtml.replace(/<mark data-highlight="true"[^>]*>(.*?)<\/mark>/gi, '$1');

      let finalNewText = String(newText);
      const splitKeys = ['**Suggested Rewrite:**', 'Suggested Rewrite:', '**Rewrite:**', 'Rewrite:'];
      for (const key of splitKeys) {
        if (finalNewText.includes(key)) {
           finalNewText = finalNewText.split(key).pop() || finalNewText;
           break;
        }
      }
      finalNewText = finalNewText.replace(/\*\*/g, '').trim();
      let cleanNewText = finalNewText.replace(/^[\s•\-\*]+/, '').trim(); 

      let cleanOldText = oldText.replace(/^[\s•\-\*]+/, '').trim();
      cleanOldText = cleanOldText.replace(/^["']|["']$/g, '').trim();

      const isBullet = oldText.trim().startsWith('•') || oldText.trim().startsWith('-');
      // Keep replacement looking professional and matching the rest of the text
      const replacementString = isBullet ? `• ${cleanNewText}` : cleanNewText;

      const applyUpdate = (newHtml: string) => {
        editor.commands.setContent(newHtml);
        setTimeout(() => onChange(editor.getHTML()), 0); 
      };

      const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const words = cleanOldText.split(/\s+/).filter(w => w.length > 0).map(escapeRegExp);
      if (words.length === 0) return;

      const flexibleGap = '(?:<[^>]+>|\\s|&nbsp;)*';
      const corePattern = words.join(flexibleGap);
      const fullPattern = `(?:[•\\-\\*]${flexibleGap})?(${corePattern})`;
      const findRegex = new RegExp(fullPattern, 'i');

      if (findRegex.test(currentHtml)) {
         const updatedHtml = currentHtml.replace(findRegex, replacementString);
         applyUpdate(updatedHtml);
      } else {
         alert("Could not automatically locate this exact sentence in the editor. You may need to paste it manually.");
      }
    }
  }));

  // Initial Formatting Effect
  useEffect(() => {
    if (!editor || !value || value.includes('<p>')) return;
    const formatted = value.split('\n').map((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return '<p><br></p>';
      let formattedLine = trimmed;
      let isMajorSection = false;
      const headerMatch = trimmed.match(/^([A-Z][A-Z\s&/]{5,}[A-Z])(?:\s+|$|\:)(.*)/);
      if (headerMatch) {
        const headerPart = headerMatch[1];
        const restPart = headerMatch[2] || '';
        if (headerPart === headerPart.toUpperCase()) {
          formattedLine = `<strong>${headerPart}</strong> ${restPart}`.trim();
          isMajorSection = true;
        }
      } else if (trimmed.includes('|') && !trimmed.includes('@')) {
        formattedLine = `<strong>${trimmed}</strong>`;
        isMajorSection = true; 
      }
      if (formattedLine.startsWith('•') || formattedLine.startsWith('-')) return `<p style="padding-left: 1.5rem;">${formattedLine}</p>`;
      if (isMajorSection && index !== 0) return `<p><br></p><p>${formattedLine}</p>`;
      return `<p>${formattedLine}</p>`;
    }).join('');
    editor.commands.setContent(formatted);
  }, [value, editor]);

  return (
    <div className="w-full h-full flex flex-col">
      <MenuBar editor={editor} />
      <div className="flex-1 cursor-text overflow-y-auto" onClick={() => editor?.commands.focus()}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
});

ResumeEditor.displayName = "ResumeEditor";
export default ResumeEditor;