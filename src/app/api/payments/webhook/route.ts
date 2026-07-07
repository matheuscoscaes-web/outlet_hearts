import { NextRequest, NextResponse } from "next/server";
import { mpPayment, validateWebhookSignature } from "@/lib/mercadopago";
import { finalizeOrderPayment } from "@/lib/finalize-payment";

export async function POST(req: NextRequest) {
  const signatureHeader = req.headers.get("x-signature") ?? "";
  const requestId = req.headers.get("x-request-id") ?? "";
  const url = new URL(req.url);
  const dataId = url.searchParams.get("data.id") ?? "";

  if (signatureHeader && !validateWebhookSignature(signatureHeader, requestId, dataId)) {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  if (body.type !== "payment" || !body.data?.id) {
    return NextResponse.json({ ok: true });
  }

  try {
    const mpData = await mpPayment.get({ id: body.data.id });
    const orderId = mpData.external_reference;

    if (orderId) {
      await finalizeOrderPayment(orderId, mpData);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/payments/webhook]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
