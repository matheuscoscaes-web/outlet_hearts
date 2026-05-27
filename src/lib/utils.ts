export function formatCurrency(value: number | string): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

export function calcDiscount(original: number, outlet: number): number {
  return Math.round(((original - outlet) / original) * 100);
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

export const CONDITION_LABELS: Record<string, string> = {
  NEW: "Novo",
  LIKE_NEW: "Seminovo",
  STOCK_END: "Ponta de estoque",
  UNIQUE_PIECE: "Peça única",
};

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
