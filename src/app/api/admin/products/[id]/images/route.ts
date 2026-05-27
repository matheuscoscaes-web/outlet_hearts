import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";
import { uploadProductImage, deleteProductImage } from "@/lib/supabase";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const formData = await req.formData();
  const files = formData.getAll("files") as File[];

  if (!files.length) {
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
  }

  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB

  const results = [];

  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Tipo não permitido: ${file.type}. Use JPEG, PNG ou WebP.` },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: `${file.name} excede 5MB.` }, { status: 400 });
    }

    const url = await uploadProductImage(file, id);
    const image = await prisma.productImage.create({
      data: { productId: id, url, altText: file.name },
    });
    results.push(image);
  }

  return NextResponse.json(results, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id: productId } = await params;
  const { imageId } = await req.json();

  const image = await prisma.productImage.findUnique({ where: { id: imageId } });
  if (!image || image.productId !== productId) {
    return NextResponse.json({ error: "Imagem não encontrada" }, { status: 404 });
  }

  await deleteProductImage(image.url);
  await prisma.productImage.delete({ where: { id: imageId } });

  return NextResponse.json({ ok: true });
}
