const path = require('path');

module.exports = {
  type: "mysql",
  host: process.env.INSTANCE_CONNECTION_NAME ? "" : (process.env.DB_HOST || "127.0.0.1"),
  port: 3306,
  username: process.env.DB_USER || process.env.DB_USERNAME || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_DATABASE || "userdata",
  
  extra: process.env.INSTANCE_CONNECTION_NAME ? {
    socketPath: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`
  } : {},

  synchronize: false,
  logging: true, // Activamos logging para ver qué pasa en el log de Cloud Run

  // ESTA ES LA CONFIGURACIÓN QUE NO FALLA:
  // Buscamos en la raíz del proyecto cualquier carpeta que contenga 'entity'
  entities: [
    path.join(__dirname, "**/entity/*.{ts,js}")
  ],

  cli: {
    entitiesDir: "src/entity"
  }
};