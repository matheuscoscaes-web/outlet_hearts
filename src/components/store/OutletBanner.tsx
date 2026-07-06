"use client";

import { useEffect, useState, useCallback } from "react";
import { Flame } from "lucide-react";

export function OutletBanner() {
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [seconds, setSeconds] = useState<number | null>(null);

  const fetchTimer = useCallback(async () => {
    try {
      const res = await fetch("/api/outlet-timer");
      const data = await res.json();
      if (data.startedAt) {
        const ends = new Date(data.startedAt).getTime() + data.durationMinutes * 60 * 1000;
        setExpiresAt(ends);
      } else {
        setExpiresAt(null);
      }
    } catch {
      // silencioso — banner só some se não conseguir carregar
    }
  }, []);

  useEffect(() => {
    fetchTimer();
    const poll = setInterval(fetchTimer, 60000);
    return () => clearInterval(poll);
  }, [fetchTimer]);

  useEffect(() => {
    if (!expiresAt) {
      setSeconds(null);
      return;
    }
    const tick = () => setSeconds(Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (seconds === null || seconds <= 0) return null;

  const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");

  return (
    <div className="bg-brand-800 text-white">
      <div className="mx-auto max-w-7xl px-4 py-1.5 flex items-center justify-center gap-2 text-xs sm:text-sm font-medium">
        <Flame className="h-3.5 w-3.5 text-brand-300 shrink-0" />
        <span className="truncate">Outlet relâmpago termina em</span>
        <span className="font-mono font-bold tabular-nums tracking-wide">{h}:{m}:{s}</span>
      </div>
    </div>
  );
}
