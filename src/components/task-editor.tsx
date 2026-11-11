"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {usePagedQuery} from '@/lib/paged-query';
import { Plus, Trash2, Send, Paperclip } from "lucide-react";
import { request, send } from "@/lib/api";
import { Task, Project, Member, Comment, statuses, label } from "@/lib/types";
import { Modal, ErrorNotice, Avatar } from "./ui";
export function TaskEditor({
  task,
  projects,
  members,
  wid,
  onClose,
  onSaved,
  readOnly = false,
  initialDate,
  restricted = false,
}: {
  task?: Task;
  projects: Project[];
  members: Member[];
  wid: string;
  onClose: () => void;
  onSaved: () => void;
  readOnly?: boolean;
  initialDate?: string;
  restricted?: boolean;
}) {
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [projectId, setProject] = useState(
    task?.projectId || projects.find((p) => !p.archived)?.id || "",
  );
  const [status, setStatus] = useState(task?.status || "TODO");
  const [priority, setPriority] = useState(task?.priority || "MEDIUM");
  const [requiresReview, setRequiresReview] = useState(task?.requiresReview || false);
  const [dueDate, setDue] = useState(task?.dueDate || initialDate || "");
  const [startDate, setStart] = useState(task?.startDate || "");
  const [assigneeIds, setAssignees] = useState(
    task?.assignees.map((a) => a.userId) || [],
  );
  const [tags, setTags] = useState(task?.tags.join(", ") || "");
  const [checklist, setChecklist] = useState(
    task?.checklist.map((x) => ({ text: x.text, done: x.done })) || [],
  );
  const [checkText, setCheckText] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const base = `/workspaces/${wid}`;
  const comments=usePagedQuery<Comment>(['comments',wid,task?.id],`${base}/comments?paged=true&taskId=${task?.id}`,!!task);
  const [optimizeImages,setOptimizeImages]=useState(false);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await send(
        task ? `${base}/tasks/${task.id}` : `${base}/tasks`,
        restricted && task ? {status,checklist,version:task.version} : {
          title,
          description,
          projectId,
          status,
          priority,
          requiresReview,
          dueDate: dueDate || null,
          startDate: startDate || null,
          assigneeIds,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          checklist,
          ...(task ? { version: task.version } : {}),
        },
        task ? "PATCH" : "POST",
      );
      onSaved();
      onClose();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };
  const action = async (data: any, remove = false) => {
    if (!task) return;
    setBusy(true);
    try {
      await send(
        `${base}/tasks/${task.id}`,
        remove ? undefined : { ...data, version: task.version },
        remove ? "DELETE" : "PATCH",
      );
      onSaved();
      onClose();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };
  const upload = async (file: File) => {
    try {
      setBusy(true);
      const result = await send(`/files/${wid}/upload`, {
        taskId: task!.id,
        name: file.name,
        mime: file.type,
        size: file.size,
        optimizeImage:optimizeImages,
      });
      const uploaded = await fetch(result.url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploaded.ok)
        throw new Error("Upload failed. Check storage CORS configuration.");
      await send(`/files/${wid}/${result.id}/confirm`, {});
      onSaved();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={task ? "Task details" : "Create a task"}
      wide
    >
      <form onSubmit={save} className="task-form">
        <fieldset disabled={readOnly || busy}>
          <div className="task-form-grid">
            <div>
              <label>
                Task title
                <input
                  disabled={restricted}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={250}
                  placeholder="What needs to be done?"
                  required
                  autoFocus
                />
              </label>
              <label>
                Description
                <textarea
                  disabled={restricted}
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add context, links, or a little direction…"
                />
              </label>
              <h3>
                Checklist{" "}
                <span className="muted">
                  {checklist.filter((x) => x.done).length}/{checklist.length}
                </span>
              </h3>
              <div className="checklist">
                {checklist.map((c, i) => (
                  <div key={i}>
                    <label className="check-label">
                      <input
                        type="checkbox"
                        checked={c.done}
                        onChange={(e) =>
                          setChecklist(
                            checklist.map((item, j) =>
                              j === i
                                ? { ...item, done: e.target.checked }
                                : item,
                            ),
                          )
                        }
                      />
                      {c.text}
                    </label>
                    <button
                      type="button"
                      disabled={restricted}
                      className="icon-button"
                      aria-label="Remove checklist item"
                      onClick={() =>
                        setChecklist(checklist.filter((_, j) => j !== i))
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="inline">
                <input
                  disabled={restricted}
                  value={checkText}
                  onChange={(e) => setCheckText(e.target.value)}
                  placeholder="Add checklist item"
                  aria-label="Checklist item"
                />
                <button
                  type="button"
                  disabled={restricted}
                  className="secondary"
                  onClick={() => {
                    if (checkText.trim()) {
                      setChecklist([
                        ...checklist,
                        { text: checkText.trim(), done: false },
                      ]);
                      setCheckText("");
                    }
                  }}
                >
                  <Plus size={16} />
                </button>
              </div>
              {task && <label className="check-label"><input type="checkbox" checked={optimizeImages} onChange={e=>setOptimizeImages(e.target.checked)}/>Resize/compress images to save space (original not kept)</label>}
              {task && (
                <label className="upload-button">
                  <Paperclip size={16} /> Attach a file
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.txt"
                    onChange={(e) =>
                      e.target.files?.[0] && upload(e.target.files[0])
                    }
                  />
                </label>
              )}
            </div>
            <aside>
              <label className="check-label"><input type="checkbox" checked={requiresReview} disabled={restricted} onChange={e=>setRequiresReview(e.target.checked)}/>Requires manager approval</label>
              <label>
                Project
                <select
                  disabled={restricted}
                  value={projectId}
                  onChange={(e) => setProject(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    Select a project
                  </option>
                  {projects
                    .filter((p) => !p.archived || p.id === task?.projectId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Status
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Task["status"])}
                >
                  {statuses.filter(s=>!restricted || s !== 'CANCELLED').map((s) => (
                    <option key={s} value={s}>
                      {label(s)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Priority
                <select
                  disabled={restricted}
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  {["LOW", "MEDIUM", "HIGH", "URGENT"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Start date
                <input
                  type="date"
                  disabled={restricted}
                  value={startDate}
                  onChange={(e) => setStart(e.target.value)}
                />
              </label>
              <label>
                Due date
                <input
                  type="date"
                  disabled={restricted}
                  value={dueDate}
                  onChange={(e) => setDue(e.target.value)}
                />
              </label>
              <label>
                Assignees
                <select
                  multiple
                  disabled={restricted}
                  value={assigneeIds}
                  onChange={(e) =>
                    setAssignees(
                      [...e.target.selectedOptions].map((o) => o.value),
                    )
                  }
                >
                  {members.filter(m=>{const project=projects.find(p=>p.id===projectId);return !project?.restrictMembership || project.members?.some(member=>member.userId===m.userId);}).map((m) => (
                    <option value={m.userId} key={m.userId}>
                      {m.user.displayName}
                    </option>
                  ))}
                </select>
                <small className="muted">
                  Use Ctrl/Cmd to select multiple people.
                </small>
              </label>
              <label>
                Labels
                <input
                  disabled={restricted}
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="design, sprint-1"
                />
              </label>
            </aside>
          </div>
        </fieldset>
        <ErrorNotice error={error} />
        <footer className="form-footer">
          <div>
            {task && !readOnly && !restricted && (
              <>
                <button
                  className="text-button danger"
                  type="button"
                  onClick={() => {
                    if (
                      confirm("Permanently delete this task and its comments?")
                    )
                      action({}, true);
                  }}
                >
                  Delete
                </button>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => action({ archived: !task.archived })}
                >
                  {task.archived ? "Restore" : "Archive"}
                </button>
              </>
            )}
          </div>
          <div className="inline">
            <button className="secondary" type="button" onClick={onClose}>
              Close
            </button>
            {!readOnly && (
              <button disabled={busy || !projectId} className="primary">
                {busy ? "Saving…" : task ? "Save changes" : "Create task"}
              </button>
            )}
          </div>
        </footer>
      </form>
      {task && (
        <section className="comments-section">
          <h3>Conversation</h3>
          {comments.items.map((c) => (
            <div className="comment" key={c.id}>
              <Avatar name={c.authorName} />
              <div>
                <strong>{c.authorName}</strong>
                <small>{new Date(c.createdAt).toLocaleString()}</small>
                <p>{c.body}</p>
              </div>
            </div>
          ))}
          {comments.hasNextPage&&<button className="secondary" disabled={comments.isFetchingNextPage} onClick={()=>comments.fetchNextPage()}>Load more comments</button>}
          <ErrorNotice error={comments.error}/>
          {!readOnly && (
            <form
              className="inline"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await send(`${base}/comments`, {
                    taskId: task.id,
                    body: comment,
                  });
                  setComment("");
                  comments.refetch();
                  onSaved();
                } catch (e) {
                  setError(e);
                }
              }}
            >
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment. Use @username to mention."
                aria-label="Comment"
                required
              />
              <button className="primary" aria-label="Send comment">
                <Send size={16} />
              </button>
            </form>
          )}
        </section>
      )}
    </Modal>
  );
}
