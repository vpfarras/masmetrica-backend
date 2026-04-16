# 1. Usamos Node 22
FROM node:22-slim

# 2. Directorio de trabajo
WORKDIR /usr/src/app

# 3. Copiamos archivos de configuración y dependencias
COPY package*.json ./
COPY tsconfig*.json ./
# Copiamos ormconfig si es necesario para el build
COPY ormconfig.js ./ 

# 4. Instalamos TODAS las dependencias (necesitamos las de desarrollo para compilar)
RUN npm install --legacy-peer-deps

# 5. Copiamos todo el código fuente
COPY . .

# 6. Ejecutamos el build de TypeScript (esto genera la carpeta 'dist')
RUN npm run build

# 7. (Opcional) Limpiamos dependencias de desarrollo para que sea ligero
RUN npm prune --production

# 8. Permisos y puertos
RUN chmod +x dist/index.js
ENV PORT=8080
EXPOSE 8080

# 9. Arrancamos
CMD [ "node", "dist/index.js" ]