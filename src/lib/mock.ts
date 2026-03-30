export type Todo = {
  id: string;
  project_id: string;
  parent_id: string | null;
  nama_tugas: string;
  deadline: string | null;
  is_done: boolean;
  created_at: string;
  children?: Todo[];
};

export type Project = {
  id: string;
  user_id: string;
  nama_projek: string;
  penjelasan: string;
  progress: number;
  info_server: string;
  created_at: string;
};

export const MOCK_PROJECTS: Project[] = [
  {
    id: "proj-1",
    user_id: "user-1",
    nama_projek: "Website E-Commerce",
    penjelasan: "Pembuatan website e-commerce untuk klien toko baju anak.",
    progress: 45,
    info_server: "VPS Ubuntu 24.04\nIP: 192.168.1.10\nUser: deploy",
    created_at: new Date().toISOString(),
  },
  {
    id: "proj-2",
    user_id: "user-1",
    nama_projek: "Aplikasi Kasir App",
    penjelasan: "Mobile app kasir dengan Flutter dan backend Node.js.",
    progress: 80,
    info_server: "AWS EC2 t3.micro",
    created_at: new Date().toISOString(),
  },
];

export const MOCK_TODOS: Record<string, Todo[]> = {
  "proj-1": [
    {
      id: "todo-1",
      project_id: "proj-1",
      parent_id: null,
      nama_tugas: "Setup Repositori",
      deadline: null,
      is_done: true,
      created_at: new Date().toISOString(),
      children: [
        {
          id: "todo-1-1",
          project_id: "proj-1",
          parent_id: "todo-1",
          nama_tugas: "Init Next.js",
          deadline: null,
          is_done: true,
          created_at: new Date().toISOString(),
        },
      ],
    },
    {
      id: "todo-2",
      project_id: "proj-1",
      parent_id: null,
      nama_tugas: "Buat Backend API",
      deadline: new Date(Date.now() + 86400000 * 3).toISOString(), // +3 days
      is_done: false,
      created_at: new Date().toISOString(),
      children: [],
    },
  ],
};
