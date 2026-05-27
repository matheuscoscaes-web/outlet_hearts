"use client";

import { useEffect, useState, useCallback } from "react";

interface CountdownProps {
  expiresAt: string;
  onExpired?: () => void;
}

export function Countdown({ expiresAt, onExpired }: CountdownProps) {
  const calcSeconds = useCallback(
    () => Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)),
    [expiresAt]
  );

  const [seconds, setSeconds] = useState(calcSeconds);

  useEffect(() => {
    if (seconds <= 0) {
      onExpired?.();
      return;
    }
    const id = setInterval(() => {
      const s = calcSeconds();
      setSeconds(s);
      if (s <= 0) {
        clearInterval(id);
        onExpired?.();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [calcSeconds, onExpired, seconds]);

  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  const isUrgent = seconds < 60;

  return (
    <div className={`flex items-center gap-2 rounded-lg px-4 py-3 ${isUrgent ? "bg-red-50 border border-red-200" : "bg-amber-50 border border-amber-200"}`}>
      <span className="text-xl">⏱</span>
      <div>
        <p className={`text-sm font-medium ${isUrgent ? "text-red-700" : "text-amber-700"}`}>
          Produto reservado para você
        </p>
        <p className={`text-xs ${isUrgent ? "text-red-600" : "text-amber-600"}`}>
          {seconds <= 0
            ? "Reserva expirada!"
            : `Finalize em ${mins}:${secs} antes que o tempo acabe`}
        </p>
      </div>
      <div className={`ml-auto font-mono text-2xl font-bold ${isUrgent ? "text-red-600" : "text-amber-700"}`}>
        {mins}:{secs}
      </div>
    </div>
  );
}
