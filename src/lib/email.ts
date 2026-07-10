import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  if (!resend) {
    console.error("[email] RESEND_API_KEY não configurada — e-mail de redefinição não enviado");
    throw new Error("Serviço de e-mail não configurado");
  }

  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "OutletHearts <onboarding@resend.dev>",
    to,
    subject: "Redefinição de senha — OutletHearts Admin",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #db2777;">Redefinir senha</h2>
        <p>Recebemos um pedido para redefinir a senha do painel admin da OutletHearts.</p>
        <p>
          <a href="${resetUrl}" style="display: inline-block; background: #db2777; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Redefinir senha
          </a>
        </p>
        <p>Ou copie e cole este link no navegador:</p>
        <p style="word-break: break-all; color: #555;">${resetUrl}</p>
        <p style="color: #999; font-size: 13px;">Este link expira em 1 hora. Se você não pediu essa redefinição, pode ignorar este e-mail.</p>
      </div>
    `,
  });
}
