/**
 * Google Identity Services (the official "Sign in with Google" button).
 *
 * Signing in this way, instead of a Supabase redirect, makes Google's sign-in
 * popup name ThinkFlow's own site rather than "<project>.supabase.co". The
 * button hands back a Google ID token, which Supabase verifies with
 * signInWithIdToken (see auth-context.tsx).
 *
 * Turned on by NEXT_PUBLIC_GOOGLE_CLIENT_ID (the same Web client ID that is set
 * in Supabase → Authentication → Providers → Google).
 */

export const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || "";

export interface GoogleCredentialResponse {
  credential: string;
}

export interface GoogleIdApi {
  initialize(config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    nonce?: string;
    auto_select?: boolean;
    itp_support?: boolean;
    context?: "signin" | "signup" | "use";
  }): void;
  renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleIdApi } };
  }
}

const SCRIPT_URL = "https://accounts.google.com/gsi/client";
let loading: Promise<GoogleIdApi> | null = null;

/** Loads Google's script once. Rejects if it is blocked (e.g. by an ad blocker). */
export function loadGoogleIdentity(): Promise<GoogleIdApi> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (!loading) {
    loading = new Promise<GoogleIdApi>((resolve, reject) => {
      const fail = () => {
        loading = null;
        reject(new Error("Google sign-in couldn't load"));
      };
      const script = document.createElement("script");
      script.src = SCRIPT_URL;
      script.async = true;
      script.onload = () => {
        const api = window.google?.accounts?.id;
        if (api) resolve(api);
        else fail();
      };
      script.onerror = fail;
      document.head.appendChild(script);
    });
  }
  return loading;
}

/**
 * A one-time nonce: Google gets the SHA-256 hash (it ends up inside the ID
 * token), Supabase gets the raw value and checks that the two match. This stops
 * a stolen token from being replayed.
 */
export async function makeNonce(): Promise<{ raw: string; hashed: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const raw = btoa(String.fromCharCode(...bytes));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  return { raw, hashed };
}
