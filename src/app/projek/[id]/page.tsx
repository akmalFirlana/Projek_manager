"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronRight, Circle, Clock, List, Loader2, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { Checkbox } from "@/components/ui/checkbox";
import { Project, Todo } from "@/lib/mock";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

// Helper recursively render todos
function TodoItem({ 
  todo, 
  allTodos, 
  level = 0,
  onToggle,
  onAddSub,
  onDelete
}: { 
  todo: Todo; 
  allTodos: Todo[]; 
  level?: number;
  onToggle: (id: string, done: boolean) => void;
  onAddSub: (parentId: string) => void;
  onDelete: (id: string) => void;
}) {
  const children = allTodos.filter(t => t.parent_id === todo.id);
  const [expanded, setExpanded] = useState(true);
  
  const isOverdue = todo.deadline && new Date(todo.deadline) < new Date() && !todo.is_done;

  return (
    <div className="space-y-3">
      <div 
        className={cn(
          "flex items-start gap-3 p-3 rounded transition-all border border-transparent hover:border-white/10 hover:bg-white/5",
          todo.is_done ? "opacity-60" : ""
        )}
        style={{ marginLeft: `${level * 1.5}rem` }}
      >
        <button 
          onClick={() => setExpanded(!expanded)} 
          className="mt-1 w-5 h-5 flex items-center justify-center rounded hover:bg-white/10"
        >
          {children.length > 0 ? (
            expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />
          ) : <div className="w-4 h-4" />}
        </button>
        
        <Checkbox 
          checked={todo.is_done} 
          onCheckedChange={(checked) => onToggle(todo.id, checked as boolean)}
          className="mt-1 h-5 w-5 rounded-full border-white/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
        
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <p className={cn(
              "text-sm font-medium transition-colors",
              todo.is_done ? "line-through text-muted-foreground" : "text-white"
            )}>
              {todo.nama_tugas}
            </p>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg hover:bg-white/10" onClick={() => onAddSub(todo.id)}>
                <Plus className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg hover:bg-destructive/20 hover:text-destructive" onClick={() => onDelete(todo.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {todo.deadline && (
            <div className={cn(
              "flex items-center gap-1.5 text-xs",
              isOverdue ? "text-destructive font-medium" : "text-muted-foreground"
            )}>
              <Clock className="w-3.5 h-3.5" />
              {format(new Date(todo.deadline), "dd MMM yyyy, HH:mm")}
              {isOverdue && <span>(Overdue)</span>}
            </div>
          )}
        </div>
      </div>
      
      {expanded && children.length > 0 && (
        <div className="space-y-2 mt-2">
          {children.map(child => (
            <TodoItem 
              key={child.id} 
              todo={child} 
              allTodos={allTodos} 
              level={level + 1} 
              onToggle={onToggle}
              onAddSub={onAddSub}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const projectId = unwrappedParams.id;
  const router = useRouter();
  
  const [project, setProject] = useState<Project | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskName, setNewTaskName] = useState("");

  useEffect(() => {
    fetchProjectDetail();
  }, [projectId]);

  async function fetchProjectDetail() {
    try {
      setLoading(true);
      const { data: projData, error: projError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (projError) throw projError;
      setProject(projData);

      const { data: todoData, error: todoError } = await supabase
        .from("todos")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });

      if (todoError) throw todoError;
      setTodos(todoData || []);
    } catch (err) {
      console.error("Error fetching detail:", err);
    } finally {
      setLoading(false);
    }
  }

  const rootTodos = todos.filter(t => t.parent_id === null);

  const toggleTodo = async (id: string, done: boolean) => {
    const originalTodos = [...todos];
    
    // Optimistic UI update
    const next = [...todos];
    const targetIdx = next.findIndex(t => t.id === id);
    if (targetIdx > -1) next[targetIdx].is_done = done;
    setTodos(next);

    try {
      const { error } = await supabase
        .from("todos")
        .update({ is_done: done })
        .eq("id", id);
      
      if (error) throw error;
      
      // Update project progress automatically
      syncProgress();
    } catch (err) {
      setTodos(originalTodos);
      console.error(err);
    }
  };

  async function syncProgress() {
    const total = todos.length;
    const done = todos.filter(t => t.is_done).length;
    const progressVal = total === 0 ? 0 : Math.round((done / total) * 100);
    
    await supabase.from("projects").update({ progress: progressVal }).eq("id", projectId);
    setProject(prev => prev ? { ...prev, progress: progressVal } : null);
  }

  const addTodo = async (parentId: string | null = null, name: string = newTaskName) => {
    if (!name.trim()) return;
    
    try {
      const { data, error } = await supabase
        .from("todos")
        .insert([{
          project_id: projectId,
          parent_id: parentId,
          nama_tugas: name,
          is_done: false
        }])
        .select();

      if (error) throw error;
      if (data) {
        setTodos([...todos, data[0]]);
        if (!parentId) setNewTaskName("");
        syncProgress();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteTodo = async (id: string) => {
    if (!confirm("Hapus tugas ini? (Sub-tugas juga akan terhapus)")) return;
    
    try {
      const { error } = await supabase.from("todos").delete().eq("id", id);
      if (error) throw error;
      
      const idsToDelete = new Set([id]);
      // Note: Cascade delete handles children in DB, but we need to update local state
      // For simplicity, refetch or filter local state
      fetchProjectDetail(); 
    } catch (err) {
      console.error(err);
    }
  };

  const updateProject = async (field: keyof Project, value: any) => {
    setProject(prev => prev ? { ...prev, [field]: value } : null);
    await supabase.from("projects").update({ [field]: value }).eq("id", projectId);
  };

  const handleDeleteProject = async () => {
    if (!confirm("Hapus seluruh projek ini? Tindakan ini tidak bisa dibatalkan.")) return;
    
    try {
      const { error } = await supabase.from("projects").delete().eq("id", projectId);
      if (error) throw error;
      router.push("/");
    } catch (err) {
      console.error(err);
    }
  };

  // Calculate local progress for immediate feedback
  const totalTasks = todos.length;
  const completedTasks = todos.filter(t => t.is_done).length;
  const calculatedProgress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4 bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Memuat detail projek...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-background via-background to-secondary/20">
        <h1 className="text-2xl font-bold mb-4">Project Not Found</h1>
        <Link href="/">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 transition-all">
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        
        {/* Nav Header */}
        <div className="flex items-center gap-4">
          <Link href="/kelola-projek">
            <Button variant="ghost" size="icon" className="rounded hover:bg-white/5">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">Project Detail</h1>
            <p className="text-xs text-muted-foreground font-mono opacity-50">{project.id}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Project Info */}
          <div className="lg:col-span-4 space-y-6">
            <div className="glass-panel rounded p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nama Projek</label>
                  <Input 
                    value={project.nama_projek}
                    onChange={(e) => updateProject("nama_projek", e.target.value)}
                    className="bg-black/20 border-white/10 text-white font-medium focus-visible:ring-primary backdrop-blur-sm"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Penjelasan</label>
                  <Textarea 
                    value={project.penjelasan}
                    onChange={(e) => updateProject("penjelasan", e.target.value)}
                    className="min-h-[120px] bg-black/20 border-white/10 text-white focus-visible:ring-primary backdrop-blur-sm resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Info Server & Kredensial</label>
                  <Textarea 
                    value={project.info_server}
                    onChange={(e) => updateProject("info_server", e.target.value)}
                    className="min-h-[100px] bg-black/20 border-white/10 text-destructive-foreground/90 font-mono text-sm focus-visible:ring-primary backdrop-blur-sm resize-none"
                    placeholder="SSH, DB URI, etc."
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Progress</label>
                <p className="text-xl font-bold text-white">{completedTasks} / {totalTasks} <span className="text-sm font-normal text-muted-foreground">tugas selesai</span></p>
              </div>
            </div>
            
            <Button 
                variant="destructive" 
                onClick={handleDeleteProject}
                className="w-full rounded bg-destructive/10 text-destructive hover:bg-destructive hover:text-white border border-destructive/20 transition-all"
            >
              Hapus Projek
            </Button>
          </div>

          {/* Right Column: Todo List */}
          <div className="lg:col-span-8">
            <div className="glass-panel rounded p-6 md:p-8 min-h-[600px] flex flex-col">
              
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-white">Tasks & Milestones</h2>
                  <p className="text-sm text-muted-foreground">{totalTasks} tasks in total</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 px-3 py-1.5 rounded font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  {completedTasks}/{totalTasks} Selesai
                </div>
              </div>

              {/* Add Main Task */}
              <div className="flex items-center gap-3 mb-8">
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Input 
                    placeholder="Tambah tugas utama baru..."
                    className="pl-10 h-12 bg-black/20 border-white/10 text-white rounded focus-visible:ring-primary backdrop-blur-sm"
                    value={newTaskName}
                    onChange={(e) => setNewTaskName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTodo(null)}
                  />
                </div>
                <Button 
                  onClick={() => addTodo(null)}
                  className="h-12 px-6 rounded bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah
                </Button>
              </div>

              {/* Tasks List */}
              <div className="flex-1 overflow-y-auto pr-2 space-y-2 -mr-2">
                {rootTodos.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4 opacity-50">
                    <List className="w-12 h-12" />
                    <p>Belum ada tugas. Tambahkan sekarang!</p>
                  </div>
                ) : (
                  rootTodos.map(todo => (
                    <div key={todo.id} className="group">
                        <TodoItem 
                            todo={todo} 
                            allTodos={todos}
                            onToggle={toggleTodo}
                            onAddSub={(parentId) => {
                                const name = prompt("Nama sub-tugas:");
                                if (name) addTodo(parentId, name);
                            }}
                            onDelete={deleteTodo}
                        />
                    </div>
                  ))
                )}
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
