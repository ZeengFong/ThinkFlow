import Link from "next/link";
import { ArrowLeft, Workflow } from "lucide-react";

export const CONTACT_URL = "https://github.com/ZeengFong/ThinkFlow/issues";

/** Shared layout for the privacy policy and terms pages. */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] bg-background px-4 py-10 sm:py-16">
      <article className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <Workflow className="h-4 w-4 text-baby-blue" />
          ThinkFlow
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated {updated}</p>
        <div className="legal mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">{children}</div>
        <footer className="mt-12 flex gap-4 border-t border-border pt-6 text-xs text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            Terms of Service
          </Link>
          <a href={CONTACT_URL} target="_blank" rel="noreferrer" className="hover:text-foreground">
            Contact
          </a>
        </footer>
      </article>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

export function List({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc space-y-1.5 pl-5">{children}</ul>;
}
