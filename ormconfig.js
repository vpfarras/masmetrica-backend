const path = require('path');

module.exports = {
  type: "mysql",
  host: process.env.DB_HOST || "127.0.0.1",
  port: 3306,
  username: process.env.DB_USER || process.env.DB_USERNAME || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_DATABASE || "userdata",
  
  // Conexión específica para Google Cloud SQL
  extra: process.env.INSTANCE_CONNECTION_NAME ? {
    socketPath: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`
  } : {},

  synchronize: false,
  logging: false,

  // Esta es la parte crítica que corrige el RepositoryNotFoundError
  entities: [
    path.join(__dirname, "dist/entity/**/*.js"),
    path.join(__dirname, "src/entity/**/*.ts")
  ],

  cli: {
    entitiesDir: "src/entity"
  }
};