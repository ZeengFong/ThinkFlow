"use client";

import { useQuery } from "@tanstack/react-query";
import { tasksApi, type Task } from "@/lib/api";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => tasksApi.list(),
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = [];

    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    return days;
  }, [year, month]);

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.forEach((t) => {
      if (!t.due_date) return;
      const key = new Date(t.due_date).toDateString();
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [tasks]);

  const today = new Date().toDateString();

  return (
    <div className="p-8 max-w-5xl">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Calendar
        </h1>
        <p className="mt-1 text-muted-foreground">
          All your deadlines in one place.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-8 glass rounded-2xl p-6 shadow-soft"
      >
        {/* Month navigation */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() =>
              setCurrentDate(new Date(year, month - 1, 1))
            }
            className="press rounded-xl p-2 hover:bg-muted"
          >
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </button>
          <h2 className="text-lg font-medium text-foreground">
            {MONTHS[month]} {year}
          </h2>
          <button
            onClick={() =>
              setCurrentDate(new Date(year, month + 1, 1))
            }
            className="press rounded-xl p-2 hover:bg-muted"
          >
            <ChevronRight className="h-5 w-5 text-foreground" />
          </button>
        </div>

        {/* Day headers */}
        <div className="mb-2 grid grid-cols-7 gap-1">
          {DAYS.map((d) => (
            <div
              key={d}
              className="py-2 text-center text-xs font-medium text-muted-foreground"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, i) => {
            if (day === null)
              return <div key={`empty-${i}`} className="h-20" />;

            const dateStr = new Date(year, month, day).toDateString();
            const isToday = dateStr === today;
            const dayTasks = tasksByDate[dateStr] || [];

            return (
              <div
                key={day}
                className={`h-20 rounded-xl p-1.5 transition-colors ${
                  isToday
                    ? "bg-baby-blue/10 ring-1 ring-baby-blue/30"
                    : "hover:bg-muted/50"
                }`}
              >
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                    isToday
                      ? "bg-baby-blue font-medium text-white"
                      : "text-foreground"
                  }`}
                >
                  {day}
                </span>
                <div className="mt-0.5 space-y-0.5">
                  {dayTasks.slice(0, 2).map((t) => (
                    <div
                      key={t.id}
                      className={`truncate rounded-md px-1 py-0.5 text-[9px] font-medium ${
                        t.priority === "high"
                          ? "bg-muted-coral/15 text-muted-coral"
                          : t.priority === "medium"
                          ? "bg-baby-blue/15 text-baby-blue-dark"
                          : "bg-soft-green/15 text-soft-green"
                      }`}
                    >
                      {t.title}
                    </div>
                  ))}
                  {dayTasks.length > 2 && (
                    <span className="text-[9px] text-muted-foreground">
                      +{dayTasks.length - 2} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
