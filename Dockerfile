# 1. Usamos Node 22 en versión "slim" para que sea ligero y rápido
FROM node:22-slim

# 2. Directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# 3. Copiamos solo los archivos de dependencias
COPY package*.json ./

# 4. Instalamos solo dependencias de producción (evitamos las de desarrollo)
# Usamos --legacy-peer-deps por si acaso, igual que hicimos en local
RUN npm install --only=production --legacy-peer-deps

# 5. Copiamos la carpeta 'dist' que acabas de generar con el build
COPY dist ./dist

COPY ormconfig.js ./

RUN chmod +x dist/index.js

# 6. Definimos el puerto estándar de Google Cloud
ENV PORT=8080
EXPOSE 8080

# 7. Arrancamos la aplicación
CMD [ "node", "dist/index.js" ]