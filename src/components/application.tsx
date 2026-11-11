"use client";
import { useEffect, useRef, useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { io } from "socket.io-client";
import {
  LayoutDashboard,
  CheckSquare,
  Folder,
  CalendarDays,
  Users,
  MessageCircle,
  Files,
  ChartNoAxesColumn,
  Settings,
  Search,
  Bell,
  ChevronDown,
  ChevronRight,
  Building2,
  Plus,
  Menu,
  PanelLeftClose,
  LogOut,
  WifiOff,
  UserRound,
  X,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import { API, request, send } from "@/lib/api";
import {
  initializeNative,
  loadSession,
  currentToken,
  saveSession,
} from "@/lib/platform";
import { useUI } from "@/lib/store";
import {
  User,
  Membership,
  Task,
  Project,
  Member,
  Report,
  Activity,
  Status,
} from "@/lib/types";
import type { Notification } from "@/lib/types";
import { label } from "@/lib/types";
import { Logo, Avatar, Modal, Loading, ErrorNotice, Empty, Card, PasswordInput } from "./ui";
import { AuthScreen } from "./auth-screen";
import { Dashboard, TaskTable } from "./dashboard";
import { TaskEditor } from "./task-editor";
import {StorageWarning} from './storage-warning';
import {AppUpdates} from './app-updates';
import {
  CalendarView,
  ProjectsView,
  TeamView,
  MessagesView,
  FilesView,
  ReportsView,
  SettingsView,
} from "./views";
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 20000, refetchOnWindowFocus: true },
    mutations: { retry: false },
  },
});
export function Application() {
  return (
    <QueryClientProvider client={queryClient}>
      <Session />
    </QueryClientProvider>
  );
}
function Session() {
  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);
  const client = useQueryClient();
  useEffect(() => {
    loadSession()
      .catch(() => saveSession(null))
      .finally(() => setReady(true));
    initializeNative().catch(console.error);
    const handle = () => {
      setExpired(true);
      saveSession(null);
      client.removeQueries({ predicate: (q) => q.queryKey[0] !== "me" });
    };
    window.addEventListener("session-expired", handle);
    return () => window.removeEventListener("session-expired", handle);
  }, [client]);
  const me = useQuery<User>({
    queryKey: ["me"],
    queryFn: () => request("/auth/me"),
    enabled: ready && !expired,
    retry: false,
  });
  const login = () => {
    setExpired(false);
    client.invalidateQueries({ queryKey: ["me"] });
    me.refetch();
  };
  const logout = async () => {
    try {
      await send("/auth/logout", {});
    } finally {
      await saveSession(null);
      setExpired(true);
      client.clear();
    }
  };
  useEffect(() => {
    const theme = me.data?.preferences?.theme || "system";
    document.documentElement.dataset.theme =
      theme === "system"
        ? matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : theme;
  }, [me.data]);
  if (!ready || (!expired && me.isPending)) return <Loading />;
  if (expired || me.isError || !me.data) return <AuthScreen onLogin={login} />;
  if (me.data.mustChangePassword) return <SetPassword onDone={login} onLogout={logout} />;
  return <WorkspaceApp user={me.data} onLogout={logout} />;
}
function SetPassword({onDone, onLogout}: {onDone: () => void; onLogout: () => void}) {
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  return <main className="auth-page"><section className="auth-panel"><div className="auth-form">
    <Logo /><h1>Set Your New Password</h1><p className="muted">Choose a new password before accessing your company workspace.</p>
    <form onSubmit={async e => {e.preventDefault(); setBusy(true); setError(null); try {
      const result = await send("/auth/password", Object.fromEntries(new FormData(e.currentTarget)));
      if (result.token) await saveSession(result.token);
      onDone();
    } catch (err) {setError(err);} finally {setBusy(false);}}}>
      <label>Current temporary password<PasswordInput name="currentPassword" autoComplete="current-password" required /></label>
      <label>New password<PasswordInput name="password" minLength={8} maxLength={128} autoComplete="new-password" required /></label>
      <label>Confirm new password<PasswordInput name="confirmPassword" minLength={8} maxLength={128} autoComplete="new-password" required /></label>
      <ErrorNotice error={error} /><button className="primary full" disabled={busy}>{busy ? "Saving…" : "Set Password"}</button>
      <button type="button" onClick={onLogout}>Sign Out</button>
    </form>
  </div></section></main>;
}
const nav = [
  { id: "dashboard", name: "Dashboard", icon: LayoutDashboard },
  { id: "tasks", name: "My Tasks", icon: CheckSquare },
  { id: "projects", name: "Projects", icon: Folder },
  { id: "calendar", name: "Calendar", icon: CalendarDays },
  { id: "notifications", name: "Notifications", icon: Bell },
  { id: "team", name: "Team", icon: Users },
  { id: "messages", name: "Messages", icon: MessageCircle },
  { id: "files", name: "Files", icon: Files },
  { id: "reports", name: "Reports", icon: ChartNoAxesColumn },
  { id: "settings", name: "Settings", icon: Settings },
];
function WorkspaceApp({
  user,
  onLogout,
}: {
  user: User;
  onLogout: () => void;
}) {
  const client = useQueryClient();
  const ui = useUI();
  const [tab, setTab] = useState("dashboard");
  const [drawer, setDrawer] = useState(false);
  const [online, setOnline] = useState(true);
  const [editor, setEditor] = useState<Task | null | undefined>();
  const [initialDate, setInitialDate] = useState<string>();
  const [error, setError] = useState<unknown>();
  const [toast, setToast] = useState("");
  const [projectId, setProjectId] = useState("");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [taskFilter, setTaskFilter] = useState("all");
  const [taskSearch, setTaskSearch] = useState("");
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const memberships = useQuery<Membership[]>({
    queryKey: ["workspaces"],
    queryFn: () => request("/workspaces"),
  });
  const membership =
    memberships.data?.find((m) => m.workspaceId === ui.workspaceId) ||
    memberships.data?.[0];
  const wid = membership?.workspaceId || "";
  const admin = ["OWNER", "ADMIN"].includes(membership?.role || "");
  const manager = membership?.role === 'PROJECT_MANAGER' || membership?.role === 'TEAM_LEAD';
  const restricted = (membership?.role === 'EMPLOYEE' || !!membership?.employeeId || !!membership?.workspace.enforceProjectAccess) && !admin && !manager;
  const readOnly =
    membership?.role === "VIEWER" || !!membership?.workspace.archived;
  const base = `/workspaces/${wid}`;
  const today = format(new Date(), "yyyy-MM-dd");
  const projects = useQuery<Project[]>({
    queryKey: ["projects", wid],
    queryFn: () => request(`${base}/projects`),
    enabled: !!wid,
  });
  const members = useQuery<Member[]>({
    queryKey: ["members", wid],
    queryFn: () => request(`${base}/members`),
    enabled: !!wid,
  });
  const tasks = useQuery<{ items: Task[]; total: number }>({
    queryKey: ["tasks", wid, page, taskSearch],
    queryFn: () =>
      request(
        `${base}/tasks?summary=true&limit=100&page=${page}${taskSearch ? `&search=${encodeURIComponent(taskSearch)}` : ""}`,
      ),
    enabled: !!wid,
  });
  const report = useQuery<Report>({
    queryKey: ["report", wid, projectId, from, to, today],
    queryFn: () =>
      request(
        `/reports/${wid}?today=${today}${projectId ? `&projectId=${projectId}` : ""}${from ? `&from=${from}` : ""}${to ? `&to=${to}` : ""}`,
      ),
    enabled: !!wid,
  });
  const activities = useQuery<Activity[]>({
    queryKey: ["activity", wid],
    queryFn: () => request(`${base}/activity`),
    enabled: !!wid,
  });
  const notifications = useQuery<Notification[]>({
    queryKey: ["notifications", wid],
    queryFn: () => request(`${base}/notifications`),
    enabled: !!wid,
    refetchInterval: 60000,
  });
  const searchQuery = useQuery<any>({
    queryKey: ["search", wid, search],
    queryFn: () => request(`${base}/search?q=${encodeURIComponent(search)}`),
    enabled: searchOpen && search.trim().length > 1 && !!wid,
  });
  const refresh = () => client.invalidateQueries();
  const move = useMutation({
    mutationFn: ({ task, status }: { task: Task; status: Status }) =>
      send(
        `${base}/tasks/${task.id}`,
        { status, version: task.version },
        "PATCH",
      ),
    onMutate: async ({ task, status }) => {
      await client.cancelQueries({ queryKey: ["tasks", wid] });
      const snapshots = client.getQueriesData({ queryKey: ["tasks", wid] });
      client.setQueriesData({ queryKey: ["tasks", wid] }, (data: any) =>
        data
          ? {
              ...data,
              items: data.items.map((t: Task) =>
                t.id === task.id ? { ...t, status } : t,
              ),
            }
          : data,
      );
      return { snapshots };
    },
    onError: (error, _vars, context) => {
      context?.snapshots.forEach(([key, value]) =>
        client.setQueryData(key, value),
      );
      setError(error);
    },
    onSuccess: () => {
      setToast("Task updated");
    },
    onSettled: () => refresh(),
  });
  const navigate = (dest: string) => {
    location.hash = dest;
    setTab(dest);
    setDrawer(false);
    setTaskSearch("");
    setPage(1);
  };
  useEffect(() => {
    const change = () => {
      const dest = location.hash.slice(1).split("?")[0];
      setTab(nav.some((n) => n.id === dest) ? dest : "dashboard");
    };
    change();
    window.addEventListener("hashchange", change);
    const net = () => setOnline(navigator.onLine);
    net();
    window.addEventListener("online", net);
    window.addEventListener("offline", net);
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("hashchange", change);
      window.removeEventListener("online", net);
      window.removeEventListener("offline", net);
      window.removeEventListener("keydown", key);
    };
  }, []);
  useEffect(() => {
    setProjectId("");
    setEditor(undefined);
    setPage(1);
    setTaskSearch("");
  }, [wid]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (!wid) return;
    const socket = io(API, {
      withCredentials: true,
      auth: currentToken() ? { token: currentToken() } : undefined,
    });
    socket.on("connect", () => {
      socket.emit("workspace:join", wid);
      client.invalidateQueries();
    });
    socket.on("invalidate", () => client.invalidateQueries());
    socket.on("notification", (event: {title:string;message?:string}) => {
      client.invalidateQueries({queryKey:["notifications",wid]});
      setToast(event.message ? `${event.title}: ${event.message}` : event.title);
      if (user.preferences?.notifications !== false && "Notification" in window && Notification.permission === "granted") new Notification(event.title,{body:event.message || "TaskFlow notification"});
    });
    return () => {
      socket.disconnect();
    };
  }, [wid, client]);
  const openTask = async (t: Task) => {
    setInitialDate(undefined);
    try {setEditor(await request<Task>(`${base}/tasks/${t.id}`));}catch(error){setError(error);}
  };
  const createTask = (date?: string) => {
    if (readOnly || restricted) return;
    setInitialDate(date);
    setEditor(null);
  };
  const toggle = (t: Task) =>
    move.mutate({
      task: t,
      status: t.status === "COMPLETED" ? "TODO" : "COMPLETED",
    });
  const allTasks = tasks.data?.items || [];
  const visible = allTasks.filter(
    (t) => !projectId || t.projectId === projectId,
  );
  const filtered = visible.filter(
    (t) =>
      taskFilter === "all" ||
      (taskFilter === "today" && t.dueDate === today) ||
      (taskFilter === "upcoming" &&
        !!t.dueDate &&
        t.dueDate > today &&
        t.status !== "COMPLETED") ||
      (taskFilter === "overdue" &&
        !!t.dueDate &&
        t.dueDate < today &&
        !["COMPLETED", "CANCELLED"].includes(t.status)) ||
      (taskFilter === "completed" && t.status === "COMPLETED") ||
      (taskFilter === "assigned" &&
        t.assignees.some((a) => a.userId === user.id)) ||
      (taskFilter === "created" && t.creatorId === user.id),
  );
  const unread = notifications.data?.filter((n) => !n.read).length || 0;
  const workspaceMenu = (
    <>
      <Dropdown.Label className="dropdown-label">
        YOUR WORKSPACES
      </Dropdown.Label>
      {memberships.data?.map((m) => (
        <Dropdown.Item
          key={m.workspaceId}
          className="dropdown-item"
          onSelect={() => {
            ui.setWorkspace(m.workspaceId);
            setDrawer(false);
          }}
        >
          <Building2 size={16} />
          {m.workspace.name}
          {m.workspaceId === wid && <span className="menu-check">✓</span>}
        </Dropdown.Item>
      ))}
      <Dropdown.Separator className="dropdown-separator" />
      <Dropdown.Item
        className="dropdown-item"
        onSelect={async () => {
          const name = prompt("Name your new workspace");
          if (name?.trim())
            try {
              const w = await send("/workspaces", { name: name.trim() });
              ui.setWorkspace(w.id);
              refresh();
            } catch (e) {
              setError(e);
            }
        }}
      >
        <Plus size={16} /> Create workspace
      </Dropdown.Item>
    </>
  );
  return (
    <div className={`app-shell ${ui.collapsed ? "sidebar-collapsed" : ""}`}>
      <AppUpdates />
      <div
        className={`drawer-scrim ${drawer ? "visible" : ""}`}
        onClick={() => setDrawer(false)}
      />
      <aside className={`sidebar ${drawer ? "open" : ""}`}>
        <div className="sidebar-brand">
          <Logo />
          <button
            className="icon-button mobile-close"
            aria-label="Close menu"
            onClick={() => setDrawer(false)}
          >
            <X size={20} />
          </button>
        </div>
        <nav aria-label="Main navigation">
          {nav.filter(n => !restricted || !['team','reports'].includes(n.id)).map((n) => (
            <button
              key={n.id}
              className={`nav-item ${tab === n.id ? "active" : ""}`}
              onClick={() => navigate(n.id)}
              title={ui.collapsed ? n.name : undefined}
              aria-current={tab === n.id ? "page" : undefined}
            >
              <n.icon size={21} />
              <span>{restricted && n.id === 'projects' ? 'My Projects' : restricted && n.id === 'settings' ? 'Profile' : n.name}</span>
              {n.id === "messages" && unread > 0 && <b>{unread}</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className="collapse-control"
            onClick={() => ui.setCollapsed(!ui.collapsed)}
            title="Collapse navigation"
          >
            <PanelLeftClose size={17} />
            <span>Collapse sidebar</span>
          </button>
          <Dropdown.Root>
            <Dropdown.Trigger className="workspace-switch">
              <span className="workspace-icon">
                <Building2 size={21} />
              </span>
              <span>
                <strong>
                  {membership?.workspace.name || "Your workspace"}
                </strong>
                <small>{membership?.role || "Workspace"}</small>
              </span>
              <ChevronRight size={16} />
            </Dropdown.Trigger>
            <Dropdown.Portal>
              <Dropdown.Content
                className="dropdown-content"
                side="top"
                align="start"
              >
                {workspaceMenu}
              </Dropdown.Content>
            </Dropdown.Portal>
          </Dropdown.Root>
        </div>
      </aside>
      <div className="main-area">
        <header className="app-header">
          <div className="mobile-header-brand">
            <button
              className="icon-button"
              aria-label="Open menu"
              onClick={() => setDrawer(true)}
            >
              <Menu size={23} />
            </button>
            <Logo />
          </div>
          <button className="header-search" onClick={() => setSearchOpen(true)}>
            <Search size={18} />
            <span>Search tasks, projects, or people…</span>
            <kbd>⌘ K</kbd>
          </button>
          <div className="header-actions">
            {!readOnly && !restricted && (
              <button
                className="primary header-create"
                onClick={() => createTask()}
              >
                <Plus size={16} /> Create task
              </button>
            )}
            <button
              className="icon-button notification-trigger"
              aria-label={`Notifications, ${unread} unread`}
              onClick={() => navigate("notifications")}
            >
              <Bell size={21} />
              {unread > 0 && <i />}
            </button>
            <Dropdown.Root>
              <Dropdown.Trigger className="profile-trigger">
                <Avatar name={user.displayName} />
                <span>
                  <strong>{user.displayName}</strong>
                  <small>
                    {membership?.role === "OWNER"
                      ? "Workspace Owner"
                      : "Team Member"}
                  </small>
                </span>
                <ChevronDown size={16} />
              </Dropdown.Trigger>
              <Dropdown.Portal>
                <Dropdown.Content className="dropdown-content" align="end">
                  <Dropdown.Item
                    className="dropdown-item"
                    onSelect={() => navigate("settings")}
                  >
                    <UserRound size={16} /> My profile
                  </Dropdown.Item>
                  <Dropdown.Item
                    className="dropdown-item"
                    onSelect={() => onLogout()}
                  >
                    <LogOut size={16} /> Sign out
                  </Dropdown.Item>
                </Dropdown.Content>
              </Dropdown.Portal>
            </Dropdown.Root>
          </div>
        </header>
        {!online && (
          <div className="offline-banner">
            <WifiOff size={17} /> You’re offline. Reconnect before saving
            changes. <button onClick={() => refresh()}>Retry</button>
          </div>
        )}
        <main className="page-content">
          <div className="page-heading">
            <div>
              <h1>
                {nav.find((n) => n.id === tab)?.name === "My Tasks"
                  ? "My Tasks"
                  : nav.find((n) => n.id === tab)?.name}
              </h1>
              <p>
                {
                  (
                    {
                      dashboard:
                        "Get a quick overview of your tasks, projects, and team progress.",
                      tasks: "A clear view of what needs your attention.",
                      projects: "Turn shared ideas into meaningful progress.",
                      calendar: "Your work, with a little perspective.",
                      team: "Good work starts with great people.",
                      messages: "Keep everyone on the same page.",
                      files: "Everything your team needs, together.",
                      reports: "See how far your team has come.",
                      settings: "Your workspace. Your way.",
                    } as Record<string, string>
                  )[tab]
                }
              </p>
            </div>
            <div className="heading-controls">
              {["dashboard", "reports"].includes(tab) && (
                <div className="date-range">
                  <CalendarDays size={16} />
                  <input
                    type="date"
                    aria-label="Report start date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                  />
                  <span>–</span>
                  <input
                    type="date"
                    aria-label="Report end date"
                    value={to}
                    min={from}
                    onChange={(e) => setTo(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
          {admin&&wid&&<StorageWarning wid={wid} onOpen={()=>navigate('settings')}/>}
          <ErrorNotice
            error={
              error ||
              memberships.error ||
              projects.error ||
              tasks.error ||
              report.error
            }
          />
          {!!error && (
            <button
              className="text-button"
              onClick={() => {
                setError(null);
                refresh();
              }}
            >
              Dismiss & reload
            </button>
          )}
          {memberships.isPending ? (
            <Loading />
          ) : !wid ? (
            <Empty title="Your next chapter starts here">
              <button
                className="primary"
                onClick={async () => {
                  const name = prompt("Workspace name");
                  if (name) {
                    await send("/workspaces", { name });
                    refresh();
                  }
                }}
              >
                Create a workspace
              </button>
            </Empty>
          ) : tasks.isPending || projects.isPending || members.isPending ? (
            <Loading />
          ) : (
            <>
              {tab === "dashboard" && report.data && (
                <Dashboard
                  tasks={visible}
                  projects={projects.data || []}
                  report={report.data}
                  activities={activities.data || []}
                  projectId={projectId}
                  setProjectId={setProjectId}
                  onOpen={openTask}
                  onCreate={() => createTask()}
                  onMove={(task: Task, status: Status) =>
                    move.mutate({ task, status })
                  }
                  onToggle={toggle}
                  navigate={navigate}
                  readOnly={readOnly}
                />
              )}
              {tab === "tasks" && (
                <>
                  <div className="toolbar">
                    <div className="filter-tabs">
                      {[
                        { id: "all", name: "All Tasks" },
                        { id: "today", name: "Today" },
                        { id: "upcoming", name: "Upcoming" },
                        { id: "overdue", name: "Overdue" },
                        { id: "completed", name: "Completed" },
                        { id: "assigned", name: "Assigned to Me" },
                        { id: "created", name: "Created by Me" },
                      ].map((f) => (
                        <button
                          key={f.id}
                          className={taskFilter === f.id ? "tab active" : "tab"}
                          onClick={() => setTaskFilter(f.id)}
                        >
                          {f.name}
                        </button>
                      ))}
                    </div>
                    {!readOnly && (
                      <button className="primary" onClick={() => createTask()}>
                        <Plus size={16} /> New task
                      </button>
                    )}
                  </div>
                  <Card
                    title="Your tasks"
                    subtitle={`${tasks.data?.total || 0} tasks in this workspace`}
                    action={
                      <input
                        aria-label="Filter tasks"
                        placeholder="Search tasks…"
                        value={taskSearch}
                        onChange={(e) => {
                          setPage(1);
                          setTaskSearch(e.target.value);
                        }}
                      />
                    }
                  >
                    <TaskTable
                      tasks={filtered}
                      onOpen={openTask}
                      onToggle={toggle}
                      readOnly={readOnly}
                    />
                    <footer className="pagination">
                      <button
                        className="secondary"
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                      >
                        Previous
                      </button>
                      <span>Page {page}</span>
                      <button
                        className="secondary"
                        disabled={page * 100 >= (tasks.data?.total || 0)}
                        onClick={() => setPage(page + 1)}
                      >
                        Next
                      </button>
                    </footer>
                  </Card>
                </>
              )}
              {tab === "projects" && (
                <ProjectsView
                  projects={projects.data || []}
                  members={members.data || []}
                  tasks={allTasks}
                  onOpen={openTask}
                  onCreate={() => createTask()}
                  onMove={(task: Task, status: Status) =>
                    move.mutate({ task, status })
                  }
                  onToggle={toggle}
                  onRefresh={refresh}
                  wid={wid}
                  admin={admin && !readOnly}
                  manager={membership?.role === 'PROJECT_MANAGER' && !readOnly}
                  readOnly={readOnly}
                />
              )}
              {tab === "calendar" && (
                <CalendarView
                  tasks={visible}
                  onOpen={openTask}
                  onCreate={createTask}
                />
              )}
              {tab === "team" && (
                <TeamView
                  members={members.data || []}
                  tasks={allTasks}
                  wid={wid}
                  admin={admin && !readOnly}
                  owner={membership?.role === "OWNER"}
                  refresh={refresh}
                />
              )}
              {tab === "messages" && (
                <MessagesView
                  wid={wid}
                  projects={projects.data || []}
                  readOnly={readOnly}
                  user={user}
                />
              )}
              {tab === "notifications" && (
                <NotificationsPage
                  notifications={notifications.data || []}
                  onOpen={async (n) => {
                    await send(`${base}/notifications/read`, { id: n.id });
                    if (n.taskId) openTask(await request(`${base}/tasks/${n.taskId}`));
                    refresh();
                  }}
                  onRead={async (id) => { await send(`${base}/notifications/read`, id ? { id } : {}); refresh(); }}
                />
              )}
              {tab === "files" && (
                <FilesView wid={wid} tasks={allTasks} onOpen={openTask} />
              )}
              {tab === "reports" && report.data && (
                <ReportsView
                  wid={wid}
                  report={report.data}
                  members={members.data || []}
                  projects={projects.data || []}
                />
              )}
              {tab === "settings" && (
                <SettingsView
                  user={user}
                  wid={wid}
                  workspaceName={membership?.workspace.name || ""}
                  workspace={membership?.workspace}
                  owner={membership?.role === "OWNER"}
                  storageAdmin={admin}
                  onRefresh={refresh}
                  onLogout={onLogout}
                />
              )}
            </>
          )}
          {tasks.data && tasks.data.total > 100 && tab !== "tasks" && (
            <p className="notice">
              This view shows the first 100 tasks. Use My Tasks pagination to
              browse the full workspace.
            </p>
          )}
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {[
          { id: "dashboard", name: "Home", icon: LayoutDashboard },
          { id: "tasks", name: "Tasks", icon: CheckSquare },
          { id: "projects", name: "Projects", icon: Folder },
          { id: "calendar", name: "Calendar", icon: CalendarDays },
          { id: "settings", name: "Profile", icon: UserRound },
        ].map((n) => (
          <button
            className={tab === n.id ? "active" : ""}
            key={n.id}
            onClick={() => navigate(n.id)}
          >
            <n.icon size={23} />
            <span>{n.name}</span>
          </button>
        ))}
      </nav>
      {!readOnly && !restricted && (
        <button
          className="mobile-fab"
          aria-label="Create task"
          onClick={() => createTask()}
        >
          <Plus size={25} />
        </button>
      )}
      {editor !== undefined && (
        <TaskEditor
          key={editor?.id || `new-${initialDate}`}
          task={editor || undefined}
          projects={projects.data || []}
          members={members.data || []}
          wid={wid}
          onClose={() => setEditor(undefined)}
          onSaved={refresh}
          readOnly={readOnly}
          restricted={restricted}
          initialDate={initialDate}
        />
      )}
      <Modal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        title="Search your workspace"
      >
        <div className="search-dialog">
          <label>
            Tasks, projects, people, and files
            <input
              ref={searchRef}
              autoFocus
              placeholder="Type to search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          {searchQuery.isFetching && <Loading />}
          <ErrorNotice error={searchQuery.error} />
          {searchQuery.data && (
            <div className="search-results">
              {[
                { key: "tasks", title: "Tasks" },
                { key: "projects", title: "Projects" },
                { key: "members", title: "People" },
                { key: "files", title: "Files" },
              ].map((group) => (
                <section key={group.key}>
                  <h3>{group.title}</h3>
                  {searchQuery.data[group.key]?.map((item: any) => (
                    <button
                      key={item.id || item.userId}
                      onClick={async () => {
                        if (group.key === "tasks" || group.key === "files") {
                          try {
                            const t = await request<Task>(
                              `${base}/tasks/${item.taskId || item.id}`,
                            );
                            openTask(t);
                          } catch (e) {
                            setError(e);
                          }
                        } else
                          navigate(
                            group.key === "members" ? "team" : "projects",
                          );
                        setSearchOpen(false);
                      }}
                    >
                      {item.title || item.name || item.user?.displayName}
                      <ArrowRight size={14} />
                    </button>
                  ))}
                </section>
              ))}
              {Object.values(searchQuery.data).every(
                (v) => !(v as any[]).length,
              ) && <Empty title="No matching results" />}
            </div>
          )}
        </div>
      </Modal>
      <Modal
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        title="Notifications"
      >
        <div className="notifications-list">
          <button
            className="text-button"
            onClick={async () => {
              try {
                await send(`${base}/notifications/read`, {});
                refresh();
              } catch (e) {
                setError(e);
              }
            }}
          >
            Mark all as read
          </button>
          {notifications.data?.map((n) => (
            <button
              key={n.id}
              className={n.read ? "notification read" : "notification"}
              onClick={async () => {
                try {
                  await send(`${base}/notifications/read`, { id: n.id });
                  if (n.taskId)
                    openTask(await request(`${base}/tasks/${n.taskId}`));
                  refresh();
                  setNotificationsOpen(false);
                } catch (e) {
                  setError(e);
                }
              }}
            >
              <Bell size={18} />
              <span>
                {n.title}
                <small>{new Date(n.createdAt).toLocaleString()}</small>
              </span>
            </button>
          ))}
          {!notifications.data?.length && (
            <Empty title="You’re all caught up" />
          )}
        </div>
      </Modal>
      {toast && (
        <div className="toast" role="status">
          ✓ {toast}
        </div>
      )}
    </div>
  );
}
function NotificationsPage({notifications,onOpen,onRead}:{notifications:Notification[];onOpen:(notification:Notification)=>Promise<void>;onRead:(id?:string)=>Promise<void>}) {
  const [status,setStatus]=useState<'all'|'unread'|'read'>('all');
  const [type,setType]=useState('all');
  const types=[...new Set(notifications.map(n=>n.type))];
  const shown=notifications.filter(n=>(status==='all'||(status==='read')===n.read)&&(type==='all'||n.type===type)).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
  return <Card title="Notifications" subtitle="Updates from your authorized projects" action={<div className="inline"><select aria-label="Notification status" value={status} onChange={e=>setStatus(e.target.value as typeof status)}><option value="all">All</option><option value="unread">Unread</option><option value="read">Read</option></select><select aria-label="Notification type" value={type} onChange={e=>setType(e.target.value)}><option value="all">All types</option>{types.map(value=><option key={value} value={value}>{label(value)}</option>)}</select><button className="text-button" onClick={()=>onRead()}>Mark all as read</button></div>}>
    <div className="notification-summary"><span className="notification-emblem"><Bell size={24}/></span><div><strong>Your team, in the loop</strong><p>{notifications.filter(n=>!n.read).length} unread updates · Stay on top of your work</p></div></div>
    <div className="notification-tabs" role="group" aria-label="Filter notifications">{(['all','unread','read'] as const).map(value=><button key={value} className={status===value?'active':''} aria-pressed={status===value} onClick={()=>setStatus(value)}>{label(value)}</button>)}</div>
    <div className="notifications-list">{shown.map(n=><article key={n.id} className={`notification-row ${n.read?'read':'unread'}`}><button className="notification-content" onClick={()=>onOpen(n)}><span className="notification-emblem"><Bell size={19}/></span><span><small className="notification-category">{label(n.type)}</small><strong>{n.title}</strong>{n.message&&<p>{n.message}</p>}<time dateTime={n.createdAt}>{new Date(n.createdAt).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</time></span></button>{!n.read&&<button className="notification-mark" aria-label={`Mark ${n.title} as read`} onClick={()=>onRead(n.id)}>Mark read</button>}</article>)}{!shown.length&&<Empty title="You’re all caught up"/>}</div>
  </Card>;
}
