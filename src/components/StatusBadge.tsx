import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const map: Record<string, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-secondary text-muted-foreground border-border" },
  under_review: { label: "Under Review", cls: "bg-warning-soft text-warning border-warning/30" },
  approved: { label: "Approved", cls: "bg-accent text-accent-foreground border-primary/20" },
  published: { label: "Published", cls: "bg-success-soft text-success border-success/30" },
  archived: { label: "Archived", cls: "bg-muted text-muted-foreground border-border" },
  planning: { label: "Planning", cls: "bg-secondary text-muted-foreground border-border" },
  active: { label: "Active", cls: "bg-success-soft text-success border-success/30" },
  completed: { label: "Completed", cls: "bg-accent text-accent-foreground border-primary/20" },
  paused: { label: "Paused", cls: "bg-warning-soft text-warning border-warning/30" },
  pending: { label: "Pending", cls: "bg-secondary text-muted-foreground border-border" },
  deployed: { label: "Deployed", cls: "bg-accent text-accent-foreground border-primary/20" },
  closed: { label: "Closed", cls: "bg-muted text-muted-foreground border-border" },
};

export function StatusBadge({ status }: { status: string }) {
  const m = map[status] ?? { label: status, cls: "bg-secondary text-muted-foreground border-border" };
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
      m.cls
    )}>
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {m.label}
    </span>
  );
}
