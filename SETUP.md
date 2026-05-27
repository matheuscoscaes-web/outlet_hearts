# OutletHearts — Guia de configuração

## Pré-requisitos
- Node.js 20+
- Conta no Neon (gratuita) — banco de dados
- Conta no Supabase (gratuita) — storage de imagens
- Conta no Mercado Pago (conta de desenvolvedor)
- Conta no Render (gratuita)

---

## 1. Configurar o banco de dados (Neon)

1. Crie um projeto em https://console.neon.tech
2. Após criar, clique em **Connection Details**
3. Selecione **Connection string** e copie → `DATABASE_URL`
   - O formato será: `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`

## 2. Configurar o Supabase (imagens)

### Storage
1. Vá em **Storage → Create bucket**
2. Crie um bucket chamado `product-images`
3. Marque como **Public bucket**
4. Vá em **Settings → API** e copie:
   - `URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY`

---

## 3. Configurar o Mercado Pago

1. Acesse https://www.mercadopago.com.br/developers
2. Crie um app e obtenha as credenciais de **Produção** (ou Sandbox para testes)
3. Copie:
   - `Access Token` → `MERCADOPAGO_ACCESS_TOKEN`
   - `Public Key` → `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`
4. Configure o webhook:
   - URL: `https://seu-app.onrender.com/api/payments/webhook`
   - Eventos: `payment`
   - Copie o **secret** gerado → `MERCADOPAGO_WEBHOOK_SECRET`

---

## 3. Configurar variáveis de ambiente

Copie o arquivo de exemplo e preencha:
```bash
cp .env.example .env
```

Edite o `.env` com seus valores reais.

---

## 4. Rodar o banco de dados

```bash
# Aplica o schema no banco de dados
npm run db:push

# Cria o primeiro admin (email: admin@outlethearts.com / senha: Admin@123)
npm run db:seed
```

**⚠️ Troque a senha do admin após o primeiro login!**

---

## 5. Rodar localmente

```bash
npm run dev
```

Acesse:
- **Loja:** http://localhost:3000
- **Admin:** http://localhost:3000/admin/login

---

## 6. Deploy no Render

1. Crie um novo **Web Service** no Render
2. Conecte o repositório GitHub
3. Configure:
   - **Build command:** `npm install && npm run build`
   - **Start command:** `npm run start`
   - **Environment:** Node
4. Adicione todas as variáveis do `.env.example` nas **Environment Variables**
5. Adicione um **Cron Job** no Render:
   - **Command:** `curl -H "x-cron-secret: $CRON_SECRET" https://seu-app.onrender.com/api/cron`
   - **Schedule:** `* * * * *` (a cada 1 minuto)

---

## 7. Checklist final

- [ ] `.env` preenchido com todas as variáveis
- [ ] Banco de dados criado e schema aplicado (`npm run db:push`)
- [ ] Admin criado (`npm run db:seed`)
- [ ] Bucket `product-images` criado no Supabase como público
- [ ] Webhook do Mercado Pago configurado
- [ ] Cron Job configurado no Render
- [ ] Testado fluxo completo: produto → reserva → checkout → pagamento sandbox

---

## Estrutura de arquivos principais

```
src/
├── app/
│   ├── (store)/          # Loja pública
│   │   ├── page.tsx      # Home
│   │   ├── produtos/     # Listagem
│   │   ├── produto/[slug]/ # Detalhe do produto
│   │   ├── checkout/     # Checkout com countdown
│   │   └── pedido/       # Confirmação/recusa
│   ├── admin/            # Painel administrativo
│   │   ├── login/
│   │   ├── page.tsx      # Dashboard
│   │   ├── produtos/     # CRUD de produtos
│   │   ├── pedidos/      # Lista de pedidos
│   │   └── reservas/     # Lista de reservas
│   └── api/
│       ├── products/     # API pública de produtos
│       ├── reservations/ # Criação e consulta de reservas
│       ├── orders/       # Criação de pedidos
│       ├── payments/     # Iniciação e webhook
│       ├── cron/         # Job de expiração de reservas
│       └── admin/        # APIs do painel
├── components/
│   ├── store/            # Componentes da loja
│   ├── admin/            # Componentes do painel
│   └── ui/               # Componentes base (Button, Input, Badge)
├── lib/
│   ├── prisma.ts         # Cliente do banco de dados
│   ├── auth.ts           # JWT e bcrypt
│   ├── mercadopago.ts    # SDK do Mercado Pago
│   ├── supabase.ts       # Storage de imagens
│   ├── validations.ts    # Schemas Zod
│   └── utils.ts          # Funções utilitárias
└── middleware.ts          # Proteção das rotas admin
```
