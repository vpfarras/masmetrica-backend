const path = require('path');

module.exports = {
  type: "mysql",
  host: process.env.DB_HOST || "127.0.0.1",
  port: 3306,
  // Usamos DB_USER o DB_USERNAME (para cubrir ambas posibilidades)
  username: process.env.DB_USER || process.env.DB_USERNAME || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_DATABASE || "userdata",
  
  // Conexión para Google Cloud SQL
  extra: process.env.INSTANCE_CONNECTION_NAME ? {
    socketPath: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`
  } : {},

  synchronize: false,
  logging: false,

  // Usamos path.join y __dirname para que la ruta sea absoluta y no falle en la nube
  entities: [
    path.join(__dirname, "src/entity/**/*.ts"),
    path.join(__dirname, "dist/entity/**/*.js")
  ],

  cli: {
    entitiesDir: "src/entity"
  }
};