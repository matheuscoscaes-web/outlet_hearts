import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword, signToken } from "@/lib/auth";
import { adminLoginSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = adminLoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const { email, password } = parsed.data;

    const admin = await prisma.adminUser.findUnique({ where: { email } });

    if (!admin || !admin.isActive) {
      // Mesmo tempo de resposta para evitar enumeração de usuários
      await new Promise((r) => setTimeout(r, 300));
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
    }

    const valid = await comparePassword(password, admin.passwordHash);

    if (!valid) {
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
    }

    const token = signToken({ id: admin.id, email: admin.email, role: admin.role });

    const res = NextResponse.json({ ok: true, name: admin.name, role: admin.role });
    res.cookies.set("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8h
      path: "/",
    });

    return res;
  } catch (err) {
    console.error("[admin/auth] POST failed:", err);
    return NextResponse.json({ error: "Erro interno ao autenticar" }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("admin_token");
  return res;
}
