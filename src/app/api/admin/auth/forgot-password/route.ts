import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePasswordResetToken, hashPasswordResetToken } from "@/lib/auth";
import { forgotPasswordSchema } from "@/lib/validations";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
  }

  const { email } = parsed.data;

  // Sempre responde ok — não revela se o e-mail existe ou não
  const genericResponse = NextResponse.json({
    ok: true,
    message: "Se este e-mail estiver cadastrado, você receberá um link de redefinição em instantes.",
  });

  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin || !admin.isActive) {
    return genericResponse;
  }

  const token = generatePasswordResetToken();
  const tokenHash = hashPasswordResetToken(token);

  await prisma.passwordResetToken.create({
    data: {
      adminUserId: admin.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1h
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? req.nextUrl.origin;
  const resetUrl = `${baseUrl}/admin/redefinir-senha?token=${token}`;

  try {
    await sendPasswordResetEmail(admin.email, resetUrl);
  } catch (err) {
    console.error("[forgot-password] falha ao enviar e-mail:", err);
    return NextResponse.json(
      { error: "Não foi possível enviar o e-mail. Tente novamente mais tarde." },
      { status: 502 }
    );
  }

  return genericResponse;
}
