"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Workflow } from "lucide-react";

export default function RootPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          className="mb-4 flex justify-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-baby-blue/15 shadow-soft">
            <Workflow className="h-8 w-8 text-baby-blue" />
          </div>
        </motion.div>
        <h1 className="text-5xl font-semibold tracking-tight text-foreground">
          ThinkFlow
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Think flowier, act like a plan.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Link
          href="/home"
          className="press group flex items-center gap-2 rounded-2xl bg-baby-blue px-8 py-3.5 text-sm font-medium text-primary-foreground shadow-soft transition-all hover:bg-baby-blue-dark hover:shadow-soft-lg"
        >
          Get Started
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </motion.div>
    </main>
  );
}
