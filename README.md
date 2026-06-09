# Aura-FX Web Mobile Dashboard

Painel web mobile de monitoramento e execução em tempo real integrado ao robô Orion U2 Hedge (MQL5).

---

## 🚀 Como Executar e Hospedar o Projeto

Este projeto foi construído usando **Next.js (App Router)**, **Prisma Client** (ORM) e estilizado usando **Vanilla CSS**. Ele está pronto para ser hospedado na **Vercel** conectado a um banco de dados serverless **Neon Postgres**.

### 1. Requisitos Prévios
* Uma conta no [Neon.tech](https://neon.tech) (PostgreSQL Serverless Gratuito).
* Uma conta na [Vercel](https://vercel.com) (Hospedagem Gratuita).
* Repositório Git público ou privado no GitHub.

---

### 2. Configurando o Banco de Dados Neon
1. Registre-se no Neon e crie um novo projeto.
2. Copie a **Connection String** exibida no seu painel. Ela será semelhante a isto:
   `postgresql://usuario:senha@ep-host-name.us-east-2.aws.neon.tech/neondb?sslmode=require`
3. Salve este valor na variável de ambiente `DATABASE_URL`.

---

### 3. Deploy na Vercel (Passo a Passo)
1. Crie um novo repositório no seu GitHub e envie o conteúdo da pasta `orion_dashboard` para lá:
   ```bash
   git init
   git add .
   git commit -m "initial commit"
   git remote add origin <link-do-seu-repositorio>
   git branch -M main
   git push -u origin main
   ```
2. No painel da **Vercel**, clique em **Add New** -> **Project**.
3. Selecione o repositório que você acabou de criar.
4. Expanda a seção **Environment Variables** e adicione as duas variáveis obrigatórias:
   * `DATABASE_URL`: A connection string do banco de dados Neon.
   * `WEB_API_KEY`: Token de segurança para autenticar o robô (ex: `aura_secret_token_123456`).
5. Clique em **Deploy**. A Vercel instalará as dependências, gerará o Prisma Client (`prisma generate`) e fará o build do site.
6. Guarde a URL de produção gerada pela Vercel (ex: `https://seu-app.vercel.app`).

---

### 4. Configurando a Integração no MetaTrader 5
Para que o Orion envie as informações ao Dashboard:
1. No MetaTrader 5, acesse o menu **Ferramentas (Tools)** -> **Opções (Options)** -> aba **Expert Advisors**.
2. Marque a opção **"Permitir WebRequest para as URLs listadas:"**.
3. Adicione o seu domínio Vercel na lista: `https://seu-app.vercel.app` (substitua pelo seu link real).
4. Abra as configurações do Orion EA no gráfico do MT5 e configure:
   * **`InpWebAtiva`**: `true` (Habilitado)
   * **`InpWebUrl`**: `https://seu-app.vercel.app/api/mt5/update`
   * **`InpWebApiKey`**: O token que você definiu na variável `WEB_API_KEY`.
   * **`InpWebIntervalo`**: `10` (segundos de delay entre sincronizações).
