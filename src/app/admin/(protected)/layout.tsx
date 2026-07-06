import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import { Sidebar } from "@/components/admin/Sidebar";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;

  if (!token || !verifyToken(token)) {
    redirect("/admin/login");
  }

  return (
    <div className="flex flex-col md:flex-row md:h-screen md:overflow-hidden bg-gray-50">
      <Sidebar />
      <main className="flex-1 md:overflow-auto p-4 sm:p-6">{children}</main>
    </div>
  );
}
