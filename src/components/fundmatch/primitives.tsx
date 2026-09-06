import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Chip({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "mint" | "peri" | "warning";
  className?: string;
}) {
  const tones = {
    neutral: "bg-muted text-muted-foreground",
    mint: "bg-mint text-mint-foreground",
    peri: "bg-peri-soft text-peri-foreground",
    warning: "bg-warning/40 text-warning-foreground",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function FitScore({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const tone = score >= 75 ? "text-mint-foreground" : score >= 50 ? "text-peri-foreground" : "text-muted-foreground";
  const ring = score >= 75 ? "stroke-mint-strong" : score >= 50 ? "stroke-peri" : "stroke-border";
  const dims = size === "lg" ? 88 : size === "sm" ? 44 : 62;
  const stroke = size === "lg" ? 7 : size === "sm" ? 4 : 5;
  const r = (dims - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: dims, height: dims }}>
      <svg width={dims} height={dims} className="-rotate-90">
        <circle cx={dims / 2} cy={dims / 2} r={r} className="stroke-border" strokeWidth={stroke} fill="none" />
        <circle
          cx={dims / 2}
          cy={dims / 2}
          r={r}
          className={ring}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * score) / 100}
        />
      </svg>
      <div className={cn("absolute flex flex-col items-center", tone)}>
        <span className={cn("font-semibold", size === "lg" ? "text-2xl" : size === "sm" ? "text-xs" : "text-base")}>
          {score}
        </span>
      </div>
    </div>
  );
}

export function AiBadge({ label = "AI generated" }: { label?: string }) {
  return (
    <Chip tone="peri" className="uppercase tracking-wide">
      ✨ {label}
    </Chip>
  );
}

export function SourceBadge({ source, when }: { source: string; when?: string }) {
  return (
    <Chip tone="neutral">
      <span className="font-semibold">{source}</span>
      {when ? <span className="opacity-70">· {when}</span> : null}
    </Chip>
  );
}

export function SectionCard({
  title,
  action,
  children,
  description,
  className,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("card-soft p-5 sm:p-6", className)}>
      {(title || action) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title ? <h2 className="text-base font-semibold">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-surface-muted px-6 py-12 text-center">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function LoadingRows({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface-muted" />
      ))}
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      {message}
    </div>
  );
}
