import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const token = req.cookies.get("admin_token")?.value;
    if (!token || !verifyToken(token)) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  if (pathname.startsWith("/api/admin") && !pathname.startsWith("/api/admin/auth")) {
    const token =
      req.cookies.get("admin_token")?.value ||
      req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
