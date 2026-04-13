module.exports = {
  type: "mysql",
  host: "127.0.0.1", 
  port: 3306,
  username: "app_user",
  password: "MasMetrica2026",
  database: "userdata",
  extra: {
    socketPath: process.env.DB_HOST // Esto recibirá el /cloudsql/... de Google
  },
  synchronize: false,
  logging: false,
  entities: ["dist/entity/**/*.js"] // Importante que apunte a .js en dist
};