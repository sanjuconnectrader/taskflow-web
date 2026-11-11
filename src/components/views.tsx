"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {usePagedQuery} from '@/lib/paged-query';
import {StoragePanel} from './storage-panel';
import {
  format,
  startOfMonth,
  startOfWeek,
  endOfMonth,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  addDays,
  isSameMonth,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Download,
  FileText,
  Send,
  FolderOpen,
  MoreHorizontal,
  Shield,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { request, send, API } from "@/lib/api";
import { currentToken } from "@/lib/platform";
import {
  Member,
  Task,
  Project,
  User,
  Report,
  Workspace,
  Comment,
  label,
} from "@/lib/types";
import { Card, Empty, Avatar, Modal, ErrorNotice } from "./ui";
import { Board } from "./board";
import { TaskTable } from "./dashboard";
export function ProjectsView({
  projects,
  members,
  tasks,
  onOpen,
  onCreate,
  onMove,
  onToggle,
  onRefresh,
  wid,
  admin,
  manager,
  readOnly,
}: {
  projects: Project[];
  members: Member[];
  tasks: Task[];
  onOpen: (t: Task) => void;
  onCreate: () => void;
  onMove: any;
  onToggle: (t: Task) => void;
  onRefresh: () => void;
  wid: string;
  admin: boolean;
  manager: boolean;
  readOnly: boolean;
}) {
  const [selected, setSelected] = useState("");
  const [view, setView] = useState("board");
  const [editor, setEditor] = useState<Project | null | undefined>();
  const [error, setError] = useState<unknown>();
  const p = projects.find((p) => p.id === selected);
  return (
    <>
      <div className="toolbar">
        <div className="inline">
          <button
            className={!selected ? "tab active" : "tab"}
            onClick={() => setSelected("")}
          >
            All projects
          </button>
          {p && <span className="muted">/ {p.name}</span>}
        </div>
        <div className="inline">
          {selected && (
            <>
              <button
                className={view === "board" ? "tab active" : "tab"}
                onClick={() => setView("board")}
              >
                Board
              </button>
              <button
                className={view === "list" ? "tab active" : "tab"}
                onClick={() => setView("list")}
              >
                List
              </button>
            </>
          )}
          {(admin || manager) && (
            <button className="primary" onClick={() => setEditor(null)}>
              <Plus size={16} /> New project
            </button>
          )}
        </div>
      </div>
      {!selected ? (
        <div className="project-grid">
          {projects.map((p) => {
            const list = tasks.filter((t) => t.projectId === p.id);
            const complete = list.filter(
              (t) => t.status === "COMPLETED",
            ).length;
            return (
              <article className="card project-card" key={p.id}>
                <header>
                  <span
                    className="project-icon"
                    style={{ background: p.color + "18", color: p.color }}
                  >
                    <FolderOpen size={22} />
                  </span>
                  {(admin || manager) && (
                    <button
                      className="icon-button"
                      aria-label={`Edit ${p.name}`}
                      onClick={() => setEditor(p)}
                    >
                      <MoreHorizontal size={20} />
                    </button>
                  )}
                </header>
                <button
                  className="project-title"
                  onClick={() => setSelected(p.id)}
                >
                  {p.name}
                </button>
                <p>
                  {p.description || "A clear space for your next big idea."}
                </p>
                <div className="progress-bar">
                  <i
                    style={{
                      width: `${list.length ? (complete / list.length) * 100 : 0}%`,
                      background: p.color,
                    }}
                  />
                </div>
                <footer>
                  <small>
                    {complete}/{list.length} tasks complete
                  </small>
                  <span className="badge todo">
                    {p.archived ? "Archived" : "Active"}
                  </span>
                </footer>
              </article>
            );
          })}
          {!projects.length && (
            <Empty title="Build something together">
              Create your first project to start organizing tasks.
            </Empty>
          )}
        </div>
      ) : (
        <Card
          title={p?.name || "Project"}
          subtitle={p?.description}
          action={
            <div className="inline">
              {(admin || manager) && p && (
                <button className="secondary" onClick={() => setEditor(p)}>
                  Edit project
                </button>
              )}
              {!readOnly && (
                <button className="primary" onClick={onCreate}>
                  <Plus size={15} /> Add task
                </button>
              )}
            </div>
          }
        >
          {view === "board" ? (
            <Board
              tasks={tasks.filter((t) => t.projectId === selected)}
              onOpen={onOpen}
              onCreate={onCreate}
              onMove={onMove}
              readOnly={readOnly}
            />
          ) : (
            <TaskTable
              tasks={tasks.filter((t) => t.projectId === selected)}
              onOpen={onOpen}
              onToggle={onToggle}
              readOnly={readOnly}
            />
          )}
        </Card>
      )}
      {editor !== undefined && (
        <Modal
          open
          onClose={() => setEditor(undefined)}
          title={editor ? "Edit project" : "New project"}
        >
          <form
            className="padded-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              try {
                await send(
                  `/workspaces/${wid}/projects${editor ? `/${editor.id}` : ""}`,
                  {
                    name: f.get("name"),
                    description: f.get("description"),
                    color: f.get("color"),
                    dueDate: f.get("dueDate") || null,
                    memberIds: f.getAll("memberIds"),
                  },
                  editor ? "PATCH" : "POST",
                );
                setEditor(undefined);
                onRefresh();
              } catch (e) {
                setError(e);
              }
            }}
          >
            <label>
              Project name
              <input
                name="name"
                defaultValue={editor?.name}
                required
                maxLength={150}
              />
            </label>
            <label>
              Description
              <textarea
                name="description"
                defaultValue={editor?.description}
                rows={3}
              />
            </label>
            <label>Assigned employees
              <select name="memberIds" multiple defaultValue={editor?.members?.map(m=>m.userId) || []}>
                {members.map(m=><option key={m.userId} value={m.userId}>{m.user.displayName}{m.designation ? ` — ${m.designation}` : ''}{m.department ? ` · ${m.department}` : ''}</option>)}
              </select><small className="muted">Use Ctrl/Cmd to select multiple people. Task assignees must be project members.</small>
            </label>
            <div className="two-col">
              <label>
                Color
                <input
                  name="color"
                  type="color"
                  defaultValue={editor?.color || "#4F46E5"}
                />
              </label>
              <label>
                Due date
                <input
                  name="dueDate"
                  type="date"
                  defaultValue={editor?.dueDate || ""}
                />
              </label>
            </div>
            <ErrorNotice error={error} />
            <div className="form-footer">
              {editor && admin && (
                <div className="inline">
                  <button
                    type="button"
                    className="text-button danger"
                    onClick={async () => {
                      if (confirm("Delete this project and all its tasks?")) {
                        try {
                          await send(
                            `/workspaces/${wid}/projects/${editor.id}`,
                            undefined,
                            "DELETE",
                          );
                          setEditor(undefined);
                          setSelected("");
                          onRefresh();
                        } catch (e) {
                          setError(e);
                        }
                      }
                    }}
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    onClick={async () => {
                      try {
                        await send(
                          `/workspaces/${wid}/projects/${editor.id}`,
                          { archived: !editor.archived },
                          "PATCH",
                        );
                        setEditor(undefined);
                        onRefresh();
                      } catch (e) {
                        setError(e);
                      }
                    }}
                  >
                    {editor.archived ? "Restore" : "Archive"}
                  </button>
                </div>
              )}
              <button className="primary">Save project</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
export function CalendarView({
  tasks,
  onOpen,
  onCreate,
}: {
  tasks: Task[];
  onOpen: (t: Task) => void;
  onCreate: (date: string) => void;
}) {
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState("month");
  const begin =
    view === "month"
      ? startOfWeek(startOfMonth(date), { weekStartsOn: 1 })
      : view === "week"
        ? startOfWeek(date, { weekStartsOn: 1 })
        : date;
  const end =
    view === "month"
      ? endOfWeek(endOfMonth(date), { weekStartsOn: 1 })
      : view === "week"
        ? addDays(begin, 6)
        : date;
  const days = eachDayOfInterval({ start: begin, end });
  return (
    <Card
      title={format(date, "MMMM yyyy")}
      subtitle="A little perspective on what’s ahead."
      action={
        <div className="inline">
          <button className="secondary" onClick={() => setDate(new Date())}>
            Today
          </button>
          <button
            className="icon-button"
            aria-label="Previous period"
            onClick={() =>
              setDate(
                view === "month"
                  ? addMonths(date, -1)
                  : addDays(date, view === "week" ? -7 : -1),
              )
            }
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="icon-button"
            aria-label="Next period"
            onClick={() =>
              setDate(
                view === "month"
                  ? addMonths(date, 1)
                  : addDays(date, view === "week" ? 7 : 1),
              )
            }
          >
            <ChevronRight size={18} />
          </button>
          <select
            aria-label="Calendar view"
            value={view}
            onChange={(e) => setView(e.target.value)}
          >
            <option value="month">Month</option>
            <option value="week">Week</option>
            <option value="day">Day</option>
          </select>
        </div>
      }
    >
      <div className={`calendar ${view}`}>
        {days.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          return (
            <div
              className={`calendar-day ${!isSameMonth(d, date) ? "other-month" : ""}`}
              key={key}
            >
              <button
                onClick={() => onCreate(key)}
                className={
                  key === format(new Date(), "yyyy-MM-dd") ? "today" : ""
                }
                aria-label={`Create task on ${key}`}
              >
                {format(d, view === "month" ? "d" : "EEE d")}
              </button>
              {tasks
                .filter((t) => t.dueDate === key)
                .map((t) => (
                  <button
                    className={`calendar-event ${t.status.toLowerCase()}`}
                    key={t.id}
                    onClick={() => onOpen(t)}
                  >
                    {t.title}
                  </button>
                ))}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
export function TeamView({
  members,
  tasks,
  wid,
  admin,
  owner,
  refresh,
}: {
  members: Member[];
  tasks: Task[];
  wid: string;
  admin: boolean;
  owner: boolean;
  refresh: () => void;
}) {
  const [error, setError] = useState<unknown>();
  const [search, setSearch] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  return (
    <Card
      title="People make it happen"
      subtitle={`${members.length} people in your workspace`}
      action={
        <input
          aria-label="Search members"
          placeholder="Search people…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      }
    >
      <div className="member-list">
        {members
          .filter((m) =>
            (m.user.displayName + " " + m.user.email)
              .toLowerCase()
              .includes(search.toLowerCase()),
          )
          .map((m) => (
            <article key={m.userId}>
              <Avatar name={m.user.displayName} />
              <div>
                <strong>{m.user.displayName}</strong>
                <small>{m.user.email}</small>
                {(m.designation || m.department) && <small>{[m.designation,m.department].filter(Boolean).join(" · ")}</small>}
                {m.employeeId && <small>{m.employeeId}</small>}
              </div>
              <span className="muted">
                {
                  tasks.filter(
                    (t) =>
                      t.assignees.some((a) => a.userId === m.userId) &&
                      t.status !== "COMPLETED",
                  ).length
                }{" "}
                active tasks
              </span>
              {owner && m.role !== "OWNER" ? (
                <select
                  aria-label={`Role for ${m.user.displayName}`}
                  value={m.role}
                  onChange={async (e) => {
                    try {
                      await send(
                        `/workspaces/${wid}/members/${m.userId}`,
                        { role: e.target.value },
                        "PATCH",
                      );
                      refresh();
                    } catch (e) {
                      setError(e);
                    }
                  }}
                >
                  {["ADMIN", "PROJECT_MANAGER", "TEAM_LEAD", "EMPLOYEE", "MEMBER", "VIEWER"].map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              ) : (
                <span className="badge todo">{label(m.role)}</span>
              )}
              {admin && m.role !== "OWNER" && (
                <button className="text-button" onClick={async () => {
                  const note = prompt(`After verifying ${m.user.displayName}'s identity, describe how you verified it:`);
                  if (!note) return;
                  try {const result = await send(`/workspaces/${wid}/employees/${m.userId}/reset-password`, {identityVerified:true, verificationNote:note}); setTemporaryPassword(result.temporaryPassword);} catch(e) {setError(e);}
                }}>Reset password</button>
              )}
              {admin && m.role !== "OWNER" && (
                <button
                  className="text-button danger"
                  onClick={async () => {
                    if (
                      confirm(
                        `Remove ${m.user.displayName} from this workspace?`,
                      )
                    )
                      try {
                        await send(
                          `/workspaces/${wid}/members/${m.userId}`,
                          undefined,
                          "DELETE",
                        );
                        refresh();
                      } catch (e) {
                        setError(e);
                      }
                  }}
                >
                  Remove
                </button>
              )}
            </article>
          ))}
      </div>
      {admin && temporaryPassword && <div className="padded-form" role="alert"><h3>One-time temporary password</h3><p>Share this privately with the employee. It cannot be viewed again.</p><code>{temporaryPassword}</code><div className="inline"><button type="button" onClick={() => navigator.clipboard.writeText(temporaryPassword)}>Copy</button><button type="button" onClick={() => setTemporaryPassword(null)}>Done</button></div></div>}
      {admin && <form className="invite-form" onSubmit={async e => {
        e.preventDefault(); const form=e.currentTarget; const values=Object.fromEntries(new FormData(form));
        try {const result=await send(`/workspaces/${wid}/employees`, values); setTemporaryPassword(result.temporaryPassword); form.reset(); refresh();} catch(err) {setError(err);}
      }}>
        <h3>Create employee</h3><p className="muted">A temporary password will be shown once after creation.</p>
        <div className="inline"><label>Full name<input name="fullName" required maxLength={100}/></label><label>Email<input name="email" type="email" required/></label></div>
        <div className="inline"><label>Designation<input name="designation" list="designation-options" maxLength={100}/><datalist id="designation-options">{['Project Manager','Team Lead','Frontend Developer','Backend Developer','Full Stack Developer','UI/UX Designer','QA Engineer','DevOps Engineer','Business Analyst','Marketing Executive'].map(value=><option value={value} key={value}/>)}</datalist></label><label>Department<input name="department" maxLength={100}/></label></div>
        <div className="inline"><label>Phone (optional)<input name="phone" type="tel"/></label><label>Employment status<select name="employmentStatus"><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label></div>
        <label>Company role<select name="role"><option value="EMPLOYEE">Employee</option><option value="PROJECT_MANAGER">Project Manager</option><option value="TEAM_LEAD">Team Lead</option></select></label>
        <button className="primary">Create employee</button>
      </form>}
      {admin && (
        <form
          className="invite-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const el = e.currentTarget;
            const data = new FormData(el);
            try {
              await send(`/workspaces/${wid}/members`, {
                email: data.get("email"),
                role: data.get("role"),
              });
              el.reset();
              refresh();
            } catch (e) {
              setError(e);
            }
          }}
        >
          <h3>Add a teammate</h3>
          <p className="muted">
            Ask your teammate to register, then add their email. No email
            invitation is needed.
          </p>
          <div className="inline">
            <label>
              Email
              <input
                type="email"
                name="email"
                placeholder="teammate@company.com"
                required
              />
            </label>
            <label>
              Role
              <select name="role">
                <option>MEMBER</option>
                <option>VIEWER</option>
                {owner && <option>ADMIN</option>}
              </select>
            </label>
            <button className="primary">Add member</button>
          </div>
        </form>
      )}
      <ErrorNotice error={error} />
    </Card>
  );
}
export function MessagesView({
  wid,
  projects,
  readOnly,
  user,
}: {
  wid: string;
  projects: Project[];
  readOnly: boolean;
  user: User;
}) {
  const [project, setProject] = useState(projects[0]?.id || "");
  const [body, setBody] = useState("");
  const [error, setError] = useState<unknown>();
  const query=usePagedQuery<Comment>(['discussions',wid,project],`/workspaces/${wid}/comments?paged=true&projectId=${project}`,!!project);
  return (
    <Card
      title="Project conversations"
      subtitle="Keep the conversation close to the work."
      action={
        <select
          value={project}
          onChange={(e) => setProject(e.target.value)}
          aria-label="Discussion project"
        >
          <option value="">Choose a project</option>
          {projects.map((p) => (
            <option value={p.id} key={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      }
    >
      <div className="discussion-list">
        {query.items.map((c) => (
          <article className="comment" key={c.id}>
            <Avatar name={c.authorName} />
            <div>
              <strong>{c.authorName}</strong>
              <small>{format(new Date(c.createdAt), "MMM d, h:mm a")}</small>
              <p>{c.body}</p>
              {c.authorId === user.id && !readOnly && (
                <div className="inline">
                  <button
                    className="text-button"
                    onClick={async () => {
                      const body = prompt("Edit comment", c.body);
                      if (body)
                        try {
                          await send(
                            `/workspaces/${wid}/comments/${c.id}`,
                            { body },
                            "PATCH",
                          );
                          query.refetch();
                        } catch (e) {
                          setError(e);
                        }
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="text-button danger"
                    onClick={async () => {
                      if (confirm("Delete this comment?"))
                        try {
                          await send(
                            `/workspaces/${wid}/comments/${c.id}`,
                            undefined,
                            "DELETE",
                          );
                          query.refetch();
                        } catch (e) {
                          setError(e);
                        }
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </article>
        ))}
        {query.hasNextPage&&<button className="secondary" disabled={query.isFetchingNextPage} onClick={()=>query.fetchNextPage()}>Load more messages</button>}
        {!query.items.length && (
          <Empty title="Start a conversation">
            Share an update or mention a teammate with @username.
          </Empty>
        )}
      </div>
      {!readOnly && project && (
        <form
          className="discussion-form inline"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await send(`/workspaces/${wid}/comments`, {
                projectId: project,
                body,
              });
              setBody("");
              query.refetch();
            } catch (e) {
              setError(e);
            }
          }}
        >
          <input
            aria-label="Discussion message"
            placeholder="Share an update with your team…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
          />
          <button className="primary">
            <Send size={16} /> Send
          </button>
        </form>
      )}
      <ErrorNotice error={error || query.error} />
    </Card>
  );
}
export function FilesView({
  wid,
  onOpen,
  tasks,
}: {
  wid: string;
  onOpen: (t: Task) => void;
  tasks: Task[];
}) {
  const [error, setError] = useState<unknown>();
  const [search, setSearch] = useState("");
  const q = usePagedQuery<{
      id: string;
      name: string;
      size: number;
      mime: string;
      createdAt: string;
      taskId: string;
  }>(['files',wid,search],`/files/${wid}?search=${encodeURIComponent(search)}`);
  return (
    <Card
      title="Workspace files"
      subtitle="Private attachments, right where you need them."
      action={
        <input
          aria-label="Search files"
          placeholder="Search files…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      }
    >
      {q.data?.pages[0]?.enabled===false && (
        <p className="notice">
          Your operator needs to configure private file storage before uploads are
          available.
        </p>
      )}
      <div className="file-list">
        {q.items
          .filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
          .map((f) => (
            <article key={f.id}>
              <FileText size={24} />
              <button
                className="text-button"
                onClick={() => {
                  const t = tasks.find((t) => t.id === f.taskId);
                  if (t) onOpen(t);
                }}
              >
                {f.name}
              </button>
              <small>
                {(f.size / 1024).toFixed(1)} KB ·{" "}
                {format(new Date(f.createdAt), "MMM d")}
              </small>
              <button
                className="icon-button"
                aria-label={`Download ${f.name}`}
                onClick={async () => {
                  try {
                    const r = await request(`/files/${wid}/${f.id}/download`);
                    window.open(r.url, "_blank", "noopener,noreferrer");
                  } catch (e) {
                    setError(e);
                  }
                }}
              >
                <Download size={18} />
              </button>
              <button
                className="text-button danger"
                onClick={async () => {
                  if (confirm("Delete this attachment?"))
                    try {
                      await send(`/files/${wid}/${f.id}`, undefined, "DELETE");
                      q.refetch();
                    } catch (e) {
                      setError(e);
                    }
                }}
              >
                Delete
              </button>
            </article>
          ))}
      </div>
      {q.hasNextPage&&<button className="secondary load-more" disabled={q.isFetchingNextPage} onClick={()=>q.fetchNextPage()}>Load more files</button>}
      {!q.items.length && (
        <Empty title="Everything in its place">
          Open a task to attach a PDF, image, or text file.
        </Empty>
      )}
      <ErrorNotice error={error || q.error} />
    </Card>
  );
}
export function ReportsView({
  wid,
  report,
  members,
  projects,
}: {
  wid: string;
  report: Report;
  members: Member[];
  projects: Project[];
}) {
  const [error, setError] = useState<unknown>();
  const bars = Object.entries(report.byStatus).map(([name, count]) => ({
    name: label(name),
    count,
  }));
  return (
    <>
      <div className="toolbar">
        <p className="muted">
          Based on the selected dashboard project and creation date range.
        </p>
        <button
          className="secondary"
          onClick={async () => {
            try {
              const res = await fetch(
                `${API}/api/v1/reports/${wid}?today=${format(new Date(), "yyyy-MM-dd")}&format=csv`,
                {
                  credentials: "include",
                  headers: currentToken()
                    ? { Authorization: `Bearer ${currentToken()}` }
                    : {},
                },
              );
              if (!res.ok) throw new Error("Export failed.");
              const url = URL.createObjectURL(await res.blob());
              const a = document.createElement("a");
              a.href = url;
              a.download = "taskflow-report.csv";
              a.click();
              URL.revokeObjectURL(url);
            } catch (e) {
              setError(e);
            }
          }}
        >
          <Download size={16} /> Export CSV
        </button>
      </div>
      <div className="report-grid">
        <Card
          title="Tasks by status"
          subtitle={`${report.total} tasks · ${report.completionRate}% complete`}
        >
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={bars}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#4f46e5" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card
          title="Workload by member"
          subtitle="Open tasks assigned to each teammate."
        >
          {members.map((m) => (
            <div className="report-row" key={m.userId}>
              <span className="person">
                <Avatar name={m.user.displayName} size="small" />
                {m.user.displayName}
              </span>
              <strong>{report.workload[m.userId] || 0}</strong>
            </div>
          ))}
        </Card>
        <Card
          title="Project completion"
          subtitle="Every milestone moves you forward."
        >
          {projects.map((p) => {
            const s = report.byProject[p.id];
            return (
              <div className="report-row" key={p.id}>
                <span>{p.name}</span>
                <strong>
                  {s?.total ? Math.round((s.completed / s.total) * 100) : 0}%
                </strong>
              </div>
            );
          })}
        </Card>
        <Card title="Tasks by priority">
          {Object.entries(report.byPriority).map(([p, n]) => (
            <div className="report-row" key={p}>
              <span>{label(p)}</span>
              <strong>{n}</strong>
            </div>
          ))}
        </Card>
        <Card title="Completed over time">
          {Object.entries(report.completedOverTime).map(([d, n]) => (
            <div className="report-row" key={d}>
              <span>{d}</span>
              <strong>{n}</strong>
            </div>
          ))}
          {!Object.keys(report.completedOverTime).length && (
            <Empty title="Progress is on its way" />
          )}
        </Card>
      </div>
      <ErrorNotice error={error} />
    </>
  );
}
export function SettingsView({
  user,
  wid,
  workspaceName,
  workspace,
  owner,
  storageAdmin=false,
  onRefresh,
  onLogout,
}: {
  user: User;
  wid: string;
  workspaceName: string;
  workspace?: Workspace;
  owner: boolean;
  storageAdmin?:boolean;
  onRefresh: () => void;
  onLogout: () => void;
}) {
  const [tab, setTab] = useState("profile");
  const [error, setError] = useState<unknown>();
  const [message, setMessage] = useState("");
  const sessions = useQuery<any[]>({
    queryKey: ["sessions"],
    queryFn: () => request("/auth/sessions"),
    enabled: tab === "security",
  });
  const queue = useQuery<any[]>({
    queryKey: ["recovery"],
    queryFn: () => request("/recovery/queue"),
    enabled: tab === "recovery",
  });
  const [authorization, setAuthorization] = useState("");
  const run = async (fn: () => Promise<any>) => {
    try {
      setError(null);
      await fn();
      setMessage("Changes saved.");
      onRefresh();
    } catch (e) {
      setError(e);
    }
  };
  return (
    <div className="settings-layout">
      <nav className="settings-nav">
        {[
          "profile",
          "security",
          "appearance",
          "notifications",
          "workspace",
          ...(storageAdmin?['storage']:[]),
          "recovery",
          "about",
        ].map((t) => (
          <button
            className={tab === t ? "active" : ""}
            key={t}
            onClick={() => {
              setTab(t);
              setMessage("");
              setError(null);
            }}
          >
            {label(t)}
          </button>
        ))}
      </nav>
      <Card title={label(tab)} subtitle="Make TaskFlow work for you.">
        {tab==='storage'&&storageAdmin&&<StoragePanel wid={wid}/>}
        {tab === "profile" && (
          <form
            className="padded-form"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              run(() =>
                send(
                  "/auth/profile",
                  {
                    displayName: data.get("displayName"),
                    username: data.get("username"),
                  },
                  "PATCH",
                ),
              );
            }}
          >
            <Avatar name={user.displayName} size="large" />
            <label>
              Display name
              <input
                name="displayName"
                defaultValue={user.displayName}
                required
              />
            </label>
            <label>
              Username
              <input
                name="username"
                defaultValue={user.username}
                required
                pattern="[a-z0-9_]{3,32}"
              />
            </label>
            <label>
              Email address
              <input value={user.email} readOnly />
            </label>
            <button className="primary">Save profile</button>
          </form>
        )}
        {tab === "security" && (
          <div className="padded-form">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                run(async () => {
                  await send("/auth/password", Object.fromEntries(f));
                  onLogout();
                });
              }}
            >
              <label>
                Current password
                <input
                  type="password"
                  name="currentPassword"
                  required
                  autoComplete="current-password"
                />
              </label>
              <label>
                New password
                <input
                  type="password"
                  name="password"
                  minLength={12}
                  required
                  autoComplete="new-password"
                />
              </label>
              <label>
                Confirm new password
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  autoComplete="new-password"
                />
              </label>
              <button className="primary">Change password & sign out</button>
            </form>
            <h3>Active sessions</h3>
            {sessions.data?.map((s) => (
              <div className="session-row" key={s.id}>
                <Shield size={18} />
                <div>
                  <p>{s.device}</p>
                  <small>
                    Expires {format(new Date(s.expiresAt), "MMM d, yyyy")}
                  </small>
                </div>
              </div>
            ))}
            <button
              className="secondary"
              onClick={() =>
                run(async () => {
                  await send("/auth/logout-all", {});
                  onLogout();
                })
              }
            >
              Sign out of all devices
            </button>
          </div>
        )}
        {tab === "appearance" && (
          <div className="padded-form">
            <label>
              Theme
              <select
                value={user.preferences?.theme || "system"}
                onChange={(e) =>
                  run(() =>
                    send(
                      "/auth/profile",
                      {
                        preferences: {
                          ...user.preferences,
                          theme: e.target.value,
                        },
                      },
                      "PATCH",
                    ),
                  )
                }
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
          </div>
        )}
        {tab === "notifications" && (
          <div className="padded-form">
            {["notifications", "reminders"].map((k) => (
              <label className="check-label" key={k}>
                <input
                  type="checkbox"
                  checked={(user.preferences as any)?.[k] !== false}
                  onChange={(e) =>
                    run(() =>
                      send(
                        "/auth/profile",
                        {
                          preferences: {
                            ...user.preferences,
                            [k]: e.target.checked,
                          },
                        },
                        "PATCH",
                      ),
                    )
                  }
                />
                {k === "reminders"
                  ? "Deadline reminders"
                  : "In-app notifications"}
              </label>
            ))}
          </div>
        )}
        {tab === "workspace" && (
          <div className="padded-form">
            {owner ? (
              <>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fields = Object.fromEntries(new FormData(e.currentTarget));
                    run(() => send(`/workspaces/${wid}`, fields, "PATCH"));
                  }}
                >
                  <label>
                    Workspace name
                    <input name="name" defaultValue={workspaceName} required />
                  </label>
                  <label>Company email<input name="companyEmail" type="email" defaultValue={workspace?.companyEmail || ''}/></label>
                  <label>Phone<input name="phone" type="tel" defaultValue={workspace?.phone || ''}/></label>
                  <label>Website<input name="website" type="url" defaultValue={workspace?.website || ''}/></label>
                  <label>Address<input name="address" defaultValue={workspace?.address || ''}/></label>
                  <label>Industry<input name="industry" defaultValue={workspace?.industry || ''}/></label>
                  <label>Company size<input name="companySize" defaultValue={workspace?.companySize || ''}/></label>
                  <label>Time zone<input name="timezone" defaultValue={workspace?.timezone || 'UTC'} required/></label>
                  <button className="primary">Save company settings</button>
                </form>
                <hr />
                <button
                  className="secondary danger"
                  onClick={() => {
                    const confirmation = prompt(
                      `Enter “${workspaceName}” to permanently delete this workspace.`,
                    );
                    if (confirmation === workspaceName)
                      run(() =>
                        send(`/workspaces/${wid}`, { confirmation }, "DELETE"),
                      );
                  }}
                >
                  Delete workspace
                </button>
              </>
            ) : (
              <p className="muted">
                Workspace settings are managed by your owner.
              </p>
            )}
          </div>
        )}
        {tab === "recovery" && (
          <div className="padded-form">
            <p className="notice">
              Verify identity through an independently established support
              channel before approval. Workspace administrators cannot reset
              owners, administrators, or platform operators. A platform operator
              handles sole-owner recovery separately.
            </p>
            {queue.data?.map((r) => (
              <article className="recovery-item" key={r.id}>
                <strong>Request {r.reference.slice(0, 12)}</strong>
                <p>{r.explanation || "No explanation supplied."}</p>
                <small>Account ID: {r.userId}</small>
                <button
                  className="secondary"
                  onClick={() => {
                    const verificationNotes = prompt(
                      "Record how you independently verified identity (at least 30 characters):",
                    );
                    if (
                      verificationNotes &&
                      confirm(
                        "Confirm identity has been independently verified?",
                      )
                    )
                      run(async () => {
                        const result = await send(`/recovery/${r.id}/approve`, {
                          verified: true,
                          verificationNotes,
                        });
                        setAuthorization(result.authorization);
                        queue.refetch();
                      });
                  }}
                >
                  Verify & approve
                </button>
              </article>
            ))}
            {!queue.data?.length && (
              <Empty title="No eligible recovery requests" />
            )}
            {authorization && (
              <div className="notice">
                <strong>Deliver privately. Expires in 15 minutes.</strong>
                <code className="reset-token">{authorization}</code>
                <button
                  className="secondary"
                  onClick={() => setAuthorization("")}
                >
                  Clear authorization
                </button>
              </div>
            )}
          </div>
        )}
        {tab === "about" && (
          <div className="padded-form">
            <h3>TaskFlow 1.0.0</h3>
            <p>One workspace. Wherever work happens.</p>
            <p className="muted">
              Online access is required to save changes. Your workspace operator
              manages your data and privacy requests. No SMTP or email
              verification is used.
            </p>
          </div>
        )}
        {message && <p className="success-message">{message}</p>}
        <ErrorNotice error={error} />
      </Card>
    </div>
  );
}
