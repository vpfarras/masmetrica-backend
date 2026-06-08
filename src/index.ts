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

// 4. Conexión a DB - FORZADO PARA CLOUD RUN
createConnection({
  type: "mysql",
  // Si estamos en Cloud Run (existe la instancia), dejamos el host vacío para obligar al socket
  host: process.env.INSTANCE_CONNECTION_NAME ? "" : "127.0.0.1",
  port: 3306,
  username: process.env.DB_USERNAME || "app_user",
  password: process.env.DB_PASSWORD || "MasMetrica",
  database: process.env.DB_DATABASE || "userdata_prod",
  
  // Forzamos el socket UNIX nativo de Google Cloud SQL
  extra: process.env.INSTANCE_CONNECTION_NAME ? {
    socketPath: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`
  } : {},

  synchronize: false,
  logging: true,
  entities: [Users], 
  driver: require('mysql2') 
})
.then(() => {
  console.log("✅ Base de Datos Conectada EXITOSAMENTE");
  
  // Abrimos el puerto solo si la base de datos responde
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor de MásMétrica corriendo en puerto ${PORT}`);
  });
})
.catch(error => {
  console.error("❌ Error crítico en DB al arrancar:", error);
  process.exit(1);
});