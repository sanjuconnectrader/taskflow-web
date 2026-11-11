import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "TaskFlow — Your work, in focus",
  description:
    "Tasks, projects and team collaboration in one focused workspace.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
