import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno desde el archivo .env
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Verificar si dotenv ha cargado correctamente las variables de entorno
console.log('Database Host:', process.env.DB_HOST);
console.log('Database Port:', process.env.DB_PORT);
console.log('Database Username:', process.env.DB_USERNAME);
console.log('Database Password:', process.env.DB_PASSWORD);
console.log('Database Name:', process.env.DB_DATABASE);
