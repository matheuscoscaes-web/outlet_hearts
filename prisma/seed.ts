import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@outlethearts.com";
  const password = process.env.ADMIN_PASSWORD ?? "Admin@123";
  const name = process.env.ADMIN_NAME ?? "Admin";

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin já existe: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.adminUser.create({
    data: { name, email, passwordHash, role: "SUPER_ADMIN" },
  });

  console.log(`✅ Admin criado: ${email} / ${password}`);
  console.log("⚠️  Troque a senha após o primeiro login!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
