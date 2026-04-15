module.exports = {
  type: "mysql",
  host: process.env.DB_HOST || "127.0.0.1", 
  port: 3306,
  // Si estamos en local usamos 'root', si no, el usuario de la nube
  username: process.env.DB_USER || "root", 
  // Si estamos en local normalmente no hay contraseña en XAMPP
  password: process.env.DB_PASSWORD || "", 
  database: "userdata",
  // Solo añadimos el socketPath si existe la variable de entorno de Google
  extra: process.env.INSTANCE_CONNECTION_NAME ? {
    socketPath: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`
  } : {},
  synchronize: false,
  logging: false,
  entities: [
    process.env.NODE_ENV === 'production' 
      ? "dist/entity/**/*.js" 
      : "src/entity/**/*.ts"
  ],
  cli: {
    entitiesDir: "src/entity"
  }
};