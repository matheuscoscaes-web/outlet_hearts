export function formatCurrency(value: number | string): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

export function calcDiscount(original: number, outlet: number): number {
  return Math.round(((original - outlet) / original) * 100);
}

// Evita imprecisão de ponto flutuante (ex: 89.9 + 15.36 = 105.26000000000001)
// em valores monetários somados de fontes diferentes (produto + frete).
// O Mercado Pago recusa "transaction_amount" com mais de 2 casas decimais.
export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function calcAvailable(
  total: number,
  reserved: number,
  sold: number
): number {
  return Math.max(0, total - reserved - sold);
}

/**
 * Disponibilidade de um produto que já veio com stock/variants
 * carregados (sem query extra) — soma as variantes por cor se
 * existirem, senão cai no Stock por produto de sempre.
 */
export function calcProductAvailable(
  stock: { quantityTotal: number; quantityReserved: number; quantitySold: number } | null,
  variants: { quantityTotal: number; quantityReserved: number; quantitySold: number }[]
): number {
  if (variants.length > 0) {
    return variants.reduce(
      (sum, v) => sum + calcAvailable(v.quantityTotal, v.quantityReserved, v.quantitySold),
      0
    );
  }
  return stock ? calcAvailable(stock.quantityTotal, stock.quantityReserved, stock.quantitySold) : 0;
}

export const CONDITION_LABELS: Record<string, string> = {
  NEW: "Novo",
  LIKE_NEW: "Seminovo",
  STOCK_END: "Ponta de estoque",
  UNIQUE_PIECE: "Peça única",
};

export function isValidCPF(value: string): boolean {
  const cpf = value.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const digits = cpf.split("").map(Number);

  const calcCheckDigit = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += digits[i] * (length + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return calcCheckDigit(9) === digits[9] && calcCheckDigit(10) === digits[10];
}

export function formatCPF(value: string): string {
  const cpf = value.replace(/\D/g, "").slice(0, 11);
  return cpf
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function formatCEP(value: string): string {
  const cep = value.replace(/\D/g, "").slice(0, 8);
  return cep.replace(/(\d{5})(\d)/, "$1-$2");
}

export const CATEGORY_OPTIONS = [
  "Roupas",
  "Calçados",
  "Acessórios",
  "Bolsas",
  "Eletrônicos",
  "Casa e Decoração",
  "Esportes",
  "Outros",
];
