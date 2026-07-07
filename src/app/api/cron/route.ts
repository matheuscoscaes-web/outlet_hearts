import { NextRequest, NextResponse } from "next/server";
import { expireReservations } from "@/lib/expire-reservations";
import { reconcilePendingPayments } from "@/lib/reconcile-payments";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const reconciled = await reconcilePendingPayments();
  const expired = await expireReservations();
  return NextResponse.json({ expired, reconciled });
}
