import 'reflect-metadata';
import { createConnection } from 'typeorm';
import * as express from 'express';
import * as cors from 'cors';
import routes from './routes';

// IMPORTANTE: Importamos la entidad manualmente para evitar el RepositoryNotFoundError
import { Users } from './entity/Users'; 

const app = express();

// 1. Configuración del Puerto (Prioridad a Google Cloud Run)
const PORT: number = parseInt(process.env.PORT || '8080', 10);

// 2. Configuración Dinámica de CORS
const allowedOrigins = [
  'http://localhost:4200',            // Local
  'https://masmetrica.es',            // Producción
  /\.run\.app$/,                      // Backends en Cloud Run (Dev/Prod)
  /\.googleapis\.com$/                // Frontends en Google Storage (Staging)
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.some((allowed) => {
      if (allowed instanceof RegExp) return allowed.test(origin);
      return allowed === origin;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`CORS bloqueado para el origen: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 204
}));

app.options('*', cors());

// 3. Middlewares de Express
app.use(express.json());

// 4. Rutas
app.use('', routes);

// Ruta de diagnóstico rápido
app.get('/health-check', (req, res) => {
  res.json({ 
    status: 'online', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// 5. Arranque del Servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});

// 6. Conexión a la Base de Datos (Modificada para forzar entidades)
const dbConfig = require('../ormconfig.js');

createConnection({
  ...dbConfig,
  // Forzamos la carga de la entidad Users directamente aquí
  entities: [Users], 
  driver: require('mysql2') 
})
  .then(() => {
    console.log("✅ Conexión a la Base de Datos EXITOSA");
  })
  .catch(error => {
    console.error("❌ ERROR de conexión a DB:", error);
    // No matamos el proceso para evitar bucles de reinicio en Cloud Run
  });