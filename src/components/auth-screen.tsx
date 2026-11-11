"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Logo, ErrorNotice, PasswordInput } from "./ui";
import { send } from "@/lib/api";
import { isNative, saveSession } from "@/lib/platform";
const schema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string(),
  username: z.string().optional(),
  confirmPassword: z.string().optional(),
  acceptedTerms: z.boolean().optional(),
  explanation: z.string().optional(),
  authorization: z.string().optional(),
  fullName: z.string().optional(),
  designation: z.string().optional(),
});
type Fields = z.infer<typeof schema>;
export function AuthScreen({ onLogin }: { onLogin: () => void }) {
  const [mode, setMode] = useState<"login" | "company" | "register" | "recovery" | "reset">(
    "login",
  );
  const [error, setError] = useState<unknown>();
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState<Record<string, string> | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<Fields>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { email: "", password: "" },
  });
  const change = (m: typeof mode) => {
    setMode(m);
    setError(null);
    setMessage("");
    reset();
  };
  const submit = handleSubmit(async (data) => {
    try {
      setError(null);
      if (mode === "register") {
        if (!/^[a-z0-9_]{3,32}$/.test(data.username || ""))
          throw new Error(
            "Username: use 3–32 lowercase letters, numbers or underscores.",
          );
        if (data.password.length < 8)
          throw new Error("Use at least 8 characters.");
        if (data.password !== data.confirmPassword)
          throw new Error("Passwords do not match.");
        if (!data.acceptedTerms)
          throw new Error("Accept the terms to continue.");
      }
      if (mode === "recovery") {
        const r = await send("/recovery/request", {
          email: data.email,
          explanation: data.explanation || "",
        });
        setMessage(r.message);
        return;
      }
      if (mode === "reset") {
        await send("/recovery/reset", data);
        setMessage("Password changed. Sign in with your new password.");
        return;
      }
      const result = await send(`/auth/${mode}`, {
        ...data,
        ...(mode === "register" ? {company} : {}),
        native: isNative(),
      });
      if (result.token) await saveSession(result.token);
      onLogin();
    } catch (e) {
      setError(e);
    }
  });
  return (
    <main className="auth-page">
      <aside className="auth-story">
        <Logo />
        <div>
          <span className="eyebrow">A CLEARER WAY TO WORK</span>
          <h1>
            Big ideas.
            <br />
            Small steps.
            <br />
            <span>Real progress.</span>
          </h1>
          <p>
            Bring your tasks, projects, and people together.
            <br />
            Make room for your best work.
          </p>
          <div className="story-points">
            {[
              "One shared workspace",
              "Every deadline in view",
              "Built for your whole team",
            ].map((t) => (
              <span key={t}>
                <CheckCircle2 size={17} />
                {t}
              </span>
            ))}
          </div>
        </div>
        <small>TaskFlow · Your work, in focus.</small>
      </aside>
      <section className="auth-panel">
        <div className="auth-form">
          <div className="mobile-brand">
            <Logo />
          </div>
          <span className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</span>
          <h1>
            {mode === "login"
              ? "Welcome back"
              : mode === "company" ? "Create your company" : mode === "register"
                ? "Set up your administrator"
                : mode === "reset"
                  ? "Choose a new password"
                  : "Forgot your password?"}
          </h1>
          <p className="muted">
            {mode === "login"
              ? "Sign in to pick up where you left off."
              : mode === "company" ? "First, tell us about your organization." : mode === "register"
                ? "Your account will be the company owner."
                : mode === "reset"
                  ? "Enter the authorization from your verified administrator."
                  : "Please contact your workspace administrator to recover access to your account. Your administrator will verify your identity and provide secure reset instructions."}
          </p>
          {message ? (
            <div className="success-message">
              {message}
              <button className="primary" onClick={() => change("login")}>
                Back to sign in
              </button>
            </div>
          ) : mode === "company" ? (
            <form onSubmit={e => {e.preventDefault(); setCompany(Object.fromEntries(new FormData(e.currentTarget)) as Record<string,string>); change("register");}}>
              <label>Company name<input name="name" required maxLength={150} /></label>
              <label>Company email<input name="email" type="email" required /></label>
              <label>Phone (optional)<input name="phone" type="tel" /></label>
              <label>Website (optional)<input name="website" type="url" placeholder="https://example.com" /></label>
              <label>Address (optional)<input name="address" /></label>
              <label>Industry (optional)<input name="industry" /></label>
              <label>Company size (optional)<input name="companySize" /></label>
              <label>Time zone<input name="timezone" required defaultValue={Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"} /></label>
              <button className="primary full">Continue to administrator setup <ArrowRight size={17} /></button>
            </form>
          ) : (
            <form onSubmit={submit}>
              {mode === "register" && (
                <><label>Full name<input {...register("fullName")} required autoComplete="name" /></label>
                <label>Job designation<input {...register("designation")} /></label>
                <label>
                  Username
                  <input
                    {...register("username")}
                    autoComplete="username"
                    placeholder="e.g. emma_carter"
                    required
                  />
                </label>
                </>
              )}
              <label>
                Email address
                <input
                  {...register("email")}
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  required
                />
                {errors.email && (
                  <small className="error">{errors.email.message}</small>
                )}
              </label>
              {mode === "recovery" ? (
                <label>
                  How can we help? <span className="muted">(optional)</span>
                  <textarea {...register("explanation")} rows={3} />
                </label>
              ) : (
                <>
                  <label>
                    Password
                    <PasswordInput
                      {...register("password")}
                      minLength={mode === "login" ? 1 : 8}
                      maxLength={128}
                      autoComplete={
                        mode === "login" ? "current-password" : "new-password"
                      }
                      placeholder={
                        mode === "login"
                          ? "Enter your password"
                          : "At least 8 characters"
                      }
                      required
                    />
                  </label>
                  {mode !== "login" && (
                    <label>
                      Confirm password
                      <PasswordInput
                        {...register("confirmPassword")}
                        minLength={8}
                        autoComplete="new-password"
                        required
                      />
                    </label>
                  )}
                </>
              )}
              {mode === "reset" && (
                <label>
                  Reset authorization
                  <input
                    {...register("authorization")}
                    autoComplete="off"
                    required
                  />
                </label>
              )}
              {mode === "register" && (
                <label className="check-label">
                  <input
                    {...register("acceptedTerms")}
                    type="checkbox"
                    required
                  />
                  I accept the Terms and Privacy Policy below.
                </label>
              )}
              {mode === "login" && (
                <button
                  type="button"
                  className="text-button forgot"
                  onClick={() => change("recovery")}
                >
                  Forgot your password?
                </button>
              )}
              <ErrorNotice error={error} />
              <button className="primary full" disabled={isSubmitting}>
                {isSubmitting
                  ? "Please wait…"
                  : mode === "login"
                    ? "Sign in"
                    : mode === "register"
                      ? "Create account"
                      : mode === "reset"
                        ? "Reset password"
                        : "Request Recovery Assistance"}
                <ArrowRight size={17} />
              </button>
            </form>
          )}
          <div className="auth-links">
            {mode === "login" ? (
              <>
                New to TaskFlow?{" "}
                <button
                  className="text-button"
                  onClick={() => change("company")}
                >
                  Create an account
                </button>
              </>
            ) : (
              <button className="text-button" onClick={() => change("login")}>
                Back to sign in
              </button>
            )}
            {mode === "recovery" && (
              <button className="text-button" onClick={() => change("reset")}>
                I have a reset authorization
              </button>
            )}
          </div>
          <details className="legal">
            <summary>Terms & Privacy Policy</summary>
            <p>
              Use TaskFlow only for work you are authorized to access. Your
              account, workspace content, sessions, and audit events are stored
              by your TaskFlow operator. Workspace administrators can manage
              membership and content. Contact your operator for retention,
              deletion, support and legal terms before uploading personal or
              confidential information. Self-hosting operators must publish
              their organization’s final terms before public launch.
            </p>
          </details>
        </div>
      </section>
    </main>
  );
}
