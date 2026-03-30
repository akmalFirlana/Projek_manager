"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Loader2, FileText, Search, Save, Clock } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

// Toolbar component for the editor
function EditorToolbar({ editor }: { editor: ReturnType<typeof useEditor> | null }) {
  if (!editor) return null;

  const btnClass = (active: boolean) =>
    cn(
      "px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
      active
        ? "bg-primary text-primary-foreground"
        : "text-foreground/70 hover:bg-accent"
    );

  return (
    <div className="flex items-center gap-1 flex-wrap px-4 py-2.5 border-b border-border bg-accent/30 dark:bg-white/[0.02]">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={btnClass(editor.isActive("bold"))}
        title="Bold"
      >
        <strong>B</strong>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={btnClass(editor.isActive("italic"))}
        title="Italic"
      >
        <em>I</em>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={btnClass(editor.isActive("underline"))}
        title="Underline"
      >
        <u>U</u>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={btnClass(editor.isActive("strike"))}
        title="Strikethrough"
      >
        <s>S</s>
      </button>
      <div className="w-px h-5 bg-border mx-1" />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={btnClass(editor.isActive("heading", { level: 1 }))}
        title="Heading 1"
      >
        H1
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={btnClass(editor.isActive("heading", { level: 2 }))}
        title="Heading 2"
      >
        H2
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={btnClass(editor.isActive("heading", { level: 3 }))}
        title="Heading 3"
      >
        H3
      </button>
      <div className="w-px h-5 bg-border mx-1" />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={btnClass(editor.isActive("bulletList"))}
        title="Bullet List"
      >
        • List
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={btnClass(editor.isActive("orderedList"))}
        title="Ordered List"
      >
        1. List
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={btnClass(editor.isActive("codeBlock"))}
        title="Code Block"
      >
        {"</>"}
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={btnClass(editor.isActive("blockquote"))}
        title="Quote"
      >
        &ldquo; Quote
      </button>
    </div>
  );
}

