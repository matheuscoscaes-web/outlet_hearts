import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/auth";
import { manualReconcilePayments } from "@/lib/reconcile-payments";

export async function POST(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const result = await manualReconcilePayments();
  return NextResponse.json(result);
}
