import 'reflect-metadata';
import { createConnection } from 'typeorm';
import * as express from 'express';
import * as cors from 'cors';
import routes from './routes';
import { Users } from './entity/Users'; 

const app = express();
const PORT: number = parseInt(process.env.PORT || '8080', 10);

// 1. Configuración de CORS súper permisiva para Local/Dev
const corsOptions = {
  origin: true, // Esto permite cualquier origen que envíe la petición (ideal para debug)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'Origin'],
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// 2. RESPUESTA MANUAL A OPTIONS (El "Fix" definitivo)
// Esto asegura que cualquier petición OPTIONS responda 204 y no se quede colgada
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'true');
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json());

// 3. Rutas
app.use('', routes);

app.get('/health-check', (req, res) => {
  res.json({ status: 'online', env: process.env.NODE_ENV || 'development' });
});

// 4. Conexión a DB Inteligente (Local, Dev Cloud y Prod Cloud)
const path = require('path');

// Averiguamos en qué entorno estamos
const isLocal = !process.env.INSTANCE_CONNECTION_NAME && (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'production');
const isCloudSQL = !!process.env.INSTANCE_CONNECTION_NAME;

createConnection({
  type: "mysql",
  
  // Si está en Google Cloud con conector, el host va vacío para activar el socket UNIX.
  // Si está en local o Cloud estándar, usa DB_HOST o el localhost de XAMPP.
  host: isCloudSQL ? "" : (process.env.DB_HOST || "127.0.0.1"),
  port: parseInt(process.env.DB_PORT || "3306", 10),
  
  username: process.env.DB_USERNAME || process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "", // En local XAMPP suele ser vacío o "root"
  database: process.env.DB_DATABASE || "userdata",
  
  // Búsqueda dinámica de entidades para evitar fallos de compilación en Cloud Build
  entities: [
    path.join(__dirname, "**/entity/*.{ts,js}")
  ],
  
  // El socket físico de Google SOLO se activa si la variable existe en la nube
  extra: isCloudSQL ? {
    socketPath: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`
  } : {},

  synchronize: false,
  logging: true,
  driver: require('mysql2') 
})
.then(() => {
  console.log("✅ Base de Datos Conectada con éxito");
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT} (Modo: ${process.env.NODE_ENV || 'local'})`);
  });
})
.catch(error => {
  console.error("❌ Error crítico en DB al arrancar:", error);
  process.exit(1);
});