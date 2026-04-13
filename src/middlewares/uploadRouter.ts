const multer = require('multer');
const path = require('path');
const util = require('util');

const maxSize = 2 * 1024 * 1024; // Tamaño máximo de archivo: 2 MB

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads')); // Directorio donde se guardan los archivos
  },
  filename: (req, file, cb) => {
    console.log('Uploading file:', file.originalname); // Esto debería aparecer en la consola cuando subes un archivo
    cb(null, file.originalname); // Guardar con el nombre original
  },
});

const uploadFile = multer({
  storage: storage,
  limits: { fileSize: maxSize }, // Límite de tamaño del archivo
}).single('file'); // Procesar un solo archivo

const uploadFileMiddleware = util.promisify(uploadFile);

module.exports = uploadFileMiddleware;
