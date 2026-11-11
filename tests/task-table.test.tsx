import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TaskTable } from "../src/components/dashboard";
import type { Task } from "../src/lib/types";
const task = {
  id: "one",
  title: "Ship the release",
  status: "TODO",
  dueDate: null,
  priority: "HIGH",
  project: { name: "Launch" },
  assignees: [],
} as unknown as Task;
describe("task table interaction", () => {
  it("opens the selected task and requests completion", () => {
    const open = vi.fn(),
      toggle = vi.fn();
    render(<TaskTable tasks={[task]} onOpen={open} onToggle={toggle} />);
    fireEvent.click(screen.getByRole("button", { name: /Ship the release/ }));
    expect(open).toHaveBeenCalledWith(task);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(toggle).toHaveBeenCalledWith(task);
  });
  it("disables completion for viewers", () => {
    render(
      <TaskTable
        tasks={[task]}
        onOpen={() => {}}
        onToggle={() => {}}
        readOnly
      />,
    );
    expect(screen.getAllByRole("checkbox").at(-1)).toBeDisabled();
  });
});
