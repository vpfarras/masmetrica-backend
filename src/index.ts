import 'reflect-metadata';
import { createConnection } from 'typeorm';
import * as express from 'express';
import * as cors from 'cors';
import routes from './routes';

const app = express();
// Forzamos a que sea un número para evitar el error de compilación previo
const PORT: number = parseInt(process.env.PORT || '8080', 10);

app.use(cors());
app.use(express.json());
app.use('', routes);

// 1. El servidor arranca primero para que Google Cloud vea que está "vivo"
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor de MásMétrica corriendo en puerto ${PORT}`);
});

// 2. Conectamos a la base de datos
const dbConfig = require('../ormconfig.js');

// Ajuste para asegurar compatibilidad con MySQL 8.4
createConnection({
  ...dbConfig,
  driver: require('mysql2') // <--- Esto es lo que soluciona el error de autenticación
})
  .then(() => {
    console.log("✅ Conexión a Cloud SQL EXITOSA");
  })
  .catch(error => {
    console.error("❌ ERROR de conexión a DB:", error);
  });