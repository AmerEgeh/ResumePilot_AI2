"use client";

import { useEffect, useImperativeHandle, forwardRef } from 'react';
import { useEditor, EditorContent, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { TextStyle } from '@tiptap/extension-text-style';
import { Bold, Italic, List } from 'lucide-react';

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

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) return null;
  return (
    <div className="flex gap-2 p-3 mb-4 border-b border-gray-200 bg-gray-50 rounded-t-xl items-center sticky top-0 z-10">
      <select
        onChange={(e) => editor.chain().focus().setFontSize(e.target.value).run()}
        value={editor.getAttributes('textStyle').fontSize || '12pt'}
        className="p-1.5 border border-gray-300 rounded-md text-sm text-gray-700 bg-white cursor-pointer font-medium"
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
      <button onClick={() => editor.chain().focus().insertContent(' • ').run()} className="px-3 py-1 font-black text-xl hover:bg-gray-200 rounded pb-2">•</button>
    </div>
  );
};

const ResumeEditor = forwardRef(({ value, onChange }: { value: string; onChange: (text: string) => void }, ref) => {
  const editor = useEditor({
    extensions: [StarterKit, TextStyle, FontSize, Placeholder.configure({ placeholder: 'Upload your resume to begin...' })],
    content: value,
    editorProps: { attributes: { class: 'focus:outline-none min-h-[700px] px-8 pb-8 text-gray-800 text-[12pt] leading-relaxed' } },
    onUpdate: ({ editor }) => { onChange(editor.getHTML()); },
  });

  useImperativeHandle(ref, () => ({
    replaceText: (oldText: string, newText: string) => {
      if (!editor) return;
      const content = editor.getHTML();
      const updated = content.replace(oldText, `<strong>${newText}</strong>`);
      editor.commands.setContent(updated);
    }
  }));

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