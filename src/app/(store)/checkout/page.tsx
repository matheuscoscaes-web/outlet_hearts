"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { initMercadoPago } from "@mercadopago/sdk-react";
import type { IPaymentFormData } from "@mercadopago/sdk-react/esm/bricks/payment/type";
import { Countdown } from "@/components/store/Countdown";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatCurrency, formatCPF, formatCEP } from "@/lib/utils";
import Image from "next/image";

const PaymentBrick = dynamic(
  () => import("@mercadopago/sdk-react").then((m) => m.Payment),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-48">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    ),
  }
);

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

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    cpf: "",
    cep: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
  });
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState("");

  const [phase, setPhase] = useState<"form" | "payment">("form");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);

  useEffect(() => {
    initMercadoPago(process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY!, {
      locale: "pt-BR",
    });
  }, []);

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

  async function handleCepBlur() {
    const digits = form.cep.replace(/\D/g, "");
    if (digits.length !== 8) return;

    setCepLoading(true);
    setCepError("");

    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();

      if (data.erro) {
        setCepError("CEP não encontrado");
        return;
      }

      setForm((f) => ({
        ...f,
        street: data.logradouro || f.street,
        neighborhood: data.bairro || f.neighborhood,
        city: data.localidade || f.city,
        state: data.uf || f.state,
      }));
    } catch {
      setCepError("Não foi possível buscar o CEP. Preencha manualmente.");
    } finally {
      setCepLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reservation) return;

    setSubmitting(true);
    setError("");

    const orderRes = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reservationId: reservation.id,
        customerName: form.name,
        customerEmail: form.email,
        customerPhone: form.phone,
        customerCpf: form.cpf,
        shippingCep: form.cep,
        shippingStreet: form.street,
        shippingNumber: form.number,
        shippingComplement: form.complement,
        shippingNeighborhood: form.neighborhood,
        shippingCity: form.city,
        shippingState: form.state,
      }),
    });

    const orderData = await orderRes.json();

    if (!orderRes.ok) {
      setError(orderData.error ?? "Erro ao criar pedido. Tente novamente.");
      setSubmitting(false);
      return;
    }

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

    setOrderId(orderData.id);
    setPreferenceId(payData.preferenceId);
    setPhase("payment");
    setSubmitting(false);
  }

  async function handleBrickSubmit({ formData }: IPaymentFormData) {
    const res = await fetch("/api/payments/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formData, orderId }),
    });

    if (!res.ok) {
      throw new Error("Erro ao processar pagamento");
    }

    const data = await res.json();

    if (data.status === "approved") {
      router.push(`/pedido/aprovado?orderId=${orderId}`);
    } else if (data.status === "in_process" || data.status === "pending") {
      router.push(`/pedido/aprovado?orderId=${orderId}&status=pending`);
    } else if (data.status === "rejected") {
      throw new Error("Pagamento recusado. Verifique os dados e tente novamente.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (expired || !reservation) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-5xl mb-4">⏰</p>
        <h2 className="text-xl font-bold text-gray-900">Reserva expirada</h2>
        <p className="text-gray-500 mt-2 mb-6">
          O tempo de reserva se encerrou e o produto voltou ao estoque.
        </p>
        <Button onClick={() => router.push("/")}>Ver produtos disponíveis</Button>
      </div>
    );
  }

  const total = Number(reservation.product.outletPrice) * reservation.quantity;

  const orderSummary = (
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
          <p className="font-bold text-brand-600 mt-1">{formatCurrency(total)}</p>
        </div>
      </div>
      <div className="border-t border-gray-100 mt-4 pt-4">
        <div className="flex justify-between text-sm font-bold">
          <span>Total</span>
          <span className="text-brand-600">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );

  if (phase === "payment" && preferenceId && orderId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
        <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-gray-900 mb-6">Finalizar compra</h1>

        <Countdown expiresAt={reservation.expiresAt} onExpired={() => setExpired(true)} />

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          {orderSummary}

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Pagamento</h2>
            <PaymentBrick
              initialization={{
                amount: total,
                preferenceId,
                payer: { email: form.email },
              }}
              customization={{
                paymentMethods: {
                  creditCard: "all",
                  debitCard: "all",
                  ticket: "all",
                  bankTransfer: "all",
                  atm: "all",
                },
              }}
              onSubmit={handleBrickSubmit}
              onError={(err) => console.error("[PaymentBrick]", err)}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-gray-900 mb-6">Finalizar compra</h1>

      <Countdown expiresAt={reservation.expiresAt} onExpired={() => setExpired(true)} />

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        {orderSummary}

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-gray-200 bg-white p-5 flex flex-col gap-4"
        >
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
          <Input
            label="CPF"
            required
            inputMode="numeric"
            value={form.cpf}
            onChange={(e) => setForm((f) => ({ ...f, cpf: formatCPF(e.target.value) }))}
            placeholder="000.000.000-00"
            maxLength={14}
          />

          <h2 className="font-semibold text-gray-900 mt-2">Endereço de entrega</h2>

          <div>
            <Input
              label="CEP"
              required
              inputMode="numeric"
              value={form.cep}
              onChange={(e) => setForm((f) => ({ ...f, cep: formatCEP(e.target.value) }))}
              onBlur={handleCepBlur}
              placeholder="00000-000"
              maxLength={9}
            />
            {cepLoading && <p className="text-xs text-gray-400 mt-1">Buscando endereço...</p>}
            {cepError && <p className="text-xs text-red-600 mt-1">{cepError}</p>}
          </div>

          <Input
            label="Rua"
            required
            value={form.street}
            onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))}
            placeholder="Rua das Flores"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Número"
              required
              value={form.number}
              onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
              placeholder="123"
            />
            <Input
              label="Complemento (opcional)"
              value={form.complement}
              onChange={(e) => setForm((f) => ({ ...f, complement: e.target.value }))}
              placeholder="Apto 12"
            />
          </div>

          <Input
            label="Bairro"
            required
            value={form.neighborhood}
            onChange={(e) => setForm((f) => ({ ...f, neighborhood: e.target.value }))}
            placeholder="Centro"
          />

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Input
                label="Cidade"
                required
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                placeholder="São Paulo"
              />
            </div>
            <Input
              label="UF"
              required
              maxLength={2}
              value={form.state}
              onChange={(e) => setForm((f) => ({ ...f, state: e.target.value.toUpperCase() }))}
              placeholder="SP"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <Button type="submit" size="lg" loading={submitting} className="w-full">
            {submitting ? "Processando..." : `Continuar para o pagamento · ${formatCurrency(total)}`}
          </Button>

          <p className="text-xs text-center text-gray-500">
            Pagamento seguro via Mercado Pago. Aceitamos cartão, PIX e boleto.
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
