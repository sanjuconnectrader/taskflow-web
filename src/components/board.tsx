"use client";
import {
  DndContext,
  useDraggable,
  useDroppable,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CheckSquare, Plus } from "lucide-react";
import { Task, Status, label } from "@/lib/types";
import { Avatar } from "./ui";
function Tile({
  task,
  onOpen,
  disabled,
}: {
  task: Task;
  onOpen: (t: Task) => void;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
    disabled,
  });
  return (
    <article
      className="board-tile"
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
    >
      <button className="tile-title" onClick={() => onOpen(task)}>
        {task.title}
      </button>
      <footer>
        <span
          className="drag-handle"
          {...attributes}
          {...listeners}
          aria-label={`Move ${task.title}`}
        >
          <CheckSquare size={13} />
          {task.checklistSummary?.completed??task.checklist?.filter((c) => c.done).length??0}/{task.checklistSummary?.total??task.checklist?.length??0}
        </span>
        <div className="avatar-stack">
          {task.assignees.slice(0, 2).map((a) => (
            <Avatar key={a.userId} name={a.user.displayName} size="small" />
          ))}
        </div>
      </footer>
    </article>
  );
}
function Column({
  status,
  tasks,
  onOpen,
  onCreate,
  readOnly,
  compact,
}: {
  status: Status;
  tasks: Task[];
  onOpen: (t: Task) => void;
  onCreate: () => void;
  readOnly: boolean;
  compact: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    disabled: readOnly,
  });
  return (
    <div
      ref={setNodeRef}
      className={`board-column ${status.toLowerCase()} ${isOver ? "drag-over" : ""}`}
    >
      <header>
        <strong>{status === "COMPLETED" ? "Done" : label(status)}</strong>
        <span>{tasks.length}</span>
      </header>
      <div className="board-items">
        {(compact ? tasks.slice(0, 3) : tasks).map((t) => (
          <Tile task={t} onOpen={onOpen} disabled={readOnly} key={t.id} />
        ))}
      </div>
      {!readOnly && (
        <button className="board-add" onClick={onCreate}>
          <Plus size={14} /> Add Task
        </button>
      )}
    </div>
  );
}
export function Board({
  tasks,
  onOpen,
  onCreate,
  onMove,
  readOnly = false,
  compact = false,
}: {
  tasks: Task[];
  onOpen: (t: Task) => void;
  onCreate: () => void;
  onMove: (t: Task, s: Status) => void;
  readOnly?: boolean;
  compact?: boolean;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );
  const end = (e: DragEndEvent) => {
    const t = tasks.find((t) => t.id === e.active.id);
    if (
      t &&
      e.over &&
      t.status !== e.over.id &&
      ["TODO", "IN_PROGRESS", "IN_REVIEW", "BLOCKED", "COMPLETED", "CANCELLED"].includes(
        String(e.over.id),
      )
    )
      onMove(t, e.over.id as Status);
  };
  return (
    <DndContext sensors={sensors} onDragEnd={end}>
      <div className={`board ${compact ? "compact" : ""}`}>
        {(compact
          ? ["TODO", "IN_PROGRESS", "COMPLETED"]
          : ["TODO", "IN_PROGRESS", "IN_REVIEW", "BLOCKED", "COMPLETED", "CANCELLED"]
        ).map((s) => (
          <Column
            key={s}
            status={s as Status}
            tasks={tasks.filter((t) => t.status === s)}
            onOpen={onOpen}
            onCreate={onCreate}
            readOnly={readOnly}
            compact={compact}
          />
        ))}
      </div>
    </DndContext>
  );
}
