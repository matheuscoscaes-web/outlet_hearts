import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const bucket = process.env.SUPABASE_STORAGE_BUCKET || "product-images";

export function getSupabaseAdmin() {
  return createClient(supabaseUrl, serviceRoleKey);
}

export async function uploadProductImage(
  file: File,
  productId: string
): Promise<string> {
  const supabase = getSupabaseAdmin();
  const ext = file.name.split(".").pop();
  const path = `${productId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteProductImage(url: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const path = url.split(`/${bucket}/`)[1];
  if (!path) return;
  await supabase.storage.from(bucket).remove([path]);
}
