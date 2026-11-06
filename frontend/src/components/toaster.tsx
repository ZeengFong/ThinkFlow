"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { useToasts } from "@/lib/toast";

const styles = {
  success: { icon: CheckCircle2, className: "text-soft-green" },
  error: { icon: TriangleAlert, className: "text-muted-coral" },
  info: { icon: Info, className: "text-baby-blue" },
};

export function Toaster() {
  const { toasts, dismiss } = useToasts();
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 md:bottom-6"
    >
      <AnimatePresence>
        {toasts.map((t) => {
          const { icon: Icon, className } = styles[t.kind];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              className="pointer-events-auto flex w-full max-w-md items-start gap-2.5 rounded-xl border border-border bg-popover px-3.5 py-2.5 text-sm text-popover-foreground shadow-soft-lg backdrop-blur-xl"
            >
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${className}`} />
              <p className="flex-1 leading-snug">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="rounded p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
