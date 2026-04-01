"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Plus, Trash2, Loader2, FolderKanban, Search, AlignLeft, Layers, Tag } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";

function SortableRow({ 
  id, 
  children, 
  isExpanded,
  className
}: { 
  id: string; 
  children: React.ReactNode; 
  isExpanded: boolean;
  className?: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...(isDragging ? { position: "relative", zIndex: 50, opacity: 0.8, backgroundColor: "var(--accent)" } : {}),
  } as React.CSSProperties;

  return (
    <>
      <tr ref={setNodeRef} style={style} className={cn("group transition-colors", className, isExpanded ? "bg-accent/50 dark:bg-white/[0.04]" : "")}>
        <td className="w-8 px-2 text-center cursor-move border-r border-border/50 bg-primary/5 hover:bg-primary/10 transition-colors" {...attributes} {...listeners}>
           <GripVertical className="w-4 h-4 mx-auto text-muted-foreground" />
        </td>
        {children}
      </tr>
    </>
  );
}
interface Project {
  id: string;
  nama_projek: string;
  label?: string;
  penjelasan: string;
  progress: number;
  info_server: string;
  created_at: string;
  order_index?: number;
}

interface Todo {
  id: string;
  project_id: string;
  parent_id?: string;
  is_done: boolean;
  nama_tugas: string;
  deadline?: string;
}

