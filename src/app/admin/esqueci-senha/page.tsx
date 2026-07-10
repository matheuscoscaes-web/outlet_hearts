"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error ?? `Erro ao solicitar redefinição (status ${res.status})`);
        return;
      }

      setSent(true);
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
          {sent ? (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Verifique seu e-mail</h1>
              <p className="text-sm text-gray-600 mb-6">
                Se <strong>{email}</strong> estiver cadastrado, você receberá um link para
                redefinir sua senha em instantes. Confira também a caixa de spam.
              </p>
              <Link href="/admin/login" className="text-sm font-medium text-brand-600 hover:underline">
                Voltar para o login
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Esqueceu a senha?</h1>
              <p className="text-sm text-gray-600 mb-6">
                Informe seu e-mail e enviaremos um link para redefinir sua senha.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Input
                  label="E-mail"
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@exemplo.com"
                />

                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <Button type="submit" loading={loading} className="w-full mt-2">
                  Enviar link de redefinição
                </Button>

                <Link
                  href="/admin/login"
                  className="text-center text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  Voltar para o login
                </Link>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
