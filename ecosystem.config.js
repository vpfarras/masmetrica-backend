module.exports = {
  apps: [
    {
      name: 'index',
      script: './dist/index.js',
      env: {
        DB_HOST: 'localhost',
        DB_PORT: '3306',
        DB_USERNAME: 'root',
        DB_PASSWORD: 'MasM3trica2@72',
        DB_DATABASE: 'userdata',
        JWT_SECRET: 'BDPEK@',
        PORT: '3000',
        BASE_URL: 'https://masmetrica.es/login'
      }
    }
  ]
};