// Note Editor component
function NoteEditor({
  note,
  onSave,
}: {
  note: Note;
  onSave: (id: string, title: string, content: string) => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({
        placeholder: "Mulai menulis catatan Anda di sini...",
      }),
    ],
    content: note.content || "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[400px] px-6 py-4 text-foreground",
      },
    },
  });

  // Update editor content when note changes
  useEffect(() => {
    if (editor && note.content !== editor.getHTML()) {
      editor.commands.setContent(note.content || "");
    }
    setTitle(note.title);
  }, [note.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = useCallback(async () => {
    if (!editor) return;
    setSaving(true);
    await onSave(note.id, title, editor.getHTML());
    setLastSaved(new Date());
    setSaving(false);
  }, [editor, note.id, title, onSave]);

  // Auto-save on Ctrl+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  return (
    <div className="flex flex-col h-full">
      {/* Title input */}
      <div className="px-6 py-4 border-b border-border">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Judul Catatan..."
          className="w-full text-2xl font-bold bg-transparent outline-none text-foreground placeholder:text-muted-foreground/40"
        />
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Dibuat {format(new Date(note.created_at), "dd MMM yyyy, HH:mm")}
          </span>
          {lastSaved && (
            <span className="text-emerald-600 dark:text-emerald-400">
              ✓ Tersimpan {format(lastSaved, "HH:mm:ss")}
            </span>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <EditorToolbar editor={editor} />

      {/* Editor */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>

      {/* Save bar */}
      <div className="px-6 py-3 border-t border-border bg-accent/20 dark:bg-white/[0.02] flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Tekan <kbd className="px-1.5 py-0.5 bg-accent rounded text-[10px] font-mono border border-border">Ctrl+S</kbd> untuk menyimpan
        </span>
        <Button
          onClick={handleSave}
          size="sm"
          disabled={saving}
          className="rounded-full bg-primary text-primary-foreground font-medium h-8 px-4 shadow-md shadow-primary/20"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-1.5" />
          )}
          Simpan
        </Button>
      </div>
    </div>
  );
}

export default function CatatanPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  useEffect(() => {
    fetchNotes();
  }, []);

  async function fetchNotes() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      if (data) {
        setNotes(data);
        if (data.length > 0 && !activeNoteId) {
          setActiveNoteId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Gagal memuat catatan:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddNote() {
    try {
      const { data, error } = await supabase
        .from("notes")
        .insert([
          {
            title: "Catatan Baru",
            content: "",
          },
        ])
        .select();
      if (error) throw error;
      if (data) {
        setNotes([data[0], ...notes]);
        setActiveNoteId(data[0].id);
      }
    } catch (err) {
      alert(
        "Gagal membuat catatan. Pastikan tabel 'notes' sudah ada di Supabase."
      );
      console.error(err);
    }
  }

  async function handleSaveNote(id: string, title: string, content: string) {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id
          ? { ...n, title, content, updated_at: new Date().toISOString() }
          : n
      )
    );
    try {
      await supabase
        .from("notes")
        .update({ title, content, updated_at: new Date().toISOString() })
        .eq("id", id);
    } catch (err) {
      console.error("Gagal menyimpan:", err);
    }
  }

  async function handleDeleteNote(id: string) {
    if (!confirm("Hapus catatan ini?")) return;
    try {
      await supabase.from("notes").delete().eq("id", id);
      const remaining = notes.filter((n) => n.id !== id);
      setNotes(remaining);
      if (activeNoteId === id) {
        setActiveNoteId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err) {
      console.error("Gagal menghapus:", err);
    }
  }

  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase())
  );

  const activeNote = notes.find((n) => n.id === activeNoteId);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">Memuat catatan...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-5 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
              Catatan
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Tulis ide, catatan, dan dokumentasi Anda.
            </p>
          </div>
          <Button
            onClick={handleAddNote}
            size="sm"
            className="rounded-full bg-primary text-primary-foreground font-medium h-9 px-5 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-shadow"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Catatan Baru
          </Button>
        </div>

        {/* Main content: sidebar + editor */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[70vh]">
          {/* Notes sidebar list */}
          <div className="lg:col-span-3 rounded-xl bg-card shadow-md shadow-black/[0.03] dark:shadow-black/20 border border-border flex flex-col overflow-hidden">
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cari catatan..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-accent/50 dark:bg-white/5 border-border text-foreground rounded-full h-9 text-sm"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm gap-2">
                  <FileText className="w-10 h-10 opacity-20" />
                  Belum ada catatan.
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {filteredNotes.map((note) => (
                    <div
                      key={note.id}
                      onClick={() => setActiveNoteId(note.id)}
                      className={cn(
                        "px-4 py-3 cursor-pointer transition-colors group relative",
                        activeNoteId === note.id
                          ? "bg-primary/5 border-l-2 border-l-primary"
                          : "hover:bg-accent/60 border-l-2 border-l-transparent"
                      )}
                    >
                      <p className="text-sm font-semibold text-foreground truncate pr-6">
                        {note.title || "Tanpa Judul"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {note.content
                          ? note.content.replace(/<[^>]*>/g, "").slice(0, 80)
                          : "Kosong"}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                        {format(
                          new Date(note.updated_at || note.created_at),
                          "dd MMM yyyy"
                        )}
                      </p>
                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNote(note.id);
                        }}
                        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80"
                        title="Hapus catatan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Editor area */}
          <div className="lg:col-span-9 rounded-xl bg-card shadow-md shadow-black/[0.03] dark:shadow-black/20 border border-border flex flex-col overflow-hidden">
            {activeNote ? (
              <NoteEditor
                key={activeNote.id}
                note={activeNote}
                onSave={handleSaveNote}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                <FileText className="w-16 h-16 opacity-15" />
                <p className="text-lg font-medium">
                  Pilih atau buat catatan baru
                </p>
                <p className="text-sm">
                  Klik &ldquo;Catatan Baru&rdquo; untuk memulai menulis.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
