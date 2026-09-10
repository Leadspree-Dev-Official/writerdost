"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TiptapImage from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { Extension } from '@tiptap/core';
import { TextStyle, FontSize, FontFamily } from '@tiptap/extension-text-style';
import { FONTS_BY_CATEGORY, FONT_OPTIONS } from "@/lib/fonts";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import clsx from "clsx";

const aiSelectionKey = new PluginKey("aiSelection");

const AiSelectionHandler = Extension.create({
  name: 'aiSelectionHandler',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: aiSelectionKey,
        state: {
          init() { return DecorationSet.empty; },
          apply(tr, old) {
            const action = tr.getMeta(aiSelectionKey);
            if (action && action.type === "SET") {
              const dec = Decoration.inline(action.from, action.to, { class: "bg-primary/30 dark:bg-primary/40 rounded-[2px]" });
              return DecorationSet.create(tr.doc, [dec]);
            }
            if (action && action.type === "CLEAR") {
              return DecorationSet.empty;
            }
            return old.map(tr.mapping, tr.doc);
          }
        },
        props: {
          decorations(state) {
            return this.getState(state);
          }
        }
      })
    ];
  }
});

type EditorProps = {
  content?: string;
  onChange?: (content: string) => void;
  onAiAssist?: (instruction: string, selection: string, mode: "edit" | "expand", targetWords: number, insertReplacement?: (html: string) => void) => void;
  aiAssistLoading?: boolean;
};

