"use client";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Layers, LoaderCircle, Eye, EyeOff } from "lucide-react";
import { label, Task } from "@/lib/types";
export function Logo() {
  return (
    <span className="brand">
      <span className="brand-mark">
        <Layers size={21} />
      </span>
      <span>TaskFlow</span>
    </span>
  );
}
export function Avatar({
  name,
  size = "normal",
}: {
  name: string;
  size?: string;
}) {
  return (
    <span
      className={`avatar ${size}`}
      style={{
        background: `hsl(${[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360} 48% 92%)`,
      }}
      title={name}
    >
      {name
        .split(/[ _]/)
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()}
    </span>
  );
}
export function Badge({ task }: { task: Pick<Task, "status" | "dueDate"> }) {
  const today = new Date().toLocaleDateString("en-CA");
  const overdue =
    task.status !== "COMPLETED" &&
    task.status !== "CANCELLED" &&
    task.dueDate &&
    task.dueDate < today;
  const due = task.status !== "COMPLETED" && task.dueDate === today;
  return (
    <span
      className={`badge ${overdue ? "overdue" : due ? "due" : task.status.toLowerCase()}`}
    >
      {overdue ? "Overdue" : due ? "Due Today" : label(task.status)}
    </span>
  );
}
export function Empty({
  title = "Nothing here yet",
  children,
}: {
  title?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <Layers size={26} />
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={22} /> Loading your workspace…
    </div>
  );
}
export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content
          className={`modal ${wide ? "wide" : ""}`}
          aria-describedby={undefined}
        >
          <header className="modal-header">
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close className="icon-button" aria-label="Close">
              <X size={20} />
            </Dialog.Close>
          </header>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Card({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      <header className="card-header">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
export function ErrorNotice({ error }: { error: unknown }) {
  return error ? (
    <p className="error" role="alert">
      {error instanceof Error ? error.message : String(error)}
    </p>
  ) : null;
}

export function PasswordInput(props: React.ComponentProps<"input">) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="password-input">
      <input {...props} type={visible ? "text" : "password"} />
      <button
        type="button"
        className="password-toggle"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        onClick={() => setVisible((value) => !value)}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </span>
  );
}
