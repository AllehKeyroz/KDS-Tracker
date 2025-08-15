# Estágio 1: Instalação das dependências
FROM node:20-alpine AS deps
WORKDIR /app

# Copia os arquivos de gerenciamento de pacotes
COPY package.json package-lock.json* ./

# Instala as dependências de produção
RUN npm install --production

# Estágio 2: Build da aplicação
FROM node:20-alpine AS builder
WORKDIR /app

# Copia as dependências instaladas do estágio anterior
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Constrói a aplicação Next.js para produção
RUN npm run build

# Estágio 3: Imagem final de produção
FROM node:20-alpine AS runner
WORKDIR /app

# Define o ambiente para produção
ENV NODE_ENV=production
# Desativa a telemetria do Next.js
ENV NEXT_TELEMETRY_DISABLED 1

# Cria um usuário não-root para segurança
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copia os artefatos de build do estágio anterior
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Define o novo usuário como proprietário dos arquivos
RUN chown -R nextjs:nodejs /app/.next

# Muda para o usuário não-root
USER nextjs

# Expõe a porta que a aplicação Next.js irá rodar
EXPOSE 3000

# Define o comando para iniciar a aplicação
CMD ["npm", "start", "--", "-p", "3000"]
