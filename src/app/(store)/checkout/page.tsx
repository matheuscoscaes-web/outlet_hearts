"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Countdown } from "@/components/store/Countdown";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/utils";
import Image from "next/image";

interface Reservation {
  id: string;
  expiresAt: string;
  quantity: number;
  product: {
    name: string;
    outletPrice: number;
    images: { url: string }[];
  };
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reservationId = searchParams.get("reservationId");

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ name: "", email: "", phone: "" });

  useEffect(() => {
    if (!reservationId) {
      router.replace("/");
      return;
    }

    fetch(`/api/reservations/${reservationId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error || data.isExpired || data.status !== "ACTIVE") {
          setExpired(true);
        } else {
          setReservation(data);
        }
      })
      .finally(() => setLoading(false));
  }, [reservationId, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reservation) return;

    setSubmitting(true);
    setError("");

    // 1. Cria pedido
    const orderRes = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reservationId: reservation.id,
        customerName: form.name,
        customerEmail: form.email,
        customerPhone: form.phone,
      }),
    });

    const orderData = await orderRes.json();

    if (!orderRes.ok) {
      setError(orderData.error ?? "Erro ao criar pedido. Tente novamente.");
      setSubmitting(false);
      return;
    }

    // 2. Inicia pagamento
    const payRes = await fetch("/api/payments/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: orderData.id }),
    });

    const payData = await payRes.json();

    if (!payRes.ok) {
      setError("Erro ao iniciar pagamento. Tente novamente.");
      setSubmitting(false);
      return;
    }

    // 3. Redireciona para o Mercado Pago
    window.location.href = payData.initPoint;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-600 border-t-transparent" />
      </div>
    );
  }

  if (expired || !reservation) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-5xl mb-4">⏰</p>
        <h2 className="text-xl font-bold text-gray-900">Reserva expirada</h2>
        <p className="text-gray-500 mt-2 mb-6">O tempo de reserva se encerrou e o produto voltou ao estoque.</p>
        <Button onClick={() => router.push("/")}>Ver produtos disponíveis</Button>
      </div>
    );
  }

  const total = Number(reservation.product.outletPrice) * reservation.quantity;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Finalizar compra</h1>

      <Countdown
        expiresAt={reservation.expiresAt}
        onExpired={() => setExpired(true)}
      />

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Resumo do pedido */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Resumo do pedido</h2>
          <div className="flex gap-3">
            {reservation.product.images[0] && (
              <div className="relative h-16 w-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                <Image
                  src={reservation.product.images[0].url}
                  alt={reservation.product.name}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div>
              <p className="font-medium text-gray-900 text-sm">{reservation.product.name}</p>
              <p className="text-xs text-gray-500">Qty: {reservation.quantity}</p>
              <p className="font-bold text-rose-600 mt-1">{formatCurrency(total)}</p>
            </div>
          </div>
          <div className="border-t border-gray-100 mt-4 pt-4">
            <div className="flex justify-between text-sm font-bold">
              <span>Total</span>
              <span className="text-rose-600">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-5 flex flex-col gap-4">
          <h2 className="font-semibold text-gray-900">Seus dados</h2>

          <Input
            label="Nome completo"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="João Silva"
          />
          <Input
            label="E-mail"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="joao@email.com"
          />
          <Input
            label="Telefone (opcional)"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="(11) 99999-9999"
          />

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <Button type="submit" size="lg" loading={submitting} className="w-full">
            {submitting ? "Processando..." : `Ir para o pagamento · ${formatCurrency(total)}`}
          </Button>

          <p className="text-xs text-center text-gray-500">
            🔒 Pagamento seguro via Mercado Pago. Aceitamos cartão, PIX e boleto.
          </p>
        </form>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutContent />
    </Suspense>
  );
}
