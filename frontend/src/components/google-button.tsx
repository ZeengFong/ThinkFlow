"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { loadGoogleIdentity, makeNonce } from "@/lib/google-identity";
import { currentTheme } from "@/lib/theme";

interface Props {
  clientId: string;
  /** Called with Google's ID token and the raw nonce to give Supabase. */
  onCredential: (idToken: string, nonce: string) => void;
  /** Called if Google's script can't load, so the page can fall back. */
  onUnavailable: () => void;
}

/** Google's own "Continue with Google" button, sized to fit its container. */
export function GoogleButton({ clientId, onCredential, onUnavailable }: Props) {
  const slot = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  // Keep the latest callbacks without re-creating Google's button on each render.
  const handlers = useRef({ onCredential, onUnavailable });
  useEffect(() => {
    handlers.current = { onCredential, onUnavailable };
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadGoogleIdentity(), makeNonce()])
      .then(([google, nonce]) => {
        const el = slot.current;
        if (cancelled || !el) return;
        google.initialize({
          client_id: clientId,
          nonce: nonce.hashed,
          itp_support: true,
          context: "signin",
          callback: ({ credential }) => handlers.current.onCredential(credential, nonce.raw),
        });
        google.renderButton(el, {
          type: "standard",
          theme: currentTheme() === "dark" ? "filled_black" : "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          logo_alignment: "center",
          width: Math.max(200, Math.min(400, Math.floor(el.offsetWidth))),
        });
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) handlers.current.onUnavailable();
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  return (
    <div className="relative flex min-h-[44px] w-full items-center justify-center">
      {!ready && <Loader2 className="absolute h-5 w-5 animate-spin text-muted-foreground" />}
      <div ref={slot} className="flex w-full justify-center" />
    </div>
  );
}
