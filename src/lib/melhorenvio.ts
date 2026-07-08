import { roundCurrency } from "@/lib/utils";

const BASE_URL =
  process.env.MELHORENVIO_SANDBOX === "true"
    ? "https://sandbox.melhorenvio.com.br"
    : "https://melhorenvio.com.br";

function headers() {
  const appName = process.env.MELHORENVIO_FROM_NAME ?? "OutletHearts";
  const contactEmail = process.env.MELHORENVIO_FROM_EMAIL ?? "contato@outlethearts.com";
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.MELHORENVIO_TOKEN}`,
    "User-Agent": `${appName} (${contactEmail})`,
  };
}

async function meFetch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}/api/v2${path}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message = data?.message ?? `Erro ${res.status} na API do Melhor Envio`;
    throw new Error(message);
  }

  return data as T;
}

export interface ShippingQuote {
  id: number;
  name: string;
  company: string;
  price: string;
  delivery_time: number;
  error?: string;
}

interface ShippingAddress {
  cep: string;
  street: string;
  number: string;
  complement?: string | null;
  neighborhood: string;
  city: string;
  state: string;
  name: string;
  phone?: string | null;
  email: string;
  document?: string | null;
}

function defaultPackage() {
  return {
    weight: Number(process.env.MELHORENVIO_DEFAULT_WEIGHT_KG ?? "1"),
    length: Number(process.env.MELHORENVIO_DEFAULT_LENGTH_CM ?? "32"),
    width: Number(process.env.MELHORENVIO_DEFAULT_WIDTH_CM ?? "30"),
    height: Number(process.env.MELHORENVIO_DEFAULT_HEIGHT_CM ?? "12"),
  };
}

export async function calculateShipping(toCep: string, insuranceValue: number): Promise<ShippingQuote[]> {
  const pkg = defaultPackage();

  const quotes = await meFetch<ShippingQuote[]>("/me/shipment/calculate", {
    from: { postal_code: process.env.MELHORENVIO_FROM_CEP },
    to: { postal_code: toCep.replace(/\D/g, "") },
    products: [
      {
        id: "produto",
        width: pkg.width,
        height: pkg.height,
        length: pkg.length,
        weight: pkg.weight,
        insurance_value: insuranceValue,
        quantity: 1,
      },
    ],
  });

  return quotes.filter((q) => !q.error);
}

// IDs fixos dos Correios no Melhor Envio: 1 = PAC, 2 = SEDEX.
const SEDEX_SERVICE_ID = 2;
const PAC_SERVICE_ID = 1;

/**
 * Frete padrão da loja: Sedex para o Rio de Janeiro (estado inteiro),
 * PAC para o resto do Brasil. Usado tanto na cotação exibida no
 * checkout quanto no cálculo autoritativo ao criar o pedido.
 */
export async function calculateRequiredShipping(
  toCep: string,
  toState: string,
  insuranceValue: number
): Promise<{ serviceId: number; serviceName: string; price: number }> {
  const serviceId = toState.trim().toUpperCase() === "RJ" ? SEDEX_SERVICE_ID : PAC_SERVICE_ID;
  const serviceName = serviceId === SEDEX_SERVICE_ID ? "SEDEX" : "PAC";

  const quotes = await calculateShipping(toCep, insuranceValue);
  const match = quotes.find((q) => q.id === serviceId);

  if (!match) {
    throw new Error(`Frete ${serviceName} indisponível para esse CEP no momento`);
  }

  return { serviceId, serviceName, price: roundCurrency(Number(match.price)) };
}

function fromAddress() {
  return {
    name: process.env.MELHORENVIO_FROM_NAME,
    phone: process.env.MELHORENVIO_FROM_PHONE,
    email: process.env.MELHORENVIO_FROM_EMAIL,
    document: process.env.MELHORENVIO_FROM_DOCUMENT,
    address: process.env.MELHORENVIO_FROM_STREET,
    complement: process.env.MELHORENVIO_FROM_COMPLEMENT || undefined,
    number: process.env.MELHORENVIO_FROM_NUMBER,
    district: process.env.MELHORENVIO_FROM_NEIGHBORHOOD,
    city: process.env.MELHORENVIO_FROM_CITY,
    state_abbr: process.env.MELHORENVIO_FROM_STATE,
    country_id: "BR",
    postal_code: process.env.MELHORENVIO_FROM_CEP,
  };
}

export async function purchaseShippingLabel({
  serviceId,
  to,
  productName,
  insuranceValue,
}: {
  serviceId: number;
  to: ShippingAddress;
  productName: string;
  insuranceValue: number;
}): Promise<{ cartId: string; labelUrl: string }> {
  const pkg = defaultPackage();

  const cartItem = await meFetch<{ id: string }>("/me/cart", {
    service: serviceId,
    from: fromAddress(),
    to: {
      name: to.name,
      phone: to.phone || undefined,
      email: to.email,
      document: to.document || undefined,
      address: to.street,
      complement: to.complement || undefined,
      number: to.number,
      district: to.neighborhood,
      city: to.city,
      state_abbr: to.state,
      country_id: "BR",
      postal_code: to.cep.replace(/\D/g, ""),
    },
    products: [{ name: productName, quantity: "1", unitary_value: String(insuranceValue) }],
    volumes: [pkg],
    options: {
      insurance_value: insuranceValue,
      receipt: false,
      own_hand: false,
      non_commercial: true,
    },
  });

  const cartId = cartItem.id;

  await meFetch(`/me/shipment/checkout`, { orders: [cartId] });
  await meFetch(`/me/shipment/generate`, { orders: [cartId] });
  const printed = await meFetch<{ url: string }>(`/me/shipment/print`, {
    mode: "public",
    orders: [cartId],
  });

  return { cartId, labelUrl: printed.url };
}
