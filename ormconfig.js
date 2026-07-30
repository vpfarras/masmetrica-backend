const path = require('path');
require('dotenv').config(); // Carga el archivo .env en local

const instanceConnectionName = process.env.INSTANCE_CONNECTION_NAME;
const isProduction = process.env.NODE_ENV === 'production' || !!instanceConnectionName;

module.exports = {
  type: "mysql",
  username: process.env.DB_USERNAME || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_DATABASE || "userdata",

  synchronize: false,
  logging: true,

  // Si estamos en la nube usa dist, si estamos en local usa dist y src
  entities: isProduction 
    ? [path.join(__dirname, "dist/entity/**/*.js")]
    : [
        path.join(__dirname, "dist/entity/**/*.js"),
        path.join(__dirname, "src/entity/**/*.ts")
      ],

  cli: {
    entitiesDir: "src/entity"
  },

  ...(instanceConnectionName ? {
    extra: {
      socketPath: "/cloudsql/" + instanceConnectionName
    }
  } : {
    host: process.env.DB_HOST || "127.0.0.1",
    port: parseInt(process.env.DB_PORT || "3306", 10)
  })
};