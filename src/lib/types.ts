export type User = {
  id: string;
  username: string;
  email: string;
  displayName: string;
  preferences: { theme?: string; reminders?: boolean; notifications?: boolean };
};
export type Workspace = {
  id: string;
  name: string;
  description: string;
  archived: boolean;
};
export type Membership = {
  workspaceId: string;
  userId: string;
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  workspace: Workspace;
};
export type Member = { userId: string; role: string; user: User };
export type Project = {
  id: string;
  name: string;
  description: string;
  color: string;
  dueDate: string | null;
  archived: boolean;
  _count: { tasks: number };
};
export const statuses = [
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "COMPLETED",
  "CANCELLED",
] as const;
export type Status = (typeof statuses)[number];
export type Task = {
  id: string;
  title: string;
  description: string;
  projectId: string;
  project: { id: string; name: string; color: string };
  status: Status;
  priority: string;
  dueDate: string | null;
  startDate: string | null;
  creatorId: string;
  tags: string[];
  version: number;
  archived: boolean;
  parentId: string | null;
  createdAt: string;
  completedAt: string | null;
  assignees: { userId: string; user: User }[];
  checklist: { id?: string; text: string; done: boolean }[];
};
export type Report = {
  total: number;
  completed: number;
  dueToday: number;
  inProgress: number;
  completedThisWeek: number;
  overdue: number;
  completionRate: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byProject: Record<string, { total: number; completed: number }>;
  completedOverTime: Record<string, number>;
  workload: Record<string, number>;
};
export type Activity = {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  target: string;
  createdAt: string;
};
export type Comment = {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
  taskId?: string;
  projectId?: string;
};
export type Notification = {
  id: string;
  title: string;
  taskId?: string;
  read: boolean;
  createdAt: string;
};
export const label = (s: string) =>
  ({
    TODO: "To Do",
    IN_PROGRESS: "In Progress",
    IN_REVIEW: "In Review",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
  })[s] || s.charAt(0) + s.slice(1).toLowerCase();
