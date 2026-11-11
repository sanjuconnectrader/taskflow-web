"use client";
import {
  CalendarDays,
  Play,
  CheckCircle2,
  TriangleAlert,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Layers,
} from "lucide-react";
import { format, formatDistanceToNow, addDays, startOfWeek } from "date-fns";
import { Task, Project, Report, Activity } from "@/lib/types";
import { Avatar, Badge, Card, Empty } from "./ui";
import { Board } from "./board";
export function TaskTable({
  tasks,
  onOpen,
  onToggle,
  readOnly = false,
}: {
  tasks: Task[];
  onOpen: (t: Task) => void;
  onToggle: (t: Task) => void;
  readOnly?: boolean;
}) {
  return tasks.length ? (
    <div className="table-wrap">
      <table className="task-table">
        <thead>
          <tr>
            <th>Task</th>
            <th>Assignee</th>
            <th>Due Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr key={t.id}>
              <td>
                <div className="task-name">
                  <input
                    aria-label={`Complete ${t.title}`}
                    type="checkbox"
                    checked={t.status === "COMPLETED"}
                    onChange={() => onToggle(t)}
                    disabled={readOnly}
                  />
                  <button
                    onClick={() => onOpen(t)}
                    className={t.status === "COMPLETED" ? "completed-text" : ""}
                  >
                    {t.title}
                    <small className="mobile-project">
                      <Layers size={12} />
                      {t.project.name}
                    </small>
                  </button>
                  {["HIGH", "URGENT"].includes(t.priority) && (
                    <span className="priority-dot" title={t.priority} />
                  )}
                </div>
              </td>
              <td>
                <div className="person">
                  {t.assignees[0] ? (
                    <>
                      <Avatar
                        name={t.assignees[0].user.displayName}
                        size="small"
                      />
                      <span>{t.assignees[0].user.displayName}</span>
                    </>
                  ) : (
                    <span className="muted">Unassigned</span>
                  )}
                </div>
              </td>
              <td>
                <span className="date-cell">
                  <CalendarDays size={14} />
                  {t.dueDate
                    ? format(new Date(t.dueDate + "T12:00:00"), "MMM d, yyyy")
                    : "No deadline"}
                </span>
              </td>
              <td>
                <Badge task={t} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty title="A little room to get started">
      Create a task and give your next idea a clear next step.
    </Empty>
  );
}
export function Dashboard({
  tasks,
  projects,
  report,
  activities,
  projectId,
  setProjectId,
  onOpen,
  onCreate,
  onMove,
  onToggle,
  navigate,
  readOnly,
}: {
  tasks: Task[];
  projects: Project[];
  report: Report;
  activities: Activity[];
  projectId: string;
  setProjectId: (v: string) => void;
  onOpen: (t: Task) => void;
  onCreate: () => void;
  onMove: any;
  onToggle: (t: Task) => void;
  navigate: (s: string) => void;
  readOnly: boolean;
}) {
  const today = format(new Date(), "yyyy-MM-dd");
  const week = startOfWeek(new Date(), { weekStartsOn: 1 });
  const sorted = tasks
    .filter(
      (t) => t.dueDate && t.status !== "COMPLETED" && t.status !== "CANCELLED",
    )
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!));
  const stats = [
    {
      title: "Tasks Due Today",
      value: report.dueToday,
      icon: CalendarDays,
      tone: "blue",
      note: "Keep today moving",
    },
    {
      title: "In Progress",
      value: report.inProgress,
      icon: Play,
      tone: "purple",
      note: "Good things in motion",
    },
    {
      title: "Completed This Week",
      value: report.completedThisWeek,
      icon: CheckCircle2,
      tone: "green",
      note: "Every step counts",
    },
    {
      title: "Overdue",
      value: report.overdue,
      icon: TriangleAlert,
      tone: "red",
      note: report.overdue ? "Ready for a fresh plan" : "You’re right on track",
    },
  ];
  return (
    <>
      <div className="stats-grid">
        {stats.map((s) => (
          <section className="stat card" key={s.title}>
            <span className={`stat-icon ${s.tone}`}>
              <s.icon size={25} />
            </span>
            <div>
              <span>{s.title}</span>
              <strong>{s.value}</strong>
              <small
                className={s.tone === "red" && s.value ? "danger" : "muted"}
              >
                {s.note}
              </small>
            </div>
          </section>
        ))}
      </div>
      <div className="dashboard-middle">
        <Card
          title="Task Progress"
          subtitle="Overall progress across all projects."
          action={
            <select
              aria-label="Filter dashboard by project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          }
        >
          <div className="progress-content">
            <div
              className="donut"
              style={{
                background: `conic-gradient(#4f46e5 0% ${report.completionRate}%, #b9dcff ${report.completionRate}% ${report.total ? 100 - ((report.byStatus.TODO || 0) / report.total) * 100 : 100}%, #e9edf3 0%)`,
              }}
              role="img"
              aria-label={`${report.completionRate}% complete`}
            >
              <div>
                <strong>{report.completionRate}%</strong>
                <span>Complete</span>
              </div>
            </div>
            <div className="progress-legend">
              {[
                {
                  name: "Completed",
                  value: report.completed,
                  color: "#16b968",
                },
                {
                  name: "In Progress",
                  value:
                    (report.byStatus.IN_PROGRESS || 0) +
                    (report.byStatus.IN_REVIEW || 0),
                  color: "#249cff",
                },
                {
                  name: "To Do",
                  value: report.byStatus.TODO || 0,
                  color: "#cbd5e1",
                },
                ...(report.byStatus.BLOCKED ? [{name:"Blocked",value:report.byStatus.BLOCKED,color:"#e07727"}] : []),
                ...(report.byStatus.CANCELLED
                  ? [
                      {
                        name: "Cancelled",
                        value: report.byStatus.CANCELLED,
                        color: "#94a3b8",
                      },
                    ]
                  : []),
              ].map((x) => (
                <div key={x.name}>
                  <span>
                    <i style={{ background: x.color }} />
                    {x.name}
                  </span>
                  <b>{x.value}</b>
                  <span className="muted">
                    {report.total
                      ? Math.round((x.value / report.total) * 100)
                      : 0}
                    %
                  </span>
                </div>
              ))}
              <div className="legend-total">
                <b>Total</b>
                <b>{report.total}</b>
              </div>
            </div>
          </div>
        </Card>
        <Card
          title="Tasks"
          subtitle="A list of your most relevant tasks."
          action={
            <button className="text-button" onClick={() => navigate("tasks")}>
              View All <ArrowRight size={13} />
            </button>
          }
        >
          <TaskTable
            tasks={tasks.slice(0, 5)}
            onOpen={onOpen}
            onToggle={onToggle}
            readOnly={readOnly}
          />
        </Card>
      </div>
      <div className="dashboard-bottom">
        <Card
          title="Project Board"
          subtitle="A quick view of tasks by status."
          className="board-card"
          action={
            <button
              className="text-button"
              onClick={() => navigate("projects")}
            >
              Open board <ArrowRight size={13} />
            </button>
          }
        >
          <Board
            tasks={tasks}
            onOpen={onOpen}
            onCreate={onCreate}
            onMove={onMove}
            readOnly={readOnly}
            compact
          />
        </Card>
        <Card
          title="Upcoming Deadlines"
          subtitle="Key dates and milestones ahead."
          action={
            <button
              className="text-button"
              onClick={() => navigate("calendar")}
            >
              Calendar <ArrowRight size={13} />
            </button>
          }
        >
          <div className="mini-calendar">
            <header>
              <button
                className="icon-button"
                aria-label="Open previous month"
                onClick={() => navigate("calendar")}
              >
                <ChevronLeft size={15} />
              </button>
              <strong>{format(new Date(), "MMMM yyyy")}</strong>
              <button
                className="icon-button"
                aria-label="Open next month"
                onClick={() => navigate("calendar")}
              >
                <ChevronRight size={15} />
              </button>
            </header>
            <div className="week-grid">
              {Array.from({ length: 7 }, (_, i) => {
                const d = addDays(week, i);
                const date = format(d, "yyyy-MM-dd");
                return (
                  <button key={i} onClick={() => navigate("calendar")}>
                    <small>{format(d, "EEE")}</small>
                    <span className={date === today ? "selected-day" : ""}>
                      {format(d, "d")}
                    </span>
                    <i
                      className={
                        tasks.some((t) => t.dueDate === date)
                          ? "has-events"
                          : ""
                      }
                    />
                  </button>
                );
              })}
            </div>
          </div>
          <div className="deadline-list">
            {sorted.slice(0, 3).map((t) => (
              <button key={t.id} onClick={() => onOpen(t)}>
                <span
                  className={`deadline-square ${t.dueDate! < today ? "red" : "purple"}`}
                >
                  <CalendarDays size={13} />
                </span>
                <span>
                  {t.title}
                  <small>
                    {t.dueDate === today
                      ? "Due today"
                      : format(
                          new Date(t.dueDate! + "T12:00:00"),
                          "MMM d",
                        )}{" "}
                    · {t.project.name}
                  </small>
                </span>
              </button>
            ))}
            {!sorted.length && (
              <p className="muted small-pad">No deadlines coming up.</p>
            )}
          </div>
        </Card>
        <Card
          title="Recent Activity"
          subtitle="Team updates and collaboration."
          action={
            <button
              className="text-button"
              onClick={() => navigate("messages")}
            >
              View All <ArrowRight size={13} />
            </button>
          }
        >
          <div className="activity-list">
            {activities.slice(0, 4).map((a) => (
              <article key={a.id}>
                <Avatar name={a.actorName} />
                <div>
                  <p>
                    <strong>{a.actorName}</strong>{" "}
                    {a.action
                      .replace(":", " ")
                      .replaceAll("_", " ")
                      .toLowerCase()}
                  </p>
                  <span>{a.target}</span>
                  <small>
                    {formatDistanceToNow(new Date(a.createdAt), {
                      addSuffix: true,
                    })}
                  </small>
                </div>
              </article>
            ))}
            {!activities.length && (
              <Empty title="Your story starts here">
                Team activity will appear as you work.
              </Empty>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
