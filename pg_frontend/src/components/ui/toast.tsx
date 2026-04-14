"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type ToastTone = "success" | "error";

export type ToastData = {
  id: number;
  message: string;
  tone: ToastTone;
  durationMs: number;
};

type ToastViewportProps = {
  toast: ToastData | null;
};

export function ToastViewport({ toast }: ToastViewportProps) {
  if (!toast) {
    return null;
  }

  const toneClassName =
    toast.tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-red-200 bg-red-50 text-red-700";

  const barClassName = toast.tone === "success" ? "bg-emerald-500" : "bg-red-500";

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[70] w-[min(24rem,calc(100vw-2rem))] animate-toast-in">
      <div className={`overflow-hidden rounded-xl border shadow-[var(--shadow-card)] ${toneClassName}`}>
        <div className="px-4 py-3 text-sm font-semibold">{toast.message}</div>
        <div className="h-1 w-full bg-black/5">
          <div
            key={toast.id}
            className={`h-full ${barClassName}`}
            style={{ animation: `toast-progress ${toast.durationMs}ms linear forwards` }}
          />
        </div>
      </div>
    </div>
  );
}

type UseToastOptions = {
  defaultDurationMs?: number;
};

export function useToast(options?: UseToastOptions) {
  const defaultDurationMs = useMemo(() => options?.defaultDurationMs ?? 3000, [options?.defaultDurationMs]);
  const [toast, setToast] = useState<ToastData | null>(null);
  const timerRef = useRef<number | null>(null);

  const dismissToast = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback(
    (message: string, tone: ToastTone, durationMs?: number) => {
      const nextToast: ToastData = {
        id: Date.now(),
        message,
        tone,
        durationMs: durationMs ?? defaultDurationMs,
      };

      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }

      setToast(nextToast);

      timerRef.current = window.setTimeout(() => {
        setToast(null);
        timerRef.current = null;
      }, nextToast.durationMs);
    },
    [defaultDurationMs]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { toast, showToast, dismissToast };
}
