"use client";

import { useEffect, useState, useCallback } from "react";
import { Flame, Play, Square } from "lucide-react";

export function OutletTimerControl() {
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [seconds, setSeconds] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchTimer = useCallback(async () => {
    const res = await fetch("/api/admin/outlet-timer");
    const data = await res.json();
    if (data.startedAt) {
      setExpiresAt(new Date(data.startedAt).getTime() + data.durationMinutes * 60 * 1000);
    } else {
      setExpiresAt(null);
    }
  }, []);

  useEffect(() => {
    fetchTimer();
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

  async function trigger(action: "start" | "stop") {
    setLoading(true);
    const res = await fetch("/api/admin/outlet-timer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setExpiresAt(data.startedAt ? new Date(data.startedAt).getTime() + data.durationMinutes * 60 * 1000 : null);
    setLoading(false);
  }

  const isRunning = seconds !== null && seconds > 0;
  const h = isRunning ? String(Math.floor(seconds! / 3600)).padStart(2, "0") : "00";
  const m = isRunning ? String(Math.floor((seconds! % 3600) / 60)).padStart(2, "0") : "00";
  const s = isRunning ? String(seconds! % 60).padStart(2, "0") : "00";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        <div className={`inline-flex rounded-lg p-2 ${isRunning ? "bg-brand-50 text-brand-600" : "bg-gray-100 text-gray-400"}`}>
          <Flame className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold text-gray-900">Cronômetro do outlet</p>
          <p className="text-xs text-gray-400">
            {isRunning ? "Rodando — visível para os clientes na loja" : "Parado — não aparece na loja"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {isRunning && (
          <span className="font-mono text-xl font-bold text-brand-600 tabular-nums">{h}:{m}:{s}</span>
        )}
        <button
          onClick={() => trigger(isRunning ? "stop" : "start")}
          disabled={loading}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 active:scale-[0.97] ${
            isRunning ? "bg-red-500 hover:bg-red-600" : "bg-brand-600 hover:bg-brand-700"
          }`}
        >
          {isRunning ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {isRunning ? "Parar" : "Iniciar (3h)"}
        </button>
      </div>
    </div>
  );
}