export default function KelolaProjek() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  // Column resize state
  const [colWidths, setColWidths] = useState([40, 48, 220, 300, 200, 160, 130, 110]);
  const dragRef = useRef<{ colIndex: number; startX: number; startWidth: number } | null>(null);

  const handleMouseDown = useCallback((colIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { colIndex, startX: e.clientX, startWidth: colWidths[colIndex] };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const delta = ev.clientX - dragRef.current.startX;
      const newWidth = Math.max(80, dragRef.current.startWidth + delta);
      setColWidths(prev => {
        const next = [...prev];
        next[dragRef.current!.colIndex] = newWidth;
        return next;
      });
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [colWidths]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [projRes, todoRes] = await Promise.all([
        supabase.from("projects").select("*").order("order_index", { ascending: true }).order("created_at", { ascending: false }),
        supabase.from("todos").select("*"),
      ]);
      if (projRes.data) setProjects(projRes.data);
      if (todoRes.data) setTodos(todoRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddProject() {
    try {
      const { data, error } = await supabase
        .from("projects")
        .insert([{ nama_projek: "", penjelasan: "", label: "", info_server: "", progress: 0, order_index: projects.length }])
        .select();
      if (error) {
        console.error("Supabase insert error:", error);
        alert(`Gagal menambah projek: ${error.message}`);
        return;
      }
      if (data) setProjects([data[0], ...projects]);
    } catch (err) {
      console.error("Unexpected error:", err);
      alert("Gagal menambah projek karena error tidak terduga.");
    }
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Hapus ${selected.size} baris yang dipilih? Tindakan ini tidak bisa dibatalkan.`)) return;

    try {
      setDeleting(true);
      const ids = Array.from(selected);
      const { error } = await supabase.from("projects").delete().in("id", ids);
      if (error) throw error;
      setProjects((prev) => prev.filter((p) => !selected.has(p.id)));
      setTodos((prev) => prev.filter((t) => !selected.has(t.project_id)));
      setSelected(new Set());
    } catch (err) {
      alert("Gagal menghapus projek.");
      console.error(err);
    } finally {
      setDeleting(false);
    }
  }

  async function updateProject(id: string, field: keyof Project, value: string | number) {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );

    try {
      await supabase.from("projects").update({ [field]: value }).eq("id", id);
    } catch (err) {
      console.error("Gagal update project:", err);
    }
  }

  // --- Inline Todo Management ---
  async function syncProgress(projectId: string, currentTodos: Todo[]) {
    const pTodos = currentTodos.filter(t => t.project_id === projectId);
    const total = pTodos.length;
    const done = pTodos.filter(t => t.is_done).length;
    const progressVal = total === 0 ? 0 : Math.round((done / total) * 100);
    
    await updateProject(projectId, "progress", progressVal);
  }

  async function addTodo(projectId: string, name: string, parentId?: string) {
    if (!name.trim()) return;
    try {
      const { data, error } = await supabase
        .from("todos")
        .insert([{ project_id: projectId, parent_id: parentId || null, nama_tugas: name, is_done: false }])
        .select();
      if (error) throw error;
      if (data) {
        const newTodos = [...todos, data[0]];
        setTodos(newTodos);
        syncProgress(projectId, newTodos);
      }
    } catch (err) {
      console.error(err);
      alert("Gagal menambah todo. Pastikan kolom parent_id & deadline sudah ditambahkan di Supabase.");
    }
  }

  async function toggleTodo(id: string, projectId: string, done: boolean) {
    const nextTodos = todos.map(t => t.id === id ? { ...t, is_done: done } : t);
    setTodos(nextTodos);

    try {
      await supabase.from("todos").update({ is_done: done }).eq("id", id);
      syncProgress(projectId, nextTodos);
    } catch (err) {
      console.error(err);
    }
  }

  async function updateTodoField(id: string, projectId: string, field: keyof Todo, value: string | null) {
    const nextTodos = todos.map(t => t.id === id ? { ...t, [field]: value } : t);
    setTodos(nextTodos);

    try {
      await supabase.from("todos").update({ [field]: value }).eq("id", id);
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteTodo(id: string, projectId: string, childrenIds: string[] = []) {
    const idsToDelete = [id, ...childrenIds];
    const nextTodos = todos.filter(t => !idsToDelete.includes(t.id));
    setTodos(nextTodos);
    try {
      await supabase.from("todos").delete().in("id", idsToDelete);
      syncProgress(projectId, nextTodos);
    } catch (err) {
      console.error(err);
    }
  }
  // ------------------------------

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filteredProjects.length && filteredProjects.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredProjects.map((p) => p.id)));
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setProjects((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Update order_index in database for affected items
        newItems.forEach((item, index) => {
          if (item.order_index !== index) {
            supabase.from("projects").update({ order_index: index }).eq("id", item.id).then();
          }
        });

        // Optimistically set the local order_index
        return newItems.map((item, index) => ({ ...item, order_index: index }));
      });
    }
  }

  const filteredProjects = projects.filter((p) =>
    p.nama_projek.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">Memuat database...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-5 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Kelola Projek</h1>
            <p className="text-sm text-muted-foreground mt-1">Database projek Anda. Klik sel untuk mengedit langsung.</p>
          </div>
          <div className="flex items-center gap-3">
            {selected.size > 0 && (
              <Button
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={deleting}
                size="sm"
                className="rounded-full text-xs h-9 px-4"
              >
                {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Hapus {selected.size}
              </Button>
            )}
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari projek..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-accent/50 dark:bg-white/5 border-border text-foreground rounded-full h-9 text-sm focus:bg-card transition-colors"
              />
            </div>
            <Button
              onClick={handleAddProject}
              size="sm"
              className="rounded-full bg-primary text-primary-foreground font-medium h-9 px-5 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-shadow"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Baris Baru
            </Button>
          </div>
        </div>

        {/* Notion-like Inline Editable Table */}
        <div className="w-full overflow-x-auto rounded-xl bg-card shadow-md shadow-black/[0.03] dark:shadow-black/20 border border-border">
          <table className="w-full text-sm text-left border-collapse" style={{ tableLayout: "fixed", minWidth: colWidths.reduce((a, b) => a + b, 0) }}>
            <colgroup>
              {colWidths.map((w, i) => <col key={i} style={{ width: w }} />)}
            </colgroup>
            <thead className="text-foreground/60 border-b border-border bg-accent/40 dark:bg-white/[0.03] select-none">
              <tr>
                {[
                  { label: null, icon: null, isDragHandle: true },
                  { label: null, icon: null, isCheckbox: true },
                  { label: "Nama Projek", icon: null },
                  { label: "Penjelasan", icon: <AlignLeft className="w-3.5 h-3.5 mr-2 opacity-50" /> },
                  { label: "Info Server", icon: <AlignLeft className="w-3.5 h-3.5 mr-2 opacity-50" /> },
                  { label: "Info Lain", icon: <Tag className="w-3.5 h-3.5 mr-2 opacity-50" /> },
                  { label: "Todo", icon: <AlignLeft className="w-3.5 h-3.5 mr-2 opacity-50" /> },
                  { label: "Progress", icon: <AlignLeft className="w-3.5 h-3.5 mr-2 opacity-50" /> },
                ].map((col, i) => (
                  <th key={i} className="relative px-4 py-3 font-semibold text-xs uppercase tracking-wider whitespace-nowrap border-r border-border/50 overflow-hidden">
                    {col.isDragHandle ? null : col.isCheckbox ? (
                      <div className="flex justify-center">
                        <Checkbox
                          checked={selected.size === filteredProjects.length && filteredProjects.length > 0}
                          onCheckedChange={toggleSelectAll}
                          className="rounded border-border"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center">
                        {col.icon}
                        {col.label}
                      </div>
                    )}
                    {/* Drag handle */}
                    {i > 0 && i < 7 && (
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 transition-colors z-10"
                        onMouseDown={(e) => handleMouseDown(i, e)}
                      />
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 text-[13px]">
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="h-32 text-center text-muted-foreground">
                    Belum ada data. Klik "Baris Baru" untuk memulai.
                  </td>
                </tr>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToVerticalAxis]}>
                  <SortableContext items={filteredProjects.map(p => p.id)} strategy={verticalListSortingStrategy}>
                    {filteredProjects.map((project) => {
                      const pTodos = todos.filter((t) => t.project_id === project.id);
                      const rootTodos = pTodos.filter(t => !t.parent_id);
                      const doneCnt = pTodos.filter((t) => t.is_done).length;
                      const isSelected = selected.has(project.id);
                      const isExpanded = expandedProject === project.id;
                      
                      const progressText = project.progress > 0 ? `${project.progress}%` : "";
                      const todoText = pTodos.length > 0 ? `${doneCnt} / ${pTodos.length} tugas` : "";

                      return (
                        <React.Fragment key={project.id}>
                          <SortableRow
                            id={project.id}
                            isExpanded={isExpanded}
                            className={cn(
                              isSelected ? "bg-primary/5" : "hover:bg-accent/60 dark:hover:bg-white/[0.03] focus-within:bg-accent/60 dark:focus-within:bg-white/[0.03]"
                            )}
                          >
                            <td className="px-4 py-2 text-center border-r border-border/50">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(project.id)}
                            className="rounded border-border data-[state=checked]:bg-primary opacity-0 group-hover:opacity-100 data-[state=checked]:opacity-100 transition-opacity"
                          />
                        </td>
                        <td className="p-0 border-r border-border/50 align-top">
                          <div
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => updateProject(project.id, "nama_projek", e.currentTarget.innerText)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.blur(); } }}
                            data-placeholder="Judul projek..."
                            className="w-full h-full min-h-[44px] p-2.5 px-4 bg-transparent outline-none focus:bg-primary/5 dark:focus:bg-white/5 text-foreground font-semibold transition-colors empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground whitespace-pre-wrap"
                          >
                            {project.nama_projek}
                          </div>
                        </td>

                        {/* Penjelasan */}
                        <td className="p-0 border-r border-border/50 align-top">
                          <div
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => updateProject(project.id, "penjelasan", e.currentTarget.innerText)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.blur(); } }}
                            data-placeholder="Kosong"
                            className="w-full h-full min-h-[44px] p-2.5 px-4 bg-transparent outline-none focus:bg-primary/5 dark:focus:bg-white/5 text-foreground transition-colors empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/60 whitespace-pre-wrap"
                          >
                            {project.penjelasan}
                          </div>
                        </td>
                        {/* Info Server */}
                        <td className="p-0 border-r border-border/50 align-top">
                          <div
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => updateProject(project.id, "info_server", e.currentTarget.innerText)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.blur(); } }}
                            data-placeholder="Kosong"
                            className="w-full h-full min-h-[44px] p-2.5 px-4 bg-transparent outline-none focus:bg-primary/5 dark:focus:bg-white/5 text-foreground transition-colors empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/60 whitespace-pre-wrap font-mono text-xs"
                          >
                            {project.info_server}
                          </div>
                        </td>
                        {/* Info Lain */}
                        <td className="p-0 border-r border-border/50 align-top">
                          <div
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => updateProject(project.id, "label", e.currentTarget.innerText)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.blur(); } }}
                            data-placeholder="Kosong"
                            className="w-full h-full min-h-[44px] p-2.5 px-4 bg-transparent outline-none focus:bg-primary/5 dark:focus:bg-white/5 text-foreground transition-colors empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/60 whitespace-pre-wrap"
                          >
                            {project.label}
                          </div>
                        </td>
                        {/* Todo */}
                        <td 
                          className="p-0 border-r border-border/50 cursor-pointer hover:bg-primary/5 dark:hover:bg-white/5 transition-colors select-none align-top"
                          onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                        >
                          <div className="px-4 py-2.5 w-full h-full min-h-[44px] flex items-center">
                            {todoText ? <span className="text-sm text-foreground font-medium">{todoText}</span> : <span className="text-primary/60 text-sm font-medium">+ Tambah</span>}
                          </div>
                        </td>
                        {/* Progress */}
                        <td className="p-0 border-r border-border/50 align-top">
                          <div className="px-4 py-2.5 w-full h-full min-h-[44px] flex items-center">
                            <span className={cn("text-sm font-bold", project.progress >= 100 ? "text-emerald-600 dark:text-emerald-400" : project.progress > 0 ? "text-primary" : "text-muted-foreground/40")}>
                              {progressText || "0%"}
                            </span>
                          </div>
                        </td>
                      </SortableRow>

                      {/* Inline Expanded Todos Detail */}
                      {isExpanded && (
                        <tr className="bg-accent/30 dark:bg-white/[0.02]">
                          <td colSpan={9} className="p-0 border-b border-border/50">
                            <div className="p-5 pl-12 flex flex-col gap-4">
                              <p className="text-xs font-bold uppercase tracking-widest text-primary">
                                Todo List — {project.nama_projek || "Projek Baru"}
                              </p>
                              <div className="space-y-1.5 max-w-2xl">
                                {rootTodos.map(todo => {
                                  const children = pTodos.filter(t => t.parent_id === todo.id);
                                  return (
                                    <div key={todo.id} className="w-full flex flex-col gap-1">
                                      <div className="flex items-center justify-between group/todo p-2.5 rounded-lg hover:bg-card dark:hover:bg-white/5 transition-colors border border-transparent hover:border-border hover:shadow-sm">
                                        <div className="flex items-center gap-3 flex-1">
                                          <Checkbox 
                                            checked={todo.is_done}
                                            onCheckedChange={(c) => toggleTodo(todo.id, project.id, c as boolean)}
                                            className="rounded-full border-border data-[state=checked]:bg-primary shrink-0"
                                          />
                                          <span className={cn("text-sm transition-colors", todo.is_done ? "text-muted-foreground line-through" : "text-foreground font-medium")}>
                                            {todo.nama_tugas}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <input 
                                            type="date"
                                            value={todo.deadline || ""}
                                            onChange={(e) => updateTodoField(todo.id, project.id, "deadline", e.target.value || null)}
                                            className="bg-transparent text-xs text-muted-foreground border-border rounded-md px-2 py-1 outline-none focus:text-foreground focus:border-primary cursor-pointer w-32 transition-colors"
                                          />
                                          <div className="flex items-center gap-1 opacity-0 group-hover/todo:opacity-100 transition-opacity w-16 justify-end">
                                            <Button 
                                              variant="ghost" 
                                              size="icon" 
                                              className="h-7 w-7 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                                              onClick={() => deleteTodo(todo.id, project.id, children.map(c => c.id))}
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                      {/* Children mapping */}
                                      <div className="ml-8 mt-1 space-y-1 border-l-2 border-primary/20 dark:border-primary/30 pl-3">
                                        {children.map(child => (
                                          <div key={child.id} className="flex items-center justify-between group/child p-2 rounded-lg hover:bg-card dark:hover:bg-white/5 transition-colors border border-transparent hover:border-border hover:shadow-sm">
                                            <div className="flex items-center gap-3 flex-1">
                                              <Checkbox 
                                                checked={child.is_done}
                                                onCheckedChange={(c) => toggleTodo(child.id, project.id, c as boolean)}
                                                className="rounded border-border data-[state=checked]:bg-primary shrink-0 w-3.5 h-3.5"
                                              />
                                              <span className={cn("text-[13px] transition-colors", child.is_done ? "text-muted-foreground line-through" : "text-foreground/80")}>
                                                {child.nama_tugas}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <input 
                                                type="date"
                                                value={child.deadline || ""}
                                                onChange={(e) => updateTodoField(child.id, project.id, "deadline", e.target.value || null)}
                                                className="bg-transparent text-[11px] text-muted-foreground/70 border-border rounded-md px-2 py-0.5 outline-none focus:text-foreground cursor-pointer w-28 transition-colors"
                                              />
                                              <div className="flex items-center gap-1 opacity-0 group-hover/child:opacity-100 transition-opacity w-16 justify-end">
                                                <Button 
                                                  variant="ghost" 
                                                  size="icon" 
                                                  className="h-6 w-6 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                  onClick={() => deleteTodo(child.id, project.id)}
                                                >
                                                  <Trash2 className="w-3 h-3" />
                                                </Button>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                        <div className="flex items-center gap-3 p-1.5 mt-1 group/addsub focus-within:opacity-100 opacity-40 hover:opacity-80 transition-opacity">
                                          <div className="w-3.5 h-3.5 rounded-full border border-dashed border-primary/40 flex items-center justify-center shrink-0 pointer-events-none">
                                            <Plus className="w-2.5 h-2.5 text-primary/40" />
                                          </div>
                                          <input 
                                            type="text"
                                            placeholder="Tambah sub todo..."
                                            className="bg-transparent border-none outline-none text-[12px] text-foreground placeholder:text-muted-foreground/60 flex-1 focus:ring-0"
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                addTodo(project.id, e.currentTarget.value, todo.id);
                                                e.currentTarget.value = "";
                                              }
                                            }}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                                <div className="flex items-center gap-3 p-2.5 mt-3 rounded-lg border border-dashed border-border hover:border-primary/30 transition-colors group/addparent">
                                  <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center pointer-events-none"><Plus className="w-2.5 h-2.5 text-primary/60"/></div>
                                  <input 
                                    type="text"
                                    placeholder="Ketik lalu Enter untuk menambah todo baru..."
                                    className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground/50 flex-1 focus:ring-0"
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        addTodo(project.id, e.currentTarget.value);
                                        e.currentTarget.value = "";
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                  </SortableContext>
                </DndContext>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
