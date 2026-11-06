"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ListPlus, Loader2, Send, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { aiApi, apiError, type AIStatus, type ChatMessage, type Suggestion } from "@/lib/api";
import { priorityDot, shortModel } from "@/lib/format";
import { toast } from "@/lib/toast";
import { Markdown } from "@/components/markdown";

const QUICK_PROMPTS = [
  "What should I work on today?",
  "Make me a study schedule for this week",
  "I'm stuck. Help me get started",
];

interface Props {
  projectId: string | undefined;
  status: AIStatus | undefined;
  hasSteps: boolean;
  generating: boolean;
  onBuildPlan: () => void;
  onAddSuggestions: (suggestions: Suggestion[], group: string) => void;
  onClose: () => void;
}

export function AIPanel({ projectId, status, hasSteps, generating, onBuildPlan, onAddSuggestions, onClose }: Props) {
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatKey = ["chat", projectId];

  const history = useQuery({
    queryKey: chatKey,
    queryFn: () => aiApi.chatHistory(projectId!),
    enabled: !!projectId,
  });
  const messages = history.data ?? [];

  const send = useMutation({
    mutationFn: (message: string) => aiApi.sendChat(projectId!, message),
    onMutate: (message) => setPending(message),
    onSuccess: (result) => {
      queryClient.setQueryData<ChatMessage[]>(chatKey, (old = []) => [...old, ...result.messages]);
      queryClient.invalidateQueries({ queryKey: ["ai-status"] });
    },
    onError: (err, message) => {
      toast.error(apiError(err));
      setInput((current) => current || message);
    },
    onSettled: () => setPending(null),
  });

  const clear = useMutation({
    mutationFn: () => aiApi.clearChat(projectId!),
    onSuccess: () => queryClient.setQueryData(chatKey, []),
    onError: (err) => toast.error(apiError(err)),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, pending]);

  const submit = (text = input) => {
    const message = text.trim();
    if (!message || send.isPending || !projectId) return;
    setInput("");
    send.mutate(message);
  };

  const configured = status?.configured;
  const usage = status?.usage;

  return (
    <div className="flex h-full flex-col bg-card/95 backdrop-blur-xl">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Sparkles className="h-4 w-4 text-baby-blue" />
        <span className="text-sm font-medium text-foreground">ThinkFlow AI</span>
        {configured && status?.model && (
          <span
            title={`${status.provider}${status.providers.length > 1 ? ` (backup: ${status.providers.slice(1).join(", ")})` : ""}`}
            className="truncate rounded-full bg-soft-green/15 px-2 py-0.5 text-[10px] font-medium text-soft-green"
          >
            {shortModel(status.model)}
          </span>
        )}
        <div className="ml-auto flex items-center gap-0.5">
          {messages.length > 0 && (
            <button
              onClick={() => confirm("Clear this chat?") && clear.mutate()}
              title="Clear chat"
              aria-label="Clear chat"
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            title="Hide AI panel"
            aria-label="Hide AI panel"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {status && !configured && (
          <div className="rounded-xl border border-muted-coral/30 bg-muted-coral/10 p-3 text-xs leading-relaxed text-foreground">
            <p className="font-medium">AI isn&apos;t set up yet</p>
            <p className="mt-1 text-muted-foreground">
              Get a free key at{" "}
              <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-baby-blue underline">
                console.groq.com/keys
              </a>{" "}
              and add it to <code className="rounded bg-muted px-1">backend/.env</code> as{" "}
              <code className="rounded bg-muted px-1">GROQ_API_KEY</code>.
            </p>
          </div>
        )}

        {messages.length === 0 && !pending && (
          <div className="flex flex-col items-center pt-6 text-center">
            <Sparkles className="mb-3 h-8 w-8 text-baby-blue/40" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              I know your project, deadline and progress. Ask me anything, or let me build the plan.
            </p>
            <div className="mt-4 w-full space-y-1.5">
              {!hasSteps && (
                <button
                  onClick={onBuildPlan}
                  disabled={!configured || generating}
                  className="press flex w-full items-center justify-center gap-1.5 rounded-lg bg-baby-blue px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
                >
                  {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Build my plan
                </button>
              )}
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => submit(prompt)}
                  disabled={!configured}
                  className="block w-full rounded-lg border border-border px-3 py-1.5 text-left text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="ml-8 whitespace-pre-wrap rounded-2xl rounded-br-md bg-baby-blue/15 px-3 py-2 text-xs leading-relaxed text-foreground">
              {m.content}
            </div>
          ) : (
            <div key={m.id} className="mr-3 rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-xs text-foreground">
              <Markdown text={m.content} />
              {m.suggestions.length > 0 && (
                <div className="mt-2.5 rounded-xl border border-border bg-background/60 p-2">
                  {m.suggestion_group && (
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-baby-blue-dark">{m.suggestion_group}</p>
                  )}
                  <ul className="space-y-1">
                    {m.suggestions.map((s, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[11px] text-foreground">
                        <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${priorityDot[s.priority]}`} />
                        {s.title}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => {
                      onAddSuggestions(m.suggestions, m.suggestion_group);
                      setAdded((prev) => new Set(prev).add(m.id));
                    }}
                    disabled={added.has(m.id)}
                    className="press mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-baby-blue/15 px-2 py-1.5 text-[11px] font-medium text-baby-blue-dark hover:bg-baby-blue/25 disabled:opacity-60"
                  >
                    {added.has(m.id) ? <Check className="h-3 w-3" /> : <ListPlus className="h-3 w-3" />}
                    {added.has(m.id) ? "Added to flow" : `Add ${m.suggestions.length} step${m.suggestions.length > 1 ? "s" : ""} to flow`}
                  </button>
                </div>
              )}
            </div>
          )
        )}

        {pending && (
          <>
            <div className="ml-8 whitespace-pre-wrap rounded-2xl rounded-br-md bg-baby-blue/15 px-3 py-2 text-xs text-foreground">
              {pending}
            </div>
            <div className="mr-3 flex items-center gap-2 rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
            </div>
          </>
        )}
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2 rounded-xl border border-border bg-background px-3 py-2 focus-within:border-baby-blue">
          <textarea
            ref={inputRef}
            value={input}
            rows={1}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            disabled={!configured}
            placeholder={configured ? "Ask ThinkFlow…" : "Add an AI key to chat"}
            className="max-h-[120px] flex-1 resize-none bg-transparent text-xs leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            onClick={() => submit()}
            disabled={!input.trim() || send.isPending || !configured}
            aria-label="Send"
            className="press rounded-lg p-1 text-baby-blue transition-colors hover:bg-baby-blue/10 disabled:opacity-30"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        {usage && usage.limit > 0 && (
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
            {usage.used}/{usage.limit} AI requests used today
          </p>
        )}
      </div>
    </div>
  );
}
