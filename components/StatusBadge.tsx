import { cn } from "@/lib/utils";
import type { IdeaStatus } from "@/types/db";

const STATUS_CONFIG: Record<
  IdeaStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className: "bg-gray-100 text-gray-600"
  },
  processing: {
    label: "Processing",
    className: "bg-blue-100 text-blue-700 animate-pulse"
  },
  clips_generated: {
    label: "Clips Ready",
    className: "bg-indigo-100 text-indigo-700"
  },
  merged: {
    label: "Merged",
    className: "bg-purple-100 text-purple-700"
  },
  completed: {
    label: "Completed",
    className: "bg-green-100 text-green-700"
  },
  scheduled: {
    label: "Scheduled",
    className: "bg-teal-100 text-teal-700"
  },
  posted: {
    label: "Posted",
    className: "bg-emerald-100 text-emerald-700"
  },
  failed: {
    label: "Failed",
    className: "bg-red-100 text-red-600"
  }
};

interface Props {
  status: IdeaStatus;
  className?: string;
}

export default function StatusBadge({ status, className }: Props) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        cfg.className,
        className
      )}
    >
      {cfg.label}
    </span>
  );
}
