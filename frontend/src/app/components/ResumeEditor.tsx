"use client";

import { useEffect } from 'react';
import { useEditor, EditorContent, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { TextStyle } from '@tiptap/extension-text-style';
import { Bold, Italic, List } from 'lucide-react';

// --- NEW: Custom TipTap Extension for Font Sizing ---
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return { types: ['textStyle'] };
  },
  addGlobalAttributes() {
    return [
      {
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
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: (fontSize: string) => ({ chain }: any) => {
        return chain().setMark('textStyle', { fontSize }).run();
      },
      unsetFontSize: () => ({ chain }: any) => {
        return chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run();
      },
    } as any;
  },
});

// --- THE UPDATED TOOLBAR ---
const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) return null;

  return (
    <div className="flex gap-2 p-3 mb-4 border-b border-gray-200 bg-gray-50 rounded-t-xl items-center">
      
      {/* NEW: Font Size Dropdown */}
      <select
        onChange={(e) => editor.chain().focus().setFontSize(e.target.value).run()}
        value={editor.getAttributes('textStyle').fontSize || '12pt'}
        className="p-1.5 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium"
        title="Font Size"
      >
        <option value="9pt">9</option>
        <option value="10pt">10</option>
        <option value="11pt">11</option>
        <option value="12pt">12 (Default)</option>
        <option value="14pt">14</option>
        <option value="16pt">16</option>
        <option value="18pt">18</option>
        <option value="20pt">20</option>
        <option value="24pt">24</option>
      </select>

      <div className="w-[1px] h-6 bg-gray-300 mx-2 self-center"></div>

      {/* Standard Formatting Buttons */}
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-2 rounded-lg transition ${
          editor.isActive('bold') ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-600 hover:bg-gray-200'
        }`}
        title="Bold"
      >
        <Bold size={18} />
      </button>
      
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-2 rounded-lg transition ${
          editor.isActive('italic') ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'
        }`}
        title="Italic"
      >
        <Italic size={18} />
      </button>

      <div className="w-[1px] h-6 bg-gray-300 mx-2 self-center"></div>

      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-2 rounded-lg transition ${
          editor.isActive('bulletList') ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'
        }`}
        title="Create Bulleted List"
      >
        <List size={18} />
      </button>

      <div className="w-[1px] h-6 bg-gray-300 mx-2 self-center"></div>

      <button
        onClick={() => editor.chain().focus().insertContent(' • ').run()}
        className="px-3 py-1 flex items-center justify-center rounded-lg transition text-gray-600 hover:bg-gray-200 font-black text-xl leading-none pb-2"
        title="Insert Inline Dot Separator"
      >
        •
      </button>
    </div>
  );
};

// --- THE MAIN EDITOR COMPONENT ---
export default function ResumeEditor({ 
  value, 
  onChange 
}: { 
  value: string; 
  onChange: (text: string) => void 
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle, // Activated the Text Style library
      FontSize,  // Activated our custom Font Size extension
      Placeholder.configure({
        placeholder: 'Start typing your resume here, or upload a PDF...',
        emptyEditorClass: 'text-gray-400 cursor-text',
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        // I changed text-base to text-[12pt] so the default size matches standard resumes
        class: 'focus:outline-none min-h-[600px] px-8 pb-8 text-gray-800 text-[12pt] leading-relaxed',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML()); 
    },
  });

  useEffect(() => {
    if (!editor) return;

    const formattedContent = value.includes('<p>') 
      ? value 
      : value.split('\n').map((line, index) => {
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
          } 
          else if (trimmed.includes('|') && !trimmed.includes('@')) {
            formattedLine = `<strong>${trimmed}</strong>`;
            isMajorSection = true; 
          }

          if (formattedLine.startsWith('•') || formattedLine.startsWith('-')) {
            return `<p style="padding-left: 1.5rem;">${formattedLine}</p>`;
          }

          if (isMajorSection && index !== 0) {
            return `<p><br></p><p>${formattedLine}</p>`;
          }

          return `<p>${formattedLine}</p>`;
        }).join('');

    if (editor.getHTML() !== formattedContent) {
      editor.commands.setContent(formattedContent);
    }
  }, [value, editor]);

  return (
    <div className="w-full h-full flex flex-col">
      <MenuBar editor={editor} />
      <div 
        className="flex-1 cursor-text overflow-y-auto" 
        onClick={() => editor?.commands.focus()}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}