import { timestampDate } from "@bufbuild/protobuf/wkt";
import { useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import { memoServiceClient } from "@/connect";
import { useAuth } from "@/contexts/AuthContext";
import { Memo } from "@/types/proto/api/v1/memo_service_pb";

export const useAlarms = () => {
  const { currentUser } = useAuth();
  const notifiedAlarms = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const checkAlarms = async () => {
      try {
        // Fetch memos that have an alarm
        const { memos } = await memoServiceClient.listMemos({
          filter: "has_alarm == true",
          pageSize: 100, // Fetch up to 100 active alarms
        });

        const now = Date.now();

        memos.forEach((memo: Memo) => {
          if (!memo.alarmTime) return;

          const alarmTime = timestampDate(memo.alarmTime).getTime();
          // If alarm time is in the past 1 minute and we haven't notified yet
          if (alarmTime <= now && alarmTime > now - 60000 && !notifiedAlarms.current.has(memo.name)) {
            notifiedAlarms.current.add(memo.name);

            // Show browser push notification if permitted
            if ("Notification" in window && Notification.permission === "granted") {
              const notification = new Notification("Quicktext Alarm", {
                body: memo.snippet || "You have an alarm for this memo.",
                icon: "/logo.png",
              });
              notification.onclick = () => {
                window.focus();
                // We could navigate to the memo, but just focusing the window is fine
              };
            } else {
              // Fallback to toast
              toast("Alarm: " + (memo.snippet || "Memo Alarm"), { icon: "⏰" });
            }
          }
        });
      } catch (error) {
        console.error("Failed to check alarms:", error);
      }
    };

    // Check immediately, then every 30 seconds
    checkAlarms();
    timerRef.current = setInterval(checkAlarms, 30000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentUser]);
};
