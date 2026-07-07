"use client";

import { useState } from "react";
import { FileBarChart } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";

interface DailyReport {
  date: string;
  totalOrders: number;
  totalSales: number;
  groups: { group: string; count: number; total: number }[];
}

export default function RelatoriosPage() {
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/reports/daily");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Erro ao gerar relatório");
      setLoading(false);
      return;
    }
    setReport(data);
    setLoading(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Relatório diário</h1>
        <Button onClick={handleGenerate} loading={loading}>
          <FileBarChart className="h-4 w-4" />
          Gerar relatório de hoje
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {!report && !loading && (
        <p className="text-sm text-gray-500">Clique em "Gerar relatório de hoje" pra ver as vendas do dia.</p>
      )}

      {report && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Vendas de hoje ({new Date(report.date + "T12:00:00").toLocaleDateString("pt-BR")})
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <p className="text-xs text-gray-400">Total vendido</p>
              <p className="text-2xl font-bold text-brand-600">{formatCurrency(report.totalSales)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <p className="text-xs text-gray-400">Pedidos pagos</p>
              <p className="text-2xl font-bold text-gray-900">{report.totalOrders}</p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
            <table className="w-full min-w-[400px] text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Grupo da Hearts</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Pedidos</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Total vendido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {report.groups.map((g) => (
                  <tr key={g.group}>
                    <td className="px-4 py-3 text-gray-900">{g.group}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{g.count}</td>
                    <td className="px-4 py-3 text-right font-semibold text-brand-600">{formatCurrency(g.total)}</td>
                  </tr>
                ))}
                {report.groups.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                      Nenhuma venda paga hoje ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
