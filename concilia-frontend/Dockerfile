# concilia-frontend/Dockerfile

FROM node:22-alpine

WORKDIR /app

# Copia dependências
COPY package.json package-lock.json ./

# Instala dependências (omitindo avisos desnecessários)
RUN npm install

# Copia o código
COPY . .

# Faz o build do projeto para gerar a pasta /dist
RUN npm run build

# Expõe a porta 5173
EXPOSE 5173

# Em vez de 'dev', vamos usar o 'preview' que é mais leve para o servidor
# O --host 0.0.0.0 é fundamental para o Coolify conseguir acessar o container
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5173"]