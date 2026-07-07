"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { formatCPF, formatCEP } from "@/lib/utils";

export function OrderAddressModal({
  customerName,
  customerPhone,
  customerCpf,
  deliveryMethod,
  shippingCep,
  shippingStreet,
  shippingNumber,
  shippingComplement,
  shippingNeighborhood,
  shippingCity,
  shippingState,
}: {
  customerName: string;
  customerPhone: string | null;
  customerCpf: string | null;
  deliveryMethod: string;
  shippingCep: string | null;
  shippingStreet: string | null;
  shippingNumber: string | null;
  shippingComplement: string | null;
  shippingNeighborhood: string | null;
  shippingCity: string | null;
  shippingState: string | null;
}) {
  const [open, setOpen] = useState(false);
  const isPickup = deliveryMethod === "PICKUP";
  const hasAddress = Boolean(shippingStreet);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-brand-50 hover:border-brand-300 hover:text-brand-700"
        title={isPickup ? "Pedido para retirada na loja" : "Ver endereço de entrega"}
      >
        <MapPin className="h-4 w-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-bold text-gray-900 mb-4">
              {isPickup ? "Retirada na loja" : "Dados para envio"}
            </h2>

            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-gray-400">Cliente</dt>
                <dd className="text-gray-900 font-medium">{customerName}</dd>
              </div>
              {customerCpf && (
                <div>
                  <dt className="text-xs text-gray-400">CPF</dt>
                  <dd className="text-gray-900">{formatCPF(customerCpf)}</dd>
                </div>
              )}
              {customerPhone && (
                <div>
                  <dt className="text-xs text-gray-400">Telefone</dt>
                  <dd className="text-gray-900">{customerPhone}</dd>
                </div>
              )}
              <div className="border-t border-gray-100 pt-3">
                {isPickup ? (
                  <>
                    <dt className="text-xs text-gray-400">Entrega</dt>
                    <dd className="text-gray-900">🏬 Cliente vai retirar na loja</dd>
                  </>
                ) : (
                  <>
                    <dt className="text-xs text-gray-400">Endereço</dt>
                    {hasAddress ? (
                      <dd className="text-gray-900">
                        {shippingStreet}, {shippingNumber}
                        {shippingComplement ? ` — ${shippingComplement}` : ""}
                        <br />
                        {shippingNeighborhood} — {shippingCity}/{shippingState}
                        <br />
                        CEP {shippingCep ? formatCEP(shippingCep) : "—"}
                      </dd>
                    ) : (
                      <dd className="text-gray-400">Não informado (pedido antigo)</dd>
                    )}
                  </>
                )}
              </div>
            </dl>

            <button
              onClick={() => setOpen(false)}
              className="mt-6 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
