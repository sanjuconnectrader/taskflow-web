export type User = {
  id: string;
  username: string;
  email: string;
  displayName: string;
  mustChangePassword?: boolean;
  preferences: { theme?: string; reminders?: boolean; notifications?: boolean };
};
export type Workspace = {
  id: string;
  name: string;
  description: string;
  archived: boolean;
  enforceProjectAccess?: boolean;
  companyEmail?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  industry?: string | null;
  companySize?: string | null;
  timezone?: string;
};
export type Membership = {
  workspaceId: string;
  userId: string;
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER" | "PROJECT_MANAGER" | "TEAM_LEAD" | "EMPLOYEE";
  employeeId?: string | null;
  workspace: Workspace;
};
export type Member = { userId: string; role: string; user: User; employeeId?: string | null; designation?: string | null; department?: string | null };
export type Project = {
  id: string;
  name: string;
  description: string;
  color: string;
  dueDate: string | null;
  archived: boolean;
  _count: { tasks: number };
  restrictMembership?: boolean;
  members?: {userId: string}[];
};
export const statuses = [
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "BLOCKED",
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
  requiresReview?: boolean;
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
  checklistSummary?:{total:number;completed:number};
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
  message: string;
  type: string;
  taskId?: string;
  projectId?: string;
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
