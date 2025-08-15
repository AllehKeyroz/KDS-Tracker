# Dockerfile para uma aplicação Next.js com build multi-stage

# Estágio 1: Instalação das dependências
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --frozen-lockfile

# Estágio 2: Build da aplicação
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Aumenta o limite de memória para o processo de build
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build

# Estágio 3: Imagem final de produção
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
# Descomente a linha abaixo caso sua aplicação precise de um hostname
# ENV HOSTNAME="0.0.0.0"

# Cria um usuário e grupo 'app' sem privilégios
RUN addgroup -g 1001 -S app && \
    adduser -S app -u 1001

# Copia os arquivos da aplicação
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Define o usuário 'app' como proprietário dos arquivos
RUN chown -R app:app /app

# Muda para o usuário 'app'
USER app

EXPOSE 3000

# Inicia a aplicação
CMD ["npm", "start"]
