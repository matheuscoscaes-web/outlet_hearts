"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { slugify, CATEGORY_OPTIONS, calcDiscount } from "@/lib/utils";
import Image from "next/image";
import { X, Upload } from "lucide-react";

interface ProductFormProps {
  initialData?: {
    id?: string;
    name?: string;
    slug?: string;
    shortDescription?: string;
    description?: string;
    category?: string;
    brand?: string;
    sizes?: string[];
    colors?: string[];
    condition?: string;
    originalPrice?: number;
    outletPrice?: number;
    status?: string;
    images?: { id: string; url: string; altText?: string | null }[];
    stock?: { quantityTotal: number };
  };
}

function TagListInput({
  label,
  placeholder,
  values,
  onChange,
}: {
  label: string;
  placeholder: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function addTag() {
    const value = draft.trim();
    if (!value || values.includes(value)) {
      setDraft("");
      return;
    }
    onChange([...values, value]);
    setDraft("");
  }

  function removeTag(value: string) {
    onChange(values.filter((v) => v !== value));
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          type="button"
          onClick={addTag}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Adicionar
        </button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-full bg-brand-50 text-brand-700 text-xs font-medium px-2.5 py-1"
            >
              {v}
              <button
                type="button"
                onClick={() => removeTag(v)}
                className="hover:text-brand-900"
                aria-label={`Remover ${v}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProductForm({ initialData }: ProductFormProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const isEditing = !!initialData?.id;

  const [form, setForm] = useState({
    name: initialData?.name ?? "",
    slug: initialData?.slug ?? "",
    shortDescription: initialData?.shortDescription ?? "",
    description: initialData?.description ?? "",
    category: initialData?.category ?? "",
    brand: initialData?.brand ?? "",
    originalPrice: initialData?.originalPrice?.toString() ?? "",
    outletPrice: initialData?.outletPrice?.toString() ?? "",
    quantity: initialData?.stock?.quantityTotal?.toString() ?? "",
    status: initialData?.status ?? "ACTIVE",
  });
  const [sizes, setSizes] = useState<string[]>(initialData?.sizes ?? []);
  const [colors, setColors] = useState<string[]>(initialData?.colors ?? []);

  const [images, setImages] = useState<{ id: string; url: string }[]>(
    initialData?.images?.map((i) => ({ id: i.id, url: i.url })) ?? []
  );
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const discount =
    form.originalPrice && form.outletPrice
      ? calcDiscount(Number(form.originalPrice), Number(form.outletPrice))
      : 0;

  function handleNameChange(name: string) {
    setForm((f) => ({ ...f, name, ...(!isEditing ? { slug: slugify(name) } : {}) }));
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setPendingFiles((prev) => [...prev, ...files]);
    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      setPreviews((prev) => [...prev, url]);
    });
  }

  function removePending(i: number) {
    setPendingFiles((prev) => prev.filter((_, idx) => idx !== i));
    setPreviews((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function removeExisting(imageId: string) {
    if (!initialData?.id) return;
    await fetch(`/api/admin/products/${initialData.id}/images`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageId }),
    });
    setImages((prev) => prev.filter((i) => i.id !== imageId));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const payload = {
      name: form.name,
      slug: form.slug,
      shortDescription: form.shortDescription,
      description: form.description,
      category: form.category,
      brand: form.brand || undefined,
      sizes,
      colors,
      originalPrice: Number(form.originalPrice),
      outletPrice: Number(form.outletPrice),
      quantity: Number(form.quantity),
      status: form.status,
    };

    const url = isEditing ? `/api/admin/products/${initialData.id}` : "/api/admin/products";
    const method = isEditing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      if (data.details?.fieldErrors) {
        const fields = data.details.fieldErrors as Record<string, string[]>;
        const msgs = Object.entries(fields)
          .map(([field, errs]) => `${field}: ${errs.join(", ")}`)
          .join(" | ");
        setError(msgs || data.error || "Erro ao salvar produto");
      } else {
        setError(data.error ?? "Erro ao salvar produto");
      }
      setLoading(false);
      return;
    }

    const productId = data.id;

    // Upload de imagens pendentes
    if (pendingFiles.length > 0) {
      const fd = new FormData();
      pendingFiles.forEach((f) => fd.append("files", f));
      await fetch(`/api/admin/products/${productId}/images`, {
        method: "POST",
        body: fd,
      });
    }

    router.push("/admin/produtos");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Informações básicas */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Informações do produto</h2>

        <Input
          label="Nome do produto *"
          value={form.name}
          onChange={(e) => handleNameChange(e.target.value)}
          required
          placeholder="Ex: Tênis Nike Air Max 90"
        />
        <Input
          label="Slug (URL) *"
          value={form.slug}
          onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
          required
          placeholder="tenis-nike-air-max-90"
        />
        <Input
          label="Descrição curta *"
          value={form.shortDescription}
          onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))}
          required
          maxLength={150}
          placeholder="Resumo em até 150 caracteres"
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Descrição completa *</label>
          <textarea
            required
            rows={5}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Descreva o produto com detalhes..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Categoria *</label>
            <select
              required
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Selecione...</option>
              {CATEGORY_OPTIONS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <Input label="Marca" value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} placeholder="Nike" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TagListInput
            label="Tamanhos"
            placeholder="Ex: M, 42..."
            values={sizes}
            onChange={setSizes}
          />
          <TagListInput
            label="Cores"
            placeholder="Ex: Azul, Preto..."
            values={colors}
            onChange={setColors}
          />
        </div>
      </div>

      {/* Preços e estoque */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Preços e estoque</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Preço original (R$) *"
            type="number"
            step="0.01"
            min="0.01"
            required
            value={form.originalPrice}
            onChange={(e) => setForm((f) => ({ ...f, originalPrice: e.target.value }))}
            placeholder="299.90"
          />
          <Input
            label="Preço outlet (R$) *"
            type="number"
            step="0.01"
            min="0.01"
            required
            value={form.outletPrice}
            onChange={(e) => setForm((f) => ({ ...f, outletPrice: e.target.value }))}
            placeholder="149.90"
          />
        </div>
        {discount > 0 && (
          <p className="text-sm font-medium text-green-700 bg-green-50 rounded-lg px-3 py-2">
            ✅ Desconto de {discount}% — cliente economiza R$ {(Number(form.originalPrice) - Number(form.outletPrice)).toFixed(2)}
          </p>
        )}
        <Input
          label={isEditing ? "Quantidade total em estoque (atual)" : "Quantidade em estoque *"}
          type="number"
          min="0"
          required={!isEditing}
          value={form.quantity}
          onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
          placeholder="5"
        />
        {isEditing && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded px-3 py-2">
            ⚠️ Para ajustar estoque com registro de motivo, use a opção "Ajustar estoque" na listagem de produtos.
          </p>
        )}
      </div>

      {/* Imagens */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Imagens do produto</h2>

        <div className="flex flex-wrap gap-3">
          {images.map((img) => (
            <div key={img.id} className="relative h-20 w-20 rounded-lg overflow-hidden border border-gray-200">
              <Image src={img.url} alt="" fill className="object-cover" />
              <button
                type="button"
                onClick={() => removeExisting(img.id)}
                className="absolute top-0.5 right-0.5 rounded-full bg-red-500 p-0.5 text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {previews.map((url, i) => (
            <div key={url} className="relative h-20 w-20 rounded-lg overflow-hidden border-2 border-dashed border-brand-300">
              <Image src={url} alt="" fill className="object-cover" />
              <button
                type="button"
                onClick={() => removePending(i)}
                className="absolute top-0.5 right-0.5 rounded-full bg-red-500 p-0.5 text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-20 w-20 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-gray-400 hover:border-brand-400 hover:text-brand-500 transition-colors"
          >
            <Upload className="h-5 w-5" />
            <span className="text-xs mt-1">Adicionar</span>
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={handleFiles}
        />
        <p className="text-xs text-gray-500">JPEG, PNG ou WebP · Máximo 5MB por imagem</p>
      </div>

      {/* Status */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="font-semibold text-gray-900 mb-3">Status</h2>
        <div className="flex gap-4">
          {[{ value: "ACTIVE", label: "Ativo" }, { value: "INACTIVE", label: "Inativo" }].map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="status"
                value={opt.value}
                checked={form.status === opt.value}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="text-brand-600"
              />
              <span className="text-sm font-medium text-gray-700">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" loading={loading}>
          {isEditing ? "Salvar alterações" : "Cadastrar produto"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
