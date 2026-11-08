"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CalendarCheck, GitBranch, Sparkles, Workflow } from "lucide-react";

const FEATURES = [
  { icon: Sparkles, title: "AI builds the plan", text: "Describe the assignment or upload the PDF. ThinkFlow breaks it into clear steps." },
  { icon: GitBranch, title: "See the whole flow", text: "Every step and sub-step on one visual map. Break any step down further in a click." },
  { icon: CalendarCheck, title: "Scheduled to your deadline", text: "Time estimates and due dates that land before the deadline, not after." },
];

export default function RootPage() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-10 px-6 py-16">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-baby-blue/15 shadow-soft">
            <Workflow className="h-8 w-8 text-baby-blue" />
          </div>
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">ThinkFlow</h1>
        <p className="mt-3 text-lg text-muted-foreground">Think flowier, act like a plan.</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Turn big, fuzzy assignments into small steps you can actually start today.
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Link
          href="/home"
          className="press group flex items-center gap-2 rounded-2xl bg-baby-blue px-8 py-3.5 text-sm font-medium text-primary-foreground shadow-soft transition-all hover:bg-baby-blue-dark hover:shadow-soft-lg"
        >
          Get started, it&apos;s free
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="grid w-full max-w-3xl gap-3 sm:grid-cols-3"
      >
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="glass rounded-2xl p-4 shadow-soft">
            <Icon className="mb-2 h-5 w-5 text-baby-blue" />
            <p className="text-sm font-medium text-foreground">{title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p>
          </div>
        ))}
      </motion.div>

      <footer className="flex gap-4 text-xs text-muted-foreground">
        <Link href="/privacy" className="hover:text-foreground">
          Privacy Policy
        </Link>
        <Link href="/terms" className="hover:text-foreground">
          Terms of Service
        </Link>
      </footer>
    </main>
  );
}
