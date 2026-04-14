import { useEffect, useState, useCallback } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/* ================================================================== */
/*  Global toast state (simple event-driven, no context needed)       */
/* ================================================================== */

type ToastType = "info" | "success" | "error";

interface ToastData {
  id: number;
  message: string;
  type: ToastType;
  action?: { label: string; onClick: () => void };
  duration: number;
}

let _listeners: ((toast: ToastData) => void)[] = [];
let _id = 0;

export function showToast(
  message: string,
  options?: {
    type?: ToastType;
    duration?: number;
    action?: { label: string; onClick: () => void };
  },
) {
  const toast: ToastData = {
    id: ++_id,
    message,
    type: options?.type ?? "info",
    action: options?.action,
    duration: options?.duration ?? 4000,
  };
  _listeners.forEach((fn) => fn(toast));
}

/* ================================================================== */
/*  Toast container — mount once at app root                          */
/* ================================================================== */

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    const handler = (toast: ToastData) => {
      setToasts((prev) => [...prev, toast]);
    };
    _listeners.push(handler);
    return () => {
      _listeners = _listeners.filter((fn) => fn !== handler);
    };
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[300] mx-auto flex max-w-lg flex-col items-center gap-2 px-5">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastData;
  onDismiss: (id: number) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div
      className={cn(
        "pointer-events-auto flex w-full items-center gap-3 rounded-2xl px-4 py-3",
        "animate-slide-up shadow-lg backdrop-blur-xl",
        "bg-navy-700/95 text-white ring-1 ring-white/10",
      )}
    >
      {/* Icon dot */}
      <div
        className={cn(
          "h-2 w-2 shrink-0 rounded-full",
          toast.type === "success" && "bg-emerald-400",
          toast.type === "error" && "bg-red-400",
          toast.type === "info" && "bg-gold-400",
        )}
      />

      <p className="flex-1 text-sm font-medium">{toast.message}</p>

      {toast.action && (
        <button
          onClick={() => {
            toast.action!.onClick();
            onDismiss(toast.id);
          }}
          className="shrink-0 rounded-lg bg-gold-500 px-3 py-1 text-xs font-bold text-navy-900"
        >
          {toast.action.label}
        </button>
      )}

      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 rounded-full p-1 text-white/30 hover:text-white/60"
      >
        <X size={14} />
      </button>
    </div>
  );
}
