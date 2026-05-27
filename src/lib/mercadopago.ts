import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import crypto from "crypto";

export const mp = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

export const mpPreference = new Preference(mp);
export const mpPayment = new Payment(mp);

export interface CreatePreferenceInput {
  orderId: string;
  reservationId: string;
  productName: string;
  amount: number;
  customerEmail: string;
  customerName: string;
}

export async function createPaymentPreference(
  input: CreatePreferenceInput
): Promise<{ id: string; init_point: string }> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  const preference = await mpPreference.create({
    body: {
      external_reference: input.orderId,
      items: [
        {
          id: input.orderId,
          title: input.productName,
          quantity: 1,
          unit_price: input.amount,
          currency_id: "BRL",
        },
      ],
      payer: {
        email: input.customerEmail,
        name: input.customerName,
      },
      back_urls: {
        success: `${baseUrl}/pedido/aprovado?orderId=${input.orderId}`,
        failure: `${baseUrl}/pedido/recusado?orderId=${input.orderId}`,
        pending: `${baseUrl}/pedido/aprovado?orderId=${input.orderId}&status=pending`,
      },
      auto_return: "approved",
      ...(baseUrl && !baseUrl.includes("localhost")
        ? { notification_url: `${baseUrl}/api/payments/webhook` }
        : {}),
      metadata: {
        reservation_id: input.reservationId,
        order_id: input.orderId,
      },
    },
  });

  return {
    id: preference.id!,
    init_point: preference.init_point!,
  };
}

export function validateWebhookSignature(
  signatureHeader: string,
  requestId: string,
  dataId: string
): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) return true; // em dev, pula validação

  try {
    const parts = signatureHeader.split(",");
    const tsEntry = parts.find((p) => p.startsWith("ts="));
    const v1Entry = parts.find((p) => p.startsWith("v1="));
    if (!tsEntry || !v1Entry) return false;

    const ts = tsEntry.replace("ts=", "");
    const v1 = v1Entry.replace("v1=", "");

    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const expected = crypto
      .createHmac("sha256", secret)
      .update(manifest)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(v1, "hex"),
      Buffer.from(expected, "hex")
    );
  } catch {
    return false;
  }
}
