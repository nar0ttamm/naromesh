"use client";

import { cn, formatDate } from "@/lib/utils";
import type { PipelineLog, LogLevel } from "@/types/db";

const LEVEL_STYLES: Record<LogLevel, string> = {
  info: "text-gray-600",
  warn: "text-yellow-600",
  error: "text-red-600",
  success: "text-green-600"
};

const LEVEL_DOT: Record<LogLevel, string> = {
  info: "bg-gray-300",
  warn: "bg-yellow-400",
  error: "bg-red-500",
  success: "bg-green-500"
};

interface Props {
  logs: PipelineLog[];
}

export default function LogsPanel({ logs }: Props) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-gray-400">
        No pipeline logs yet.
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-80 overflow-y-auto text-xs font-mono">
      {logs.map((log) => (
        <div
          key={log.id}
          className="flex items-start gap-3 py-1.5 px-3 rounded hover:bg-gray-50"
        >
          {/* Level dot */}
          <span
            className={cn(
              "mt-1.5 w-2 h-2 rounded-full flex-shrink-0",
              LEVEL_DOT[log.level] ?? LEVEL_DOT.info
            )}
          />

          {/* Time + step */}
          <span className="text-gray-400 whitespace-nowrap flex-shrink-0">
            {formatDate(log.created_at)}
          </span>
          <span className="font-medium text-gray-500 whitespace-nowrap flex-shrink-0">
            [{log.step}]
          </span>

          {/* Message */}
          <span
            className={cn(
              "flex-1 break-words",
              LEVEL_STYLES[log.level] ?? LEVEL_STYLES.info
            )}
          >
            {log.message}
          </span>
        </div>
      ))}
    </div>
  );
}
