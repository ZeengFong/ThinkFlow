"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CheckCircle, LogOut, Moon, Sparkles, Sun, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { aiApi, apiError, meApi, type Me } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { applyTheme, currentTheme, type Theme } from "@/lib/theme";
import { shortModel } from "@/lib/format";
import { toast } from "@/lib/toast";

const card = "glass rounded-2xl p-5 shadow-soft";

export default function SettingsPage() {
  const { user, signOut, localMode } = useAuth();
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: meApi.get });
  const ai = useQuery({ queryKey: ["ai-status"], queryFn: aiApi.status, retry: false });

  const update = useMutation({
    mutationFn: meApi.update,
    onSuccess: (data) => queryClient.setQueryData<Me>(["me"], data),
    onError: (err) => toast.error(apiError(err)),
  });

  const theme: Theme = me.data?.theme ?? "dark";
  const toggleTheme = () => {
    const next: Theme = currentTheme() === "dark" ? "light" : "dark";
    applyTheme(next);
    queryClient.setQueryData<Me | undefined>(["me"], (old) => (old ? { ...old, theme: next } : old));
    update.mutate({ theme: next });
  };

  const provider = user?.app_metadata?.provider as string | undefined;

  return (
    <div className="max-w-xl p-4 sm:p-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Make ThinkFlow work the way you study.</p>
      </motion.div>

      <div className="mt-8 space-y-4">
        <section className={card}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-medium text-foreground">Appearance</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Saved to your account</p>
            </div>
            <button onClick={toggleTheme} className="press flex items-center gap-2 rounded-xl bg-muted px-4 py-2 text-sm font-medium text-foreground">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
          </div>
        </section>

        <section className={card}>
          <h2 className="font-medium text-foreground">Study preferences</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            The AI uses this when planning and scheduling, e.g. &quot;I study best in 45-minute blocks on weekday evenings&quot;.
          </p>
          {me.data ? (
            <PreferencesForm initial={me.data.study_preferences} saving={update.isPending} onSave={(value) => update.mutate({ study_preferences: value }, { onSuccess: () => toast.success("Preferences saved") })} />
          ) : (
            <div className="mt-3 h-24 animate-pulse rounded-xl bg-muted" />
          )}
        </section>

        <section className={card}>
          <h2 className="font-medium text-foreground">AI</h2>
          {ai.isPending ? (
            <div className="mt-3 h-10 animate-pulse rounded-xl bg-muted" />
          ) : ai.data?.configured && !ai.data.error ? (
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center gap-2 rounded-xl bg-soft-green/10 px-3 py-2 text-xs text-soft-green">
                <CheckCircle className="h-4 w-4" />
                {ai.data.provider} · {shortModel(ai.data.model)}
              </div>
              {ai.data.providers.length > 1 && (
                <p className="text-xs text-muted-foreground">Backup if busy: {ai.data.providers.slice(1).join(", ")}</p>
              )}
              {ai.data.usage.limit > 0 && (
                <p className="text-xs text-muted-foreground">
                  {ai.data.usage.used} of {ai.data.usage.limit} AI requests used today
                </p>
              )}
            </div>
          ) : (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-muted-coral/10 px-3 py-2 text-xs text-foreground">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-muted-coral" />
              <span>
                {ai.data?.error || apiError(ai.error)} Get a free key at{" "}
                <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-baby-blue underline">
                  console.groq.com/keys
                </a>
                .
              </span>
            </div>
          )}
        </section>

        <section className={card}>
          <h2 className="font-medium text-foreground">Account</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {localMode
              ? "Local mode: sign-in is off until Supabase is configured."
              : `${user?.email ?? ""}${provider ? ` · signed in with ${provider === "email" ? "an email link" : provider[0].toUpperCase() + provider.slice(1)}` : ""}`}
          </p>
          <button onClick={signOut} className="press mt-3 flex items-center gap-2 rounded-xl bg-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/80">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </section>

        <section className={card}>
          <h2 className="flex items-center gap-1.5 font-medium text-foreground">
            <Sparkles className="h-4 w-4 text-baby-blue" /> About ThinkFlow
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Think flowier, act like a plan. Built for Calgary Hacks 2026 by Ayan, Tamjeed, Alec-franz, Luca and Mudit.
          </p>
        </section>
      </div>
    </div>
  );
}

function PreferencesForm({ initial, saving, onSave }: { initial: string; saving: boolean; onSave: (value: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={3}
        maxLength={2000}
        aria-label="Study preferences"
        placeholder="When and how do you like to study? Any commitments the AI should plan around?"
        className="mt-3 w-full resize-none rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-baby-blue"
      />
      <button
        onClick={() => onSave(value.trim())}
        disabled={saving || value.trim() === initial.trim()}
        className="press mt-2 rounded-xl bg-baby-blue px-4 py-2 text-sm font-medium text-primary-foreground shadow-soft disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save preferences"}
      </button>
    </>
  );
}
