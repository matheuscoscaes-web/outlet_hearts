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
import { translatePaymentRejection } from "@/lib/payment-messages";
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
  const [paymentError, setPaymentError] = useState("");

  const [deliveryMethod, setDeliveryMethod] = useState<"SHIPPING" | "PICKUP">("SHIPPING");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    cpf: "",
    groupNumber: "",
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

  const [shippingQuote, setShippingQuote] = useState<{ serviceName: string; price: number } | null>(null);
  const [shippingQuoteLoading, setShippingQuoteLoading] = useState(false);
  const [shippingQuoteError, setShippingQuoteError] = useState("");

  const [phase, setPhase] = useState<"form" | "payment" | "pix">("form");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [pixData, setPixData] = useState<{ qrCode: string; qrCodeBase64: string; ticketUrl: string | null } | null>(null);
  const [pixCopied, setPixCopied] = useState(false);

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
    setShippingQuote(null);
    setShippingQuoteError("");

    let state = form.state;

    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();

      if (data.erro) {
        setCepError("CEP não encontrado");
        return;
      }

      state = data.uf || form.state;

      setForm((f) => ({
        ...f,
        street: data.logradouro || f.street,
        neighborhood: data.bairro || f.neighborhood,
        city: data.localidade || f.city,
        state,
      }));
    } catch {
      setCepError("Não foi possível buscar o CEP. Preencha manualmente.");
      return;
    } finally {
      setCepLoading(false);
    }

    if (!state || !reservation) return;

    setShippingQuoteLoading(true);
    try {
      const quoteRes = await fetch("/api/shipping/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId: reservation.id, cep: digits, state }),
      });
      const quoteData = await quoteRes.json();
      if (!quoteRes.ok) {
        setShippingQuoteError(quoteData.error ?? "Não foi possível calcular o frete pra esse CEP.");
      } else {
        setShippingQuote({ serviceName: quoteData.serviceName, price: quoteData.price });
      }
    } catch {
      setShippingQuoteError("Não foi possível calcular o frete. Tente novamente.");
    } finally {
      setShippingQuoteLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reservation) return;

    if (deliveryMethod === "SHIPPING" && !shippingQuote) {
      setError("Aguarde o cálculo do frete (ou confira o CEP) antes de continuar.");
      return;
    }

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
        groupNumber: form.groupNumber,
        deliveryMethod,
        ...(deliveryMethod === "SHIPPING"
          ? {
              shippingCep: form.cep,
              shippingStreet: form.street,
              shippingNumber: form.number,
              shippingComplement: form.complement,
              shippingNeighborhood: form.neighborhood,
              shippingCity: form.city,
              shippingState: form.state,
            }
          : {}),
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
    setPaymentError("");
    try {
      const res = await fetch("/api/payments/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData, orderId }),
      });

      if (!res.ok) {
        throw new Error("Erro ao processar pagamento. Tente novamente ou use outra forma de pagamento.");
      }

      const data = await res.json();

      if (data.status === "approved") {
        router.push(`/pedido/aprovado?orderId=${orderId}`);
        return;
      }
      if (data.status === "rejected") {
        throw new Error(translatePaymentRejection(data.statusDetail));
      }
      if (data.qrCode) {
        setPixData({ qrCode: data.qrCode, qrCodeBase64: data.qrCodeBase64, ticketUrl: data.ticketUrl });
        setPhase("pix");
        return;
      }
      if (data.ticketUrl) {
        setPixData({ qrCode: "", qrCodeBase64: "", ticketUrl: data.ticketUrl });
        setPhase("pix");
        return;
      }
      router.push(`/pedido/aprovado?orderId=${orderId}&status=pending`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao processar pagamento. Tente novamente.";
      setPaymentError(message);
      throw err;
    }
  }

  useEffect(() => {
    if (phase !== "pix" || !orderId) return;

    const poll = setInterval(async () => {
      const res = await fetch(`/api/orders/${orderId}/status`);
      const data = await res.json();
      if (data.status === "PAID") {
        clearInterval(poll);
        router.push(`/pedido/aprovado?orderId=${orderId}`);
      }
    }, 3000);

    return () => clearInterval(poll);
  }, [phase, orderId, router]);

  async function handleCopyPixCode() {
    if (!pixData?.qrCode) return;
    await navigator.clipboard.writeText(pixData.qrCode);
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 2500);
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

  const productTotal = Number(reservation.product.outletPrice) * reservation.quantity;
  const shippingCost = deliveryMethod === "SHIPPING" ? shippingQuote?.price ?? 0 : 0;
  const total = productTotal + shippingCost;
  const shippingPending = deliveryMethod === "SHIPPING" && !shippingQuote;

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
          <p className="font-bold text-brand-600 mt-1">{formatCurrency(productTotal)}</p>
        </div>
      </div>
      <div className="border-t border-gray-100 mt-4 pt-4 space-y-1.5">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Produto</span>
          <span>{formatCurrency(productTotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Frete{shippingQuote ? ` (${shippingQuote.serviceName})` : ""}</span>
          <span>
            {deliveryMethod === "PICKUP"
              ? "Retirada"
              : shippingQuote
              ? formatCurrency(shippingQuote.price)
              : "—"}
          </span>
        </div>
        <div className="flex justify-between text-sm font-bold pt-1.5 border-t border-gray-100">
          <span>Total</span>
          <span className="text-brand-600">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );

  if (phase === "pix" && pixData) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
        <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-gray-900 mb-6">Finalizar compra</h1>

        <Countdown expiresAt={reservation.expiresAt} onExpired={() => setExpired(true)} />

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          {orderSummary}

          <div className="rounded-xl border border-gray-200 bg-white p-5 flex flex-col items-center text-center gap-4">
            {pixData.qrCodeBase64 ? (
              <>
                <h2 className="font-semibold text-gray-900">Pague com Pix</h2>
                <p className="text-sm text-gray-500 -mt-2">Escaneie o QR Code no app do seu banco</p>
                <img
                  src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                  alt="QR Code Pix"
                  className="h-56 w-56 rounded-lg border border-gray-200"
                />
                <div className="w-full">
                  <p className="text-xs text-gray-500 mb-1.5">Ou copie o código Pix Copia e Cola:</p>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={pixData.qrCode}
                      className="flex-1 min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-600 truncate"
                    />
                    <Button onClick={handleCopyPixCode} variant={pixCopied ? "secondary" : "primary"} className="shrink-0">
                      {pixCopied ? "Copiado!" : "Copiar"}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h2 className="font-semibold text-gray-900">Pague com Boleto</h2>
                <p className="text-sm text-gray-500 -mt-2">Abra o boleto para pagar no banco ou lotérica</p>
                {pixData.ticketUrl && (
                  <a href={pixData.ticketUrl} target="_blank" rel="noopener noreferrer" className="w-full">
                    <Button className="w-full">Abrir boleto</Button>
                  </a>
                )}
              </>
            )}
            <div className="flex items-center gap-2 text-xs text-gray-400 mt-2">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-brand-600" />
              Aguardando confirmação do pagamento...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "payment" && preferenceId && orderId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
        <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-gray-900 mb-6">Finalizar compra</h1>

        <Countdown expiresAt={reservation.expiresAt} onExpired={() => setExpired(true)} />

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          {orderSummary}

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Pagamento</h2>
            {paymentError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4">
                {paymentError}
              </div>
            )}
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
                  minInstallments: 1,
                  maxInstallments: 6,
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
          <Input
            label="Número do grupo da Hearts"
            required
            value={form.groupNumber}
            onChange={(e) => setForm((f) => ({ ...f, groupNumber: e.target.value }))}
            placeholder="Ex: 5"
          />

          <h2 className="font-semibold text-gray-900 mt-2">Como você quer receber?</h2>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDeliveryMethod("SHIPPING")}
              className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                deliveryMethod === "SHIPPING"
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-gray-200 text-gray-600 hover:border-brand-300"
              }`}
            >
              📦 Receber em casa
            </button>
            <button
              type="button"
              onClick={() => setDeliveryMethod("PICKUP")}
              className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                deliveryMethod === "PICKUP"
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-gray-200 text-gray-600 hover:border-brand-300"
              }`}
            >
              🏬 Retirar na loja
            </button>
          </div>

          {deliveryMethod === "PICKUP" ? (
            <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-4 py-3">
              Depois da confirmação do pagamento, entraremos em contato por e-mail ou WhatsApp com o endereço e o horário para retirada.
            </p>
          ) : (
            <>
              <div>
                <Input
                  label="CEP"
                  required
                  inputMode="numeric"
                  value={form.cep}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, cep: formatCEP(e.target.value) }));
                    setShippingQuote(null);
                    setShippingQuoteError("");
                  }}
                  onBlur={handleCepBlur}
                  placeholder="00000-000"
                  maxLength={9}
                />
                {cepLoading && <p className="text-xs text-gray-400 mt-1">Buscando endereço...</p>}
                {cepError && <p className="text-xs text-red-600 mt-1">{cepError}</p>}
                {shippingQuoteLoading && <p className="text-xs text-gray-400 mt-1">Calculando frete...</p>}
                {shippingQuoteError && <p className="text-xs text-red-600 mt-1">{shippingQuoteError}</p>}
                {shippingQuote && (
                  <p className="text-xs text-green-700 mt-1">
                    Frete {shippingQuote.serviceName}: {formatCurrency(shippingQuote.price)}
                  </p>
                )}
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
            </>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            loading={submitting}
            disabled={shippingPending}
            className="w-full"
          >
            {submitting
              ? "Processando..."
              : shippingQuoteLoading
              ? "Calculando frete..."
              : shippingPending
              ? "Informe o CEP para continuar"
              : `Continuar para o pagamento · ${formatCurrency(total)}`}
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
