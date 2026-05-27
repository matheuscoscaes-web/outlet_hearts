import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function RejectedPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="text-6xl mb-4">❌</div>
      <h1 className="text-2xl font-bold text-gray-900">Pagamento não aprovado</h1>
      <p className="text-gray-500 mt-2 mb-6">
        Seu pagamento foi recusado ou houve um problema na transação. A reserva foi cancelada e o produto voltou ao estoque.
      </p>
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 mb-6 text-left">
        <p className="font-medium mb-1">O que pode ter ocorrido:</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Dados do cartão incorretos</li>
          <li>Limite insuficiente</li>
          <li>Cartão bloqueado para compras online</li>
          <li>Falha na autenticação 3D Secure</li>
        </ul>
      </div>
      <Link href="/">
        <Button size="lg" className="w-full">Tentar comprar novamente</Button>
      </Link>
    </div>
  );
}
