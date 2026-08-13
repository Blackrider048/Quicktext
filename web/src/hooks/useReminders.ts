import { useState } from "react";

export const useReminders = () => {
  const [reminders, setReminders] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem("memo-reminders");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const toggleReminder = (memoId: string) => {
    setReminders((prev) => {
      const next = { ...prev };
      if (next[memoId]) {
        delete next[memoId];
      } else {
        // Set reminder for 1 day in the future by default
        next[memoId] = Date.now() + 24 * 60 * 60 * 1000;
      }
      localStorage.setItem("memo-reminders", JSON.stringify(next));
      return next;
    });
  };

  const hasReminder = (memoId: string) => !!reminders[memoId];

  return { reminders, toggleReminder, hasReminder };
};