export default function Editor({ 
  content, 
  onChange, 
  onAiAssist, 
  aiAssistLoading = false,
}: EditorProps) {
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const selectedImageRef = useRef<HTMLImageElement | null>(null);
  const [isImageSelected, setIsImageSelected] = useState(false);
  const [showAiCommand, setShowAiCommand] = useState(false);
  const [aiMenuAnchor, setAiMenuAnchor] = useState<"top" | "bubble">("top");
  const [aiMode, setAiMode] = useState<"edit" | "expand">("edit");
  const [targetWords, setTargetWords] = useState(500);
  const [aiInstruction, setAiInstruction] = useState("");
  const [savedSelection, setSavedSelection] = useState<{from: number, to: number, text: string} | null>(null);
  const aiInputRef = useRef<HTMLInputElement | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      AiSelectionHandler,
      TextStyle,
      FontSize,
      FontFamily,
      TiptapImage.configure({
        inline: false,
        allowBase64: true,
      }),
      Placeholder.configure({
        placeholder: "Type '/' for commands or 'AI' to generate thoughts...",
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    editorProps: {
      handlePaste: (view, event) => {
        const text = event.clipboardData?.getData('text/plain');
        if (text && text.includes('$')) {
          // Quick conversion for pasted LaTeX symbols
          const converted = text
            .replace(/\$\\rightarrow\$/g, "→")
            .replace(/\$\\leftarrow\$/g, "←")
            .replace(/\$\\leftrightarrow\$/g, "↔")
            .replace(/\$\\alpha\$/g, "α")
            .replace(/\$\\beta\$/g, "β")
            .replace(/\$\\gamma\$/g, "γ")
            .replace(/\$\\delta\$/g, "δ")
            .replace(/\$\\sum\$/g, "∑")
            .replace(/\$\\prod\$/g, "∏")
            .replace(/\$\\infty\$/g, "∞")
            .replace(/\$\\approx\$/g, "≈")
            .replace(/\$\\neq\$/g, "≠")
            .replace(/\$\\le\$/g, "≤")
            .replace(/\$\\ge\$/g, "≥")
            .replace(/\$\\pm\$/g, "±")
            .replace(/\$\\times\$/g, "×")
            .replace(/\$\\div\$/g, "÷");
          
          if (converted !== text) {
            view.dispatch(view.state.tr.insertText(converted));
            return true;
          }
        }
        return false;
      },
      attributes: {
        class: "prose prose-indigo dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 focus:outline-none min-h-[500px] prose-headings:text-slate-900 dark:prose-headings:text-white prose-headings:font-black prose-p:mb-4 prose-headings:mt-6 prose-headings:mb-3 px-4",
      },
    },
    content,
    onUpdate: ({ editor: activeEditor }) => {
      onChange?.(activeEditor.getHTML());
    },
    immediatelyRender: false,
  });

  /**
   * The font id currently under the cursor or selection. TipTap stores the
   * resolved CSS stack, so match on that rather than on the label.
   */
  const activeFontId = (() => {
    const stack = editor?.getAttributes("textStyle").fontFamily;
    if (!stack) return "default";
    return FONT_OPTIONS.find((font) => font.stack === stack)?.id ?? "default";
  })();

  const applyFont = (id: string) => {
    if (!editor) return;
    if (id === "default") {
      editor.chain().focus().unsetFontFamily().run();
      return;
    }
    const font = FONT_OPTIONS.find((f) => f.id === id);
    if (font) editor.chain().focus().setFontFamily(font.stack).run();
  };

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== content) {
      editor.commands.setContent(content ?? "", { emitUpdate: false });
    }
  }, [content, editor]);

  useEffect(() => {
    if (!showAiCommand && editor) {
      editor.view.dispatch(editor.state.tr.setMeta(aiSelectionKey, { type: "CLEAR" }));
    }
  }, [showAiCommand, editor]);

  useEffect(() => {
    if (!editor) return;

    const handleClick = ({ target }: MouseEvent) => {
      if (target instanceof HTMLImageElement && target.closest(".ProseMirror")) {
        selectedImageRef.current = target;
        setIsImageSelected(true);
        return;
      }

      selectedImageRef.current = null;
      setIsImageSelected(false);
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [editor]);

  const insertImage = (src: string, alt: string) => {
    if (!editor) return;

    editor
      .chain()
      .focus()
      .setImage({
        src,
        alt,
      })
      .run();
  };

  const handleInsertImage = () => {
    if (typeof window === "undefined") return;

    const useUpload = window.confirm(
      "Press OK to upload an image from your device.\nPress Cancel to insert an image from a URL.",
    );

    if (useUpload) {
      imageInputRef.current?.click();
      return;
    }

    const imageUrl = window.prompt("Enter image URL");
    if (!imageUrl) return;
    insertImage(imageUrl, "Inserted image");
  };

  const compressImage = (base64Str: string, maxWidth = 1200, maxHeight = 1200, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
    });
  };

  const handleImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editor) return;

    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === "string") {
        const optimizedImage = await compressImage(reader.result);
        insertImage(optimizedImage, file.name);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const updateSelectedImageStyle = (styles: Partial<Record<"width" | "marginLeft" | "marginRight" | "display", string>>) => {
    const selectedImage = selectedImageRef.current;
    if (!selectedImage || !editor) return;

    if (styles.width !== undefined) selectedImage.style.width = styles.width;
    if (styles.marginLeft !== undefined) selectedImage.style.marginLeft = styles.marginLeft;
    if (styles.marginRight !== undefined) selectedImage.style.marginRight = styles.marginRight;
    if (styles.display !== undefined) selectedImage.style.display = styles.display;

    onChange?.(editor.getHTML());
  };

  const handleActivateAiCommand = (anchor: "top" | "bubble", mode?: "edit" | "expand") => {
    if (showAiCommand && aiMenuAnchor === anchor && (!mode || mode === aiMode)) {
      setShowAiCommand(false);
      setSavedSelection(null);
      return;
    }
    if (editor && editor.state.selection.from !== editor.state.selection.to) {
      setSavedSelection({
        from: editor.state.selection.from,
        to: editor.state.selection.to,
        text: editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, " ") || ""
      });
      editor.view.dispatch(editor.state.tr.setMeta(aiSelectionKey, { type: "SET", from: editor.state.selection.from, to: editor.state.selection.to }));
    }
    if (mode) setAiMode(mode);
    setAiMenuAnchor(anchor);
    setShowAiCommand(true);
    setTimeout(() => aiInputRef.current?.focus(), 100);
  };

  const renderAiCommandMenu = () => (
    <div className="bg-white dark:bg-[#141420] rounded-2xl shadow-2xl border border-primary/20 dark:border-white/[0.06] p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex gap-1 p-1 bg-surface-container-low rounded-lg">
          <button
            onClick={() => setAiMode("edit")}
            className={clsx(
              "px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md transition-all",
              aiMode === "edit" ? "bg-white dark:bg-white/[0.06] text-primary shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
            type="button"
          >
            Edit
          </button>
          <button
            onClick={() => setAiMode("expand")}
            className={clsx(
              "px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md transition-all",
              aiMode === "expand" ? "bg-white dark:bg-white/[0.06] text-primary shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
            type="button"
          >
            Expand
          </button>
        </div>
        {aiMode === "expand" && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Goal:</span>
            <input 
              type="number"
              value={targetWords}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setTargetWords(Math.min(1000, isNaN(val) ? 0 : val));
              }}
              className={clsx(
                "w-16 bg-surface-container-low border-none rounded px-2 py-1 text-xs font-bold text-center outline-none",
                targetWords >= 1000 ? "text-rose-500" : "text-primary"
              )}
            />
            <span className="text-[10px] font-bold text-slate-400 uppercase">Words</span>
          </div>
        )}
      </div>

      {targetWords >= 1000 && aiMode === "expand" && (
        <div className="text-[10px] font-bold text-rose-500 flex items-center gap-1 bg-rose-50 dark:bg-rose-900/20 p-2 rounded-lg">
          <span className="material-symbols-outlined text-xs">warning</span>
          Maximum 1,000 words per request for quality control.
        </div>
      )}

      <div className="flex gap-2 items-center">
        <input
          ref={aiInputRef}
          type="text"
          value={aiInstruction}
          onChange={(e) => setAiInstruction(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && aiInstruction.trim()) {
              const from = savedSelection?.from ?? editor?.state.selection.from ?? 0;
              const to = savedSelection?.to ?? editor?.state.selection.to ?? 0;
              const selection = (savedSelection?.text ?? editor?.state.doc.textBetween(from, to, " ")) || "";
              
              onAiAssist?.(aiInstruction, selection, aiMode, targetWords, (html) => {
                editor?.chain().focus().deleteRange({ from, to }).insertContentAt(from, html).run();
              });
              
              setAiInstruction("");
              setShowAiCommand(false);
              setSavedSelection(null);
            }
            if (e.key === "Escape") {
              setShowAiCommand(false);
              setSavedSelection(null);
            }
          }}
          placeholder={aiMode === "edit" ? "e.g. 'Make it punchier'" : "e.g. 'Explain the historical context'"}
          className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700 dark:text-slate-200"
        />
        <button
          onClick={() => {
            if (aiInstruction.trim()) {
              const from = savedSelection?.from ?? editor?.state.selection.from ?? 0;
              const to = savedSelection?.to ?? editor?.state.selection.to ?? 0;
              const selection = (savedSelection?.text ?? editor?.state.doc.textBetween(from, to, " ")) || "";
              
              onAiAssist?.(aiInstruction, selection, aiMode, targetWords, (html) => {
                editor?.chain().focus().deleteRange({ from, to }).insertContentAt(from, html).run();
              });
              
              setAiInstruction("");
              setShowAiCommand(false);
              setSavedSelection(null);
            }
          }}
          className="bg-primary hover:bg-primary-container text-white p-2 rounded-xl transition-colors"
          disabled={!aiInstruction.trim()}
          type="button"
        >
          <span className="material-symbols-outlined text-sm">send</span>
        </button>
      </div>
      <p className="text-[10px] text-slate-400 italic">
        {aiMode === "edit" 
          ? ((!editor || editor.state.selection.empty) ? "Updating current paragraph..." : "Replacing selected text...")
          : `Generating ~${targetWords} words of related context using full chapter as context.`}
      </p>
    </div>
  );

  return (
    <div className="relative">
      <input
        ref={imageInputRef}
        accept="image/*"
        className="hidden"
        type="file"
        onChange={handleImageFileChange}
      />
      <div className="sticky top-2 mb-6 z-30 flex justify-center no-print">
        <div className="bg-white/80 dark:bg-[#141420]/90 backdrop-blur-xl editorial-shadow rounded-2xl px-3 py-2 flex items-center space-x-1 border border-outline-variant/20 dark:border-white/[0.06]">
          <button
            onClick={() => editor?.chain().focus().toggleBold().run()}
            className={clsx(
              "p-2 rounded-lg transition-all",
              editor?.isActive("bold") ? "bg-surface-container dark:bg-slate-800 text-primary dark:text-indigo-400" : "text-slate-600 dark:text-slate-400 hover:bg-surface-container dark:hover:bg-slate-800",
            )}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">format_bold</span>
          </button>
          <button
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            className={clsx(
              "p-2 rounded-lg transition-all",
              editor?.isActive("italic") ? "bg-surface-container dark:bg-slate-800 text-primary dark:text-indigo-400" : "text-slate-600 dark:text-slate-400 hover:bg-surface-container dark:hover:bg-slate-800",
            )}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">format_italic</span>
          </button>
          <button
            onClick={() => editor?.chain().focus().toggleStrike().run()}
            className={clsx(
              "p-2 rounded-lg transition-all",
              editor?.isActive("strike") ? "bg-surface-container dark:bg-slate-800 text-primary dark:text-indigo-400" : "text-slate-600 dark:text-slate-400 hover:bg-surface-container dark:hover:bg-slate-800",
            )}
            type="button"
            title="Strikethrough"
          >
            <span className="material-symbols-outlined text-[20px]">format_strikethrough</span>
          </button>
          <div className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-2"></div>
          <button
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            className={clsx(
              "p-2 rounded-lg transition-all",
              editor?.isActive("heading", { level: 2 }) ? "bg-surface-container text-primary" : "text-slate-600 hover:bg-surface-container",
            )}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">format_h1</span>
          </button>
          <button
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            className={clsx(
              "p-2 rounded-lg transition-all",
              editor?.isActive("bulletList") ? "bg-surface-container text-primary" : "text-slate-600 hover:bg-surface-container",
            )}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">format_list_bulleted</span>
          </button>
          <div className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-2"></div>
          <button
            className="p-2 hover:bg-surface-container dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-all"
            onClick={handleInsertImage}
            type="button"
            title="Insert image"
          >
            <span className="material-symbols-outlined text-[20px]">image</span>
          </button>
          <button
            className={clsx(
              "p-2 rounded-lg transition-all border-2",
              showAiCommand && aiMenuAnchor === "top"
                ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105" 
                : "bg-primary/10 text-primary border-transparent hover:bg-primary/20"
            )}
            onClick={() => handleActivateAiCommand("top")}
            type="button"
            disabled={aiAssistLoading}
            title={aiAssistLoading ? "AI is working" : "AI assist"}
          >
            <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
          </button>
          <div className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-2"></div>
          <select
            aria-label="Font"
            title="Font for the selected text"
            className="select w-auto max-w-[9rem] !h-7 !text-[12px]"
            onChange={(e) => applyFont(e.target.value)}
            value={activeFontId}
          >
            <option value="default">Font</option>
            {FONTS_BY_CATEGORY.map((group) => (
              <optgroup key={group.category} label={group.category}>
                {group.fonts.map((font) => (
                  <option key={font.id} value={font.id} title={font.note}>
                    {font.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <select
            aria-label="Font size"
            className="bg-surface-container-low border border-outline-variant/10 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none hover:border-primary/30 transition-colors ml-1.5"
            onChange={(e) => {
              if (editor) {
                if (e.target.value === "default") {
                  editor.chain().focus().unsetFontSize().run();
                } else {
                  editor.chain().focus().setFontSize(`${e.target.value}px`).run();
                }
              }
            }}
            value={editor?.getAttributes('textStyle').fontSize?.replace('px', '') || "default"}
          >
            <option value="default">Size</option>
            {Array.from({ length: 97 }, (_, i) => i + 4).map(size => (
              <option key={size} value={size}>{size}px</option>
            ))}
          </select>
        </div>

        {/* AI Command Overlay - Top Anchor */}
        {showAiCommand && aiMenuAnchor === "top" && (
          <div className="absolute top-16 right-0 w-96 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            {renderAiCommandMenu()}
          </div>
        )}
      </div>

      {editor && (
        <>
          {/* @ts-expect-error tippyOptions is valid for tiptap BubbleMenu but missing from their types */}
          <BubbleMenu editor={editor} tippyOptions={{ duration: 100, interactive: true, maxWidth: 'none' }}>
          {showAiCommand && aiMenuAnchor === "bubble" ? (
            <div className="w-96 max-w-[90vw] z-50 animate-in fade-in zoom-in-95 duration-200 block mb-2">
              {renderAiCommandMenu()}
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-slate-900/90 text-white p-1 rounded-xl shadow-xl backdrop-blur-md border border-white/10 overflow-hidden">
              <button
               onClick={() => editor.chain().focus().toggleBold().run()}
               className={clsx("p-2 rounded-lg hover:bg-white/10 transition-colors", editor.isActive("bold") && "text-primary")}
            >
               <span className="material-symbols-outlined text-[18px]">format_bold</span>
            </button>
            <button
               onClick={() => editor.chain().focus().toggleItalic().run()}
               className={clsx("p-2 rounded-lg hover:bg-white/10 transition-colors", editor.isActive("italic") && "text-primary")}
               title="Italic"
            >
               <span className="material-symbols-outlined text-[18px]">format_italic</span>
            </button>
            <div className="w-px h-4 bg-white/20 mx-1"></div>
            <button
               onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
               className={clsx("p-2 rounded-lg hover:bg-white/10 transition-colors", editor.isActive("heading", { level: 2 }) && "text-primary")}
               title="Subheading"
            >
               <span className="material-symbols-outlined text-[18px]">format_h2</span>
            </button>
            <button
               onClick={() => editor.chain().focus().toggleBulletList().run()}
               className={clsx("p-2 rounded-lg hover:bg-white/10 transition-colors", editor.isActive("bulletList") && "text-primary")}
               title="Bullet List"
            >
               <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
            </button>
            <div className="w-px h-4 bg-white/20 mx-1"></div>
            <button
               onClick={() => editor.chain().focus().setTextAlign("left").run()}
               className={clsx("p-2 rounded-lg hover:bg-white/10 transition-colors", editor.isActive({ textAlign: "left" }) && "text-primary")}
               title="Align Left"
            >
               <span className="material-symbols-outlined text-[18px]">format_align_left</span>
            </button>
            <button
               onClick={() => editor.chain().focus().setTextAlign("center").run()}
               className={clsx("p-2 rounded-lg hover:bg-white/10 transition-colors", editor.isActive({ textAlign: "center" }) && "text-primary")}
               title="Align Center"
            >
               <span className="material-symbols-outlined text-[18px]">format_align_center</span>
            </button>
            <div className="w-px h-4 bg-white/20 mx-1"></div>
            <select
              aria-label="Font"
              title="Font for the selected text"
              className="bg-transparent border-none px-1 py-1.5 text-[11px] font-bold text-white outline-none hover:text-primary transition-colors cursor-pointer appearance-none text-center max-w-[6.5rem]"
              onChange={(e) => applyFont(e.target.value)}
              value={activeFontId}
            >
              <option value="default" className="bg-slate-900 text-white">Font</option>
              {FONTS_BY_CATEGORY.map((group) => (
                <optgroup key={group.category} label={group.category} className="bg-slate-900 text-white">
                  {group.fonts.map((font) => (
                    <option key={font.id} value={font.id} className="bg-slate-900 text-white">
                      {font.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <select
              aria-label="Font size"
              className="bg-transparent border-none px-1 py-1.5 text-[11px] font-bold text-white outline-none hover:text-primary transition-colors cursor-pointer appearance-none text-center min-w-[45px]"
              onChange={(e) => {
                if (editor) {
                  if (e.target.value === "default") {
                    editor.chain().focus().unsetFontSize().run();
                  } else {
                    editor.chain().focus().setFontSize(`${e.target.value}px`).run();
                  }
                }
              }}
              value={editor?.getAttributes('textStyle').fontSize?.replace('px', '') || "default"}
            >
              <option value="default" className="bg-slate-900 text-white">Size</option>
              {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72, 96].map(size => (
                <option key={size} value={size} className="bg-slate-900 text-white">{size}px</option>
              ))}
            </select>
            <div className="w-px h-4 bg-white/20 mx-1"></div>
            <button
               onClick={() => handleActivateAiCommand("bubble", "edit")}
               className={clsx(
                 "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all font-bold text-[10px] uppercase tracking-wider",
                 aiMode === "edit" && showAiCommand && aiMenuAnchor === "bubble" ? "bg-primary text-white" : "bg-primary/20 text-indigo-300 hover:bg-primary/30"
               )}
            >
               <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
               AI Edit
            </button>
            <button
               onClick={() => handleActivateAiCommand("bubble", "expand")}
               className={clsx(
                 "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all font-bold text-[10px] uppercase tracking-wider",
                 aiMode === "expand" && showAiCommand && aiMenuAnchor === "bubble" ? "bg-primary text-white" : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
               )}
            >
               <span className="material-symbols-outlined text-[16px]">add_circle</span>
               AI Expand
            </button>
          </div>
          )}
        </BubbleMenu>
        </>
      )}

      {isImageSelected ? (
        <div className="sticky top-24 z-20 mb-6 flex justify-center">
          <div className="rounded-2xl border border-outline-variant/20 dark:border-white/[0.06] bg-white/90 dark:bg-[#141420]/90 px-4 py-3 shadow-lg backdrop-blur-xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Image Controls</span>
              <button
                className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-bold text-slate-700"
                onClick={() => updateSelectedImageStyle({ width: "40%" })}
                type="button"
              >
                Small
              </button>
              <button
                className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-bold text-slate-700"
                onClick={() => updateSelectedImageStyle({ width: "65%" })}
                type="button"
              >
                Medium
              </button>
              <button
                className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-bold text-slate-700"
                onClick={() => updateSelectedImageStyle({ width: "100%" })}
                type="button"
              >
                Full Width
              </button>
              <button
                className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-bold text-slate-700"
                onClick={() => updateSelectedImageStyle({ display: "block", marginLeft: "0", marginRight: "auto" })}
                type="button"
              >
                Left
              </button>
              <button
                className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-bold text-slate-700"
                onClick={() => updateSelectedImageStyle({ display: "block", marginLeft: "auto", marginRight: "auto" })}
                type="button"
              >
                Center
              </button>
              <button
                className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-bold text-slate-700"
                onClick={() => updateSelectedImageStyle({ display: "block", marginLeft: "auto", marginRight: "0" })}
                type="button"
              >
                Right
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="bg-surface-container-lowest rounded-[2rem] p-8 md:p-14 editorial-shadow border border-outline-variant/10 relative print:p-0 print:border-none print:shadow-none print:bg-transparent">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
