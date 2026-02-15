"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Moon, Sun, LogOut, Sparkles, CheckCircle, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { aiApi } from "@/lib/api";

export default function SettingsPage() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  // Default to Dark Mode
  useEffect(() => {
    if (!document.documentElement.classList.contains("light")) {
      document.documentElement.classList.add("dark");
      setTheme("dark");
    } else {
      setTheme("light");
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    if (next === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
  };

  // Check AI status from backend
  const { data: aiStatus } = useQuery({
    queryKey: ["ai-status"],
    queryFn: () => aiApi.status(),
    retry: false,
  });

  return (
    <div className="p-8 max-w-xl">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="mt-1 text-muted-foreground">
          Customise your ThinkFlow experience.
        </p>
      </motion.div>

      <div className="mt-8 space-y-4">
        {/* Appearance */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-5 shadow-soft"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-medium text-foreground">Appearance</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Toggle between light and dark mode
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className="press flex items-center gap-2 rounded-xl bg-muted px-4 py-2 text-sm font-medium text-foreground"
            >
              {theme === "light" ? (
                <>
                  <Moon className="h-4 w-4" /> Dark
                </>
              ) : (
                <>
                  <Sun className="h-4 w-4" /> Light
                </>
              )}
            </button>
          </div>
        </motion.section>

        {/* AI Config */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass rounded-2xl p-5 shadow-soft"
        >
          <h2 className="font-medium text-foreground">AI Action Insights</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Powering your daily workflows one node at a time.
          </p>
          <div
            className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2 ${
              aiStatus?.configured
                ? "bg-soft-green/10"
                : "bg-muted-coral/10"
            }`}
          >
            {aiStatus?.configured ? (
              <>
                <CheckCircle className="h-4 w-4 text-soft-green" />
                <span className="text-xs text-soft-green">
                  AI enabled using {aiStatus.model}
                </span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-muted-coral" />
                <span className="text-xs text-muted-coral">
                  Checking AI status…
                </span>
              </>
            )}
          </div>
        </motion.section>

        {/* Account */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-5 shadow-soft"
        >
          <h2 className="font-medium text-foreground">Account</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Google OAuth
          </p>
          <button className="press mt-3 flex items-center gap-2 rounded-xl bg-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/80">
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </motion.section>

        {/* About */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass rounded-2xl p-5 shadow-soft"
        >
          <h2 className="font-medium text-foreground">About</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            ThinkFlow
          </p>
        </motion.section>
      </div>
    </div>
  );
}
