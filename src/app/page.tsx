"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FolderKanban, CheckCircle2, ListTodo, Clock, Loader2, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface Project {
  id: string;
  nama_projek: string;
  penjelasan: string;
  progress: number;
  info_server: string;
  created_at: string;
}

interface Todo {
  id: string;
  project_id: string;
  is_done: boolean;
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [projRes, todoRes] = await Promise.all([
        supabase.from("projects").select("*").order("created_at", { ascending: false }),
        supabase.from("todos").select("id, project_id, is_done"),
      ]);
      if (projRes.data) setProjects(projRes.data);
      if (todoRes.data) setTodos(todoRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const totalProjects = projects.length;
  const totalTodos = todos.length;
  const completedTodos = todos.filter((t) => t.is_done).length;
  const projectsComplete = projects.filter((p) => {
    const pTodos = todos.filter((t) => t.project_id === p.id);
    return pTodos.length > 0 && pTodos.every((t) => t.is_done);
  }).length;

  // Chart data: tasks per project
  const chartData = projects.map((p) => {
    const pTodos = todos.filter((t) => t.project_id === p.id);
    const done = pTodos.filter((t) => t.is_done).length;
    return {
      name: p.nama_projek.length > 12 ? p.nama_projek.slice(0, 12) + "…" : p.nama_projek,
      Selesai: done,
      Belum: pTodos.length - done,
      total: pTodos.length,
    };
  });

  // Recent projects (last 5)
  const recentProjects = projects.slice(0, 5);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p>Memuat data...</p>
      </div>
    );
  }

  const statCards = [
    { label: "Total Projek", value: totalProjects, icon: FolderKanban, iconColor: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-50 dark:bg-blue-500/10" },
    { label: "Projek Selesai", value: projectsComplete, icon: CheckCircle2, iconColor: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-50 dark:bg-emerald-500/10" },
    { label: "Total Tugas", value: totalTodos, icon: ListTodo, iconColor: "text-violet-600 dark:text-violet-400", bgColor: "bg-violet-50 dark:bg-violet-500/10" },
    { label: "Tugas Selesai", value: completedTodos, icon: CheckCircle2, iconColor: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-50 dark:bg-amber-500/10" },
  ];

  return (
    <div className="min-h-screen p-5 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Page Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Dashboard Projek</h1>
          <p className="text-sm text-muted-foreground mt-1">Ringkasan aktivitas dan progres projek Anda.</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {statCards.map((stat) => (
            <Card key={stat.label} className="glass-panel rounded-xl hover:shadow-xl hover:shadow-black/[0.06] dark:hover:shadow-black/30 transition-shadow duration-300 border-0 shadow-md shadow-black/[0.03] dark:shadow-black/20">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                  <p className="text-3xl font-bold text-foreground mt-0.5">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6">

          {/* Chart */}
          <Card className="glass-panel rounded-xl lg:col-span-8 border-0 shadow-md shadow-black/[0.03] dark:shadow-black/20">
            <CardHeader className="pb-1 pt-6 px-6">
              <CardTitle className="text-lg font-bold text-foreground">Grafik Pengerjaan Per Projek</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Perbandingan tugas selesai dan belum per projek</p>
            </CardHeader>
            <CardContent className="pt-4 px-6 pb-6">
              {chartData.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                  <FolderKanban className="w-10 h-10 opacity-20" />
                  Belum ada data untuk ditampilkan.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} barGap={4} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} dy={8} />
                    <YAxis allowDecimals={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} dx={-4} />
                    <Tooltip
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", color: "var(--foreground)", fontSize: 12, boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }}
                      cursor={{ fill: "var(--accent)", opacity: 0.5, radius: 4 }}
                    />
                    <Bar dataKey="Selesai" stackId="a" fill="oklch(0.55 0.18 260)" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Belum" stackId="a" fill="oklch(0.55 0.18 260)" fillOpacity={0.12} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Recent Projects */}
          <Card className="glass-panel rounded-xl lg:col-span-4 border-0 shadow-md shadow-black/[0.03] dark:shadow-black/20">
            <CardHeader className="pb-1 pt-6 px-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-foreground">Projek Terbaru</CardTitle>
                <Link href="/kelola-projek" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1 bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-full">
                  Lihat semua <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-3 px-6 pb-6">
              {recentProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm gap-2">
                  <FolderKanban className="w-10 h-10 opacity-20" />
                  Belum ada projek.
                </div>
              ) : (
                <div className="space-y-1">
                  {recentProjects.map((p) => {
                    const pTodos = todos.filter((t) => t.project_id === p.id);
                    const doneCnt = pTodos.filter((t) => t.is_done).length;
                    const pct = pTodos.length > 0 ? Math.round((doneCnt / pTodos.length) * 100) : 0;
                    return (
                      <Link
                        key={p.id}
                        href={`/kelola-projek`}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-accent transition-colors group"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {p.nama_projek}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(p.created_at), "dd MMM yyyy")}
                          </p>
                        </div>
                        <div className="flex flex-col items-end ml-3 shrink-0">
                          <span className="text-xs font-bold text-primary">{pct}%</span>
                          <span className="text-[10px] text-muted-foreground">
                            {doneCnt}/{pTodos.length}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
