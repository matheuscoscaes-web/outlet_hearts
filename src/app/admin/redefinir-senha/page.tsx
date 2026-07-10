"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error ?? `Erro ao redefinir senha (status ${res.status})`);
        return;
      }

      setDone(true);
      setTimeout(() => router.push("/admin/login"), 2000);
    } catch {
      setError("Não foi possível conectar ao servidor. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Heart className="h-7 w-7 fill-brand-600 text-brand-600" />
          <span className="text-xl font-bold text-gray-900">
            Outlet<span className="text-brand-600">Hearts</span>
            <span className="ml-2 text-sm font-normal text-gray-500">Admin</span>
          </span>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          {!token ? (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Link inválido</h1>
              <p className="text-sm text-gray-600 mb-6">
                Esse link de redefinição está incompleto. Solicite um novo.
              </p>
              <Link href="/admin/esqueci-senha" className="text-sm font-medium text-brand-600 hover:underline">
                Solicitar novo link
              </Link>
            </>
          ) : done ? (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Senha redefinida!</h1>
              <p className="text-sm text-gray-600">Redirecionando para o login...</p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-6">Definir nova senha</h1>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Input
                  label="Nova senha"
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <Input
                  label="Confirmar nova senha"
                  id="confirmPassword"
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />

                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <Button type="submit" loading={loading} className="w-full mt-2">
                  Redefinir senha
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}
