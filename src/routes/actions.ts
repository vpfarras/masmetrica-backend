import { checkRole } from '../middlewares/role';
import { checkJwt } from '../middlewares/jwt';
import { UserController } from '../controller/UserController';
import { Request, Response, Router } from 'express';
import AuthController from '../controller/AuthController';
const uploadFileMiddleware = require('../middlewares/uploadRouter');

interface MulterRequest extends Request {
    file: any; // Puedes especificar el tipo adecuado en lugar de `any` si lo sabes (por ejemplo, `Express.Multer.File`)
  }

const router = Router();

// Get act user
router.get('/', [checkJwt, checkRole(['admin', 'suscriptor'])], UserController.getActUser);

// Create a new user
// router.post('/', [checkJwt, checkRole(['admin'])], UserController.new);
router.post('/register',[], UserController.newNotAdmin);

// send SMS for validate new user
router.post('/requestSmsCode', UserController.requestSmsCode);

// validate SMS code for validate new user
router.post('/validateSmsCode', UserController.validateSmsCode);

// Create a new active user
router.put('/registerActive', AuthController.createNewActiveUser);

// actulaizar la invitacion
router.put('/setInvitationStatus', UserController.setInvitationStatus);

// comprobar contraseña
router.post('/checkPassword', [checkJwt, checkRole(['admin', 'suscriptor'])], UserController.checkPassword);


// Edit user
router.patch('/', [checkJwt, checkRole(['admin', 'suscriptor'])], UserController.editActUser);

// Edit phone
router.patch('/modifPhone', [checkJwt, checkRole(['admin', 'suscriptor'])], UserController.editPhoneActUser);

// Change password
router.post('/changepassword', [checkJwt, checkRole(['admin', 'suscriptor'])], UserController.changePassword);

// Delete
router.delete('/delete', [checkJwt, checkRole(['admin', 'suscriptor'])], UserController.deleteUser);

// Change password
router.put('/forgot-password', AuthController.forgotPassword);

// Create new password
router.put('/new-password', AuthController.createNewPassword);

// Change password
router.put('/confirm-user', AuthController.confirmUser);

// Query
router.post('/query', [checkJwt, checkRole(['admin'])], UserController.createQueryBuild);

// Invitation
router.post('/invitation', [checkJwt, checkRole(['admin', 'suscriptor'])], UserController.newInvitation);

// Upload file route
// Ruta de subida de archivos sin express.json()
router.post('/uploadFile', uploadFileMiddleware, UserController.uploadAndProcessFile);
  
  
  
  
  


// Upload file
router.get('/downloadFile/:filename', [checkJwt, checkRole(['admin', 'suscriptor']), uploadFileMiddleware], UserController.downloadFile);

// Get payment data
router.post('/getPaymentData', [], UserController.getPaymentData);

// Solicitar cambio de email
router.post('/request-email-change', [checkJwt, checkRole(['admin', 'suscriptor'])], UserController.requestEmailChange);

// Verificar el código y actualizar el email
router.post('/verify-email-code', [checkJwt, checkRole(['admin', 'suscriptor'])], UserController.verifyEmailCode);

export default router;
