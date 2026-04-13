📘 Manual de Despliegue: MasMétrica BackendProyecto: composite-bruin-174106 | Tecnología: Node.js + TypeORM + Cloud Run1. Preparación de la Terminal (Google Cloud SDK)Para Windows, el entorno ideal es la terminal propia de Google Cloud.Abrir Consola: Busca en Windows "Google Cloud SDK Shell".Login de Seguridad: (Solo si hace tiempo que no entras)PowerShellgcloud auth login
Configurar Proyecto: Asegúrate de que los comandos apunten a tu proyecto:PowerShellgcloud config set project composite-bruin-174106
Ubicación: Entra en la carpeta de tu proyecto:PowerShellcd C:\proyectos\back-google\area-cliente-back
2. El Ciclo de Desarrollo (Local a Nube)Cada vez que hagas un cambio en el código (ej. una nueva ruta o cambio de lógica), sigue estos 3 pasos:Paso A: Compilación (Obligatorio)Google Cloud Run lee la carpeta dist. Si no compilas, subirás código viejo.PowerShellnpm run build
Paso B: Comando de Despliegue ActualizadoEste comando sube tu código, conecta la base de datos y configura las variables de entorno necesarias.PowerShellgcloud run deploy masmetrica-backend ^
  --source . ^
  --region europe-southwest1 ^
  --set-env-vars DB_HOST=/cloudsql/composite-bruin-174106:europe-southwest1:masmetrica-db-test,DB_PORT=3306,DB_USERNAME=app_user,DB_PASSWORD=MasMetrica2026,DB_DATABASE=userdata ^
  --add-cloudsql-instances composite-bruin-174106:europe-southwest1:masmetrica-db-test ^
  --allow-unauthenticated
Nota: El símbolo ^ permite escribir el comando en varias líneas en Windows. Si lo pegas todo en una sola línea, quita los ^.3. Configuración del "Código de Éxito"Para que los despliegues no fallen (especialmente por el error de autenticación de MySQL 8.4 que solucionamos), el proyecto debe mantener esta estructura:ArchivoConfiguración Clavepackage.jsonDebe incluir "mysql2" en las dependencias.ormconfig.jshost: "127.0.0.1", username: "app_user", extra: { socketPath: process.env.DB_HOST }.src/index.tsapp.listen debe estar fuera de createConnection para evitar el timeout de Google.DockerfileDebe copiar la carpeta dist y ejecutar node dist/index.js.4. Resolución de Problemas (Troubleshooting)¿Cómo ver si el despliegue funcionó realmente?No basta con que la terminal diga "Done". Debes verificar la conexión a la base de datos:Entra en la consola web de Google Cloud Run.Haz clic en masmetrica-backend.Ve a la pestaña Registros (Logs).Busca: ✅ Conexión a Cloud SQL EXITOSA.Error común: ER_NOT_SUPPORTED_AUTH_MODECausa: Se está usando el usuario root o el driver mysql antiguo.Solución: Asegurarse de usar el usuario app_user y el driver mysql2 en el código.5. Automatización (Recomendado)Para no escribir todo el comando cada vez, añade esto a tu package.json:JSON"scripts": {
  "build": "tsc",
  "deploy": "npm run build && gcloud run deploy masmetrica-backend --source . --region europe-southwest1 --allow-unauthenticated"
}
A partir de ahora, solo tendrás que escribir:PowerShellnpm run deploy

AHORA QUE TENGO ENTORNO DE PRUEBAS Y ENTORNO DE DESARROLLO:

Comando para TEST (El de siempre):

gcloud run deploy masmetrica-backend ^
  --source . ^
  --region europe-southwest1 ^
  --set-env-vars DB_DATABASE=userdata,NODE_ENV=test ^
  --add-cloudsql-instances composite-bruin-174106:europe-southwest1:masmetrica-db-test ^
  --allow-unauthenticated

Comando para PRODUCCIÓN:

gcloud run deploy masmetrica-backend-prod ^
  --source . ^
  --region europe-southwest1 ^
  --set-env-vars DB_DATABASE=userdata_prod,NODE_ENV=production ^
  --add-cloudsql-instances composite-bruin-174106:europe-southwest1:masmetrica-db-test ^
  --allow-unauthenticated

Automatización en package.json:

"scripts": {
  "build": "tsc",
  "deploy:test": "npm run build && gcloud run deploy masmetrica-backend --source . --region europe-southwest1 --set-env-vars DB_DATABASE=userdata --allow-unauthenticated",
  "deploy:prod": "npm run build && gcloud run deploy masmetrica-backend-prod --source . --region europe-southwest1 --set-env-vars DB_DATABASE=userdata_prod --allow-unauthenticated"
}