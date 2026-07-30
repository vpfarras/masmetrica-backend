import 'reflect-metadata';
import * as dotenv from 'dotenv';
// Cargar variables de entorno del archivo .env en desarrollo local
dotenv.config();

import { createConnection } from 'typeorm';
import express = require('express');
import cors = require('cors');
import routes from './routes';

const app = express();
const PORT: number = parseInt(process.env.PORT || '8080', 10);

// Configuración permisiva de CORS
const corsOptions = {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'Origin'],
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Respuesta para preflight OPTIONS
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
app.use('', routes);

app.get('/health-check', (req, res) => {
  res.json({ 
    status: 'online', 
    env: process.env.NODE_ENV || 'development',
    connection: process.env.INSTANCE_CONNECTION_NAME ? 'CloudSQL' : 'TCP/IP'
  });
});

// createConnection() sin argumentos busca y lee automáticamente 'ormconfig.js'
createConnection()
  .then(() => {
    console.log(`✅ DB Conectada con éxito [${process.env.INSTANCE_CONNECTION_NAME ? 'Socket CloudSQL' : 'TCP/IP Local'}]`);
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor backend escuchando en http://0.0.0.0:${PORT} (Modo: ${process.env.NODE_ENV || 'local'})`);
    });
  })
  .catch(error => {
    console.error("❌ Error crítico al conectar con la Base de Datos:", error);
    process.exit(1);
  });