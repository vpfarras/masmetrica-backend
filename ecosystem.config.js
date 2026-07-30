module.exports = {
  apps: [
    {
      name: 'index',
      script: './dist/index.js',
      env: {
        NODE_ENV: process.env.NODE_ENV || 'development',
        PORT: process.env.PORT || '8080'
      }
    }
  ]
};