import { getRepository } from 'typeorm';
import { Request, Response } from 'express';
import { Users, NewUsers } from '../entity/Users';
import * as jwt from 'jsonwebtoken';
import config from '../config/config';
import { validate } from 'class-validator';
import { resolve } from 'url';
import { transporter } from './../config/mailer';
// import { newPassword } from '../../../src/app/shared/models/user.interface';

class AuthController {
  static login = async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!(username && password)) {
      return res.status(400).json({ message: ' Username & Password are required!' });
    }

    const userRepository = getRepository(Users);
    let user: Users;

    try {
      user = await userRepository.findOneOrFail({ where: { username } });
    } catch (e) {
      return res.status(400).json({ message: ' !El usuario o el password introducidos son incorrectos!' });
    }

    // Check password
    if (!user.checkPassword(password)) {
      return res.status(400).json({ message: 'Username or Password are incorrect!' });
    }

    // Usuario no validado
    /*if (!user.is_valid) {
      return res.status(400).json({ message: 'El usuario aún no ha sido validado' });
    }*/

    const token = jwt.sign({ userId: user.id, username: user.username }, config.jwtSecret, { expiresIn: '1h' });

    res.json({ message: 'OK', token, userId: user.id, role: user.role, name: user.username, isValid: user.is_valid });
  };

  static changePassword = async (req: Request, res: Response) => {
    const { userId } = res.locals.jwtPayload;
    const { oldPassword, newPassword } = req.body;

    if (!(oldPassword && newPassword)) {
      res.status(400).json({ message: 'Old password & new password are required' });
    }

    const userRepository = getRepository(Users);
    let user: Users;

    try {
      user = await userRepository.findOneOrFail(userId);
    } catch (e) {
      res.status(400).json({ message: 'Somenthing goes wrong!' });
    }

    if (!user.checkPassword(oldPassword)) {
      return res.status(401).json({ message: 'Check your old Password' });
    }

    user.password = newPassword;
    const validationOps = { validationError: { target: false, value: false } };
    const errors = await validate(user, validationOps);

    if (errors.length > 0) {
      return res.status(400).json(errors);
    }

    // Hash password
    user.hashPassword();
    userRepository.save(user);

    res.json({ message: 'Password change!' });
  };

  static forgotPassword = async (req:Request, res: Response) => {
    const {username} = req.body;
    if(!(username)) {
      return res.status(400).json({message: 'Nombre de usuario obligatorio'});
    }

    const message = 'Hemos mandado a tu email un link para recuperar tu contraseña';
    let verificationLink;
    let emailStatus = 'OK';

    const userRepository = getRepository(Users);

    let user: Users;

    try {
      user = await userRepository.findOneOrFail({ where: { username } });
      const token = jwt.sign({ userId: user.id, username: user.username}, config.jwtSecret, {expiresIn: '10m'} );
      const baseUrl = process.env.BASE_URL || 'http://localhost:4200';
      verificationLink = `${baseUrl}/new-password/${token}`;
      user.resetToken = token;
    } catch (error) {
      return res.json({ message })
    }

    // TODO SEND EMAIL

    const emailBody = '<table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0; padding: 20px 0; background-color: #f4f4f4;font-family:Arial;font-size: 14px">'+
    '<tbody><tr>'+
        '<td align="center" style="padding: 0 15px;">'+
            '<table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 100%; background-color: #ffffff; box-shadow: 0 2px 3px rgba(0,0,0,0.1);">'+
                '<tbody><tr>'+
                    '<td align="center" style="padding: 0;">'+
                        '<img src="https://ci3.googleusercontent.com/meips/ADKq_NaPNTXjBNi5pPbpTnr9SEKIRGuTv1jLy7o1BqVLY5zj2Zj9hduBZSRZ-WkgOuxVki9vfcDQ8UNFQ3umgxiyNvJhQKTaOags-9PDPMNTrJ_nXHI57Jekwpa1H9o3Im1i0nwYSb5K7-SPRMWSeLRJi-ZmUnMfJSSfh-hiwWCkQTBYShMmQeV17_iauP4v9GVuGQ=s0-d-e1-ft#https://emails.masmetrica.es/data/aa2eaaed7bf4374690815f6347c22f6521e31eb3/media_files/5/original/ImagenOptinCabecera3.jpg" alt="Cabecera" style="max-width:400px;display: block; width: 100%; height: auto;">'+
                    '</td>'+
                '</tr>'+
                '<tr>'+
                    '<td align="left" style="padding: 20px; font-family: Arial, sans-serif; line-height: 1.6; color: #333333;">'+
                        '<p style="margin: 0 0 15px;">Hola '+user.name+', para establecer una nueva contraseña en <b>MásMétrica</b> pincha en el siguiente enlace: <br> <a href="'+verificationLink+'" style="margin-top:10px;width:auto;max-width:180px;border-radius:5px;margin:0 auto;display:block;text-align:center;background-color:#3498db;color: #fff; text-decoration: none;">establecer contraseña</a>.</p>'+
                        
                        '<p style="margin: 0;background-color:#333;color:#fff;padding:7px">Recibe un cordial saludo,<br>El equipo de <b>MásMétrica</b></p>'+
                        '<p style="margin: 0 0 15px; font-size: 11px"><br><br>Si no puedes pinchar sobre el enlace que te  hemos enviado, copia la siguiente dirección, pégala en tu navegador y pulsa intro para ejecutarlo: <br>'+verificationLink+'</p>'+
                    '</td>'+
                '</tr>'+
            '</tbody></table>'+
        '</td>'+
    '</tr>'+
'</tbody></table>'
    //const emailBody ="<html><body style='font-size:14px'><div style='max-width:800px;font-size:11px'><img src='https://ci3.googleusercontent.com/meips/ADKq_NaoSuUEKdt8Oa-qwNZWDAG7tdz7hClkS3OuzKqLMiuLp8MEiBMbMJhuxLDwKTrfuEIyIJRHd81xI_jwiUOjAgzXX2_KQWhvpXp1WnxXThm_7ryqU71quRI-91Not0bjLg38c-PRlH8i4-kj2xt1UrktTu4xypOcoJ477EyXUg_1Wf2-o19xi7Fn7QqerfsDxQ=s0-d-e1-ft#https://emails.masmetrica.es/data/aa2eaaed7bf4374690815f6347c22f6521e31eb3/media_files/2/original/ImagenOptinCabecera2.jpg' style='max-width:100%'><h1>Estimado usuario, gracias por solicitar el alta en MasMétrica. <br>Para finalizar el proceso alta en MAS MÉTRICA pinche en el siguiente enlace: <a href='"+verificationLink+"'>Finalizar alta en MasMetrica</a></h1><div>si no puede pinchar sobre el enlace, copia la siguiente dirección, pégala en tu navegador y pulsa intro para ejecutarlo: <br>"+verificationLink+"</div></body></html>";
    console.log('emailBody', emailBody);
    const mailOptions = {
      from: 'info@masmetrica.es',
      to: user.username,
      subject: 'Recuperación de contraseña',
      html: emailBody,
    };
    console.log('mailOptions', mailOptions);
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) throw err;
    });

    /*try {
      await transporter.sendMail({
        from: '"Recuperar contraseña 👻" <foo@example.com>', // sender address
        to: user.username, // list of receivers
        subject: "Recuperar contraseña", // Subject line
        //text: "Hello world?", // plain text body
        html: `
        <b>Por favor, pinche en el siguiente enlace o pegue el mismo en su navegador para recuperar su contraseña</b>
        <a href="${verificationLink}">${verificationLink}</a>
        `, // html body
      });
    } catch (error) {
      emailStatus = error;
      return res.status(400).json( { message: 'Algo ha ido mal 0' + user.username } )
    } */

    try {
      await userRepository.save(user);
    } catch (error) {
      return res.status(400).json({ message: 'Algo ha ido mal 1' })
    }

    res.json({ message, info: emailStatus })

  }

  static confirmUser = async (req:Request, res: Response) => {
    const {username, params} = req.body;
    if(!(username)) {
      return res.status(400).json({message: 'Nombre de usuario obligatorio'});
    }

    const message = 'Hemos mandado a tu email un link para confirmar tu usuario';
    let verificationLink;
    let emailStatus = 'OK';

    const userRepository = getRepository(NewUsers);

    let user: Users;

    try {
      
      user = await userRepository.findOneOrFail({ where: { username } });
      const token = jwt.sign({ userId: user.id, username: user.username}, config.jwtSecret, {expiresIn: '10m'} );
      let paramsTxt: string = '';
      console.log('entra en try1', user);
      if (params && params.friend && params.user) { paramsTxt = `?user=${params.user}&friend=${params.friend}&phone=${user.telefono}`; }
      else { paramsTxt = `?user=${user.username}&phone=${user.telefono}` }
      console.log('entra en try2');
      const baseUrl = process.env.BASE_URL || 'http://localhost:4200'; 	 	
      verificationLink = `${baseUrl}/register/register-landing/${token}${paramsTxt}`;
      console.log('verificationLink', verificationLink);
      user.resetToken = token;
    } catch (error) {
      return res.json('fallo');
    }

    // TODO SEND EMAIL
  



/// AQUÍ PONEMOS EL CÓDIGO DE ENVÍO DE BREVO //
/*const brevo = require('@getbrevo/brevo');
console.log('brevo', brevo);
//const ApiClient = brevo.ApiClient;
//let defaultClient = ApiClient.instance;

//let apiInstance = new brevo.TransactionalEmailsApi();

//let apiKey = apiInstance.authentications['apiKey'];

//let apiKey = defaultClient.authentications['api-key'];


let apiInstance = new brevo.TransactionalEmailsApi();
let apiKey = apiInstance.authentications['apiKey'];

let sendSmtpEmail = new brevo.SendSmtpEmail();

sendSmtpEmail.subject = "My {{params.subject}}";
sendSmtpEmail.htmlContent = "<html><body><h1>Para finalizar el alta en MAS MÉTRICA pinche en el siguiente enlace: <a href='"+verificationLink+"'>Finalizar alta en MasMetrica</a></h1></body></html>";
sendSmtpEmail.sender = { "name": "MASMETRICA", "email": "info@masmetrica.com" };
sendSmtpEmail.to = [
  { "email": "user.username", "name": "user.username" }
];
sendSmtpEmail.replyTo = { "email": "vpfarras@gmail.com", "name": "envio-alta" };
sendSmtpEmail.headers = { "Some-Custom-Name": "unique-id-1234" };
sendSmtpEmail.params = { "parameter": "My param value", "subject": "common subject" };


apiInstance.sendTransacEmail(sendSmtpEmail).then(function (data) {
  console.log('API called successfully. Returned data: ' + JSON.stringify(data));
}, function (error) {
  console.error(error);
}); */

// FIN DEL CÓDIGO DE ENVÍO DE BREVO

//const inviteLink = `http://localhost:4200/register?user=${userId}&friend=${friendId}`;
    console.log('inviteLink', verificationLink);
    const emailBody = '<table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0; padding: 20px 0; background-color: #f4f4f4;font-family:Arial;font-size: 14px;max-width:600px">'+
    '<tbody><tr>'+
        '<td align="center" style="padding: 0 15px;">'+
            '<table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 100%; background-color: #ffffff; box-shadow: 0 2px 3px rgba(0,0,0,0.1);">'+
                '<tbody><tr>'+
                    '<td align="center" style="padding: 0;">'+
                        '<img src="https://ci3.googleusercontent.com/meips/ADKq_NaPNTXjBNi5pPbpTnr9SEKIRGuTv1jLy7o1BqVLY5zj2Zj9hduBZSRZ-WkgOuxVki9vfcDQ8UNFQ3umgxiyNvJhQKTaOags-9PDPMNTrJ_nXHI57Jekwpa1H9o3Im1i0nwYSb5K7-SPRMWSeLRJi-ZmUnMfJSSfh-hiwWCkQTBYShMmQeV17_iauP4v9GVuGQ=s0-d-e1-ft#https://emails.masmetrica.es/data/aa2eaaed7bf4374690815f6347c22f6521e31eb3/media_files/5/original/ImagenOptinCabecera3.jpg" alt="Cabecera" style="max-width:400px;display: block; width: 100%; height: auto;">'+
                    '</td>'+
                '</tr>'+
                '<tr>'+
                    '<td align="left" style="padding: 20px; font-family: Arial, sans-serif; line-height: 1.6; color: #333333;">'+
                        '<p style="margin: 0 0 15px;">Hola '+user.name+', muchas gracias de nuevo por registrate en <b>MasMétrica</b>, pudiendo así ganar dinero sólo por darnos tu sincera opinión a distintos temas de actualidad a travé de breves encuestas que te enviaremos a tu correo electrónico.</p>'+
                        '<p style="margin: 0 0 15px;">Ya casi hemos terminado. Para finalizar el proceso alta y comprobar que tus datos son correctos, necesitamos validar tu email y tu teléfono. Por favor, pincha en el siguiente enlace con el fin de enviarte un SMS con un código de validación de 6 dígitos: <a href="'+verificationLink+'" style="margin-top:10px;width:auto;max-width:180px;border-radius:5px;margin: 0 auto;display:block;text-align:center;background-color:#3498db;color: #fff; text-decoration: none;">Confirmar registro</a></p>'+
                        '<p>Una vez hayas activado tu usuario, recibirás encuestas y estudios de mercado en tu dirección de correo electrónico. <b>MasMétrica</b> te premiará cada vez que completes las encuestas que recibas con dinero efectivo ingresado en tu cuenta Paypal o a través de otros medios. Si no tienes una cuenta Paypal, no te preocupes, con la primera encuesta que rellenes y con el pago que te enviemos, recibirás las instrucciones necesarias para cobrar el dinero.</p>'+
                        '<p style="margin: 0;background-color:#333;color:#fff;padding:7px">Recibe un cordial saludo,<br>El equipo de <b>MásMétrica</b></p>'+
                        '<p style="margin: 0 0 15px;font-size:11px"><br><br>Si no puedes pinchar sobre el enlace que te  hemos enviado, copia la siguiente dirección, pégala en tu navegador y pulsa intro para ejecutarlo: <br>'+verificationLink+'</p>'+
                    '</td>'+
                '</tr>'+
            '</tbody></table>'+
        '</td>'+
    '</tr>'+
'</tbody></table>'
    //const emailBody ="<html><body style='font-size:14px'><div style='max-width:800px;font-size:11px'><img src='https://ci3.googleusercontent.com/meips/ADKq_NaoSuUEKdt8Oa-qwNZWDAG7tdz7hClkS3OuzKqLMiuLp8MEiBMbMJhuxLDwKTrfuEIyIJRHd81xI_jwiUOjAgzXX2_KQWhvpXp1WnxXThm_7ryqU71quRI-91Not0bjLg38c-PRlH8i4-kj2xt1UrktTu4xypOcoJ477EyXUg_1Wf2-o19xi7Fn7QqerfsDxQ=s0-d-e1-ft#https://emails.masmetrica.es/data/aa2eaaed7bf4374690815f6347c22f6521e31eb3/media_files/2/original/ImagenOptinCabecera2.jpg' style='max-width:100%'><h1>Estimado usuario, gracias por solicitar el alta en MasMétrica. <br>Para finalizar el proceso alta en MAS MÉTRICA pinche en el siguiente enlace: <a href='"+verificationLink+"'>Finalizar alta en MasMetrica</a></h1><div>si no puede pinchar sobre el enlace, copia la siguiente dirección, pégala en tu navegador y pulsa intro para ejecutarlo: <br>"+verificationLink+"</div></body></html>";
    console.log('emailBody', emailBody);
    const mailOptions = {
      from: 'info@masmetrica.es',
      to: user.username,
      subject: 'Confirmación de alta en MasMétrica',
      html: emailBody,
    };
    console.log('mailOptions', mailOptions);
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) throw err;
    });
   
  

/*const SibApiV3Sdk = require('@getbrevo/brevo');

let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

let apiKey = apiInstance.authentications['apiKey'];


let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail(); 

sendSmtpEmail.subject = "My {{params.subject}}";
sendSmtpEmail.htmlContent = "<html><body><h1>Para finalizar el alta en MAS MÉTRICA pinche en el siguiente enlace: <a href='"+verificationLink+"'>Finalizar alta en MasMetrica</a></h1></body></html>";
sendSmtpEmail.sender = {"name":"MASMETRICA","email":"info@masmetrica.com"};
sendSmtpEmail.to = [{"email":user.username,"name":user.username}];

apiInstance.sendTransacEmail(sendSmtpEmail).then(function(data) {
  console.log('API called successfully. Returned data: ' + JSON.stringify(data));

}, function(error) {
  console.error(error);
}); */
    /*try {
      await transporter.sendMail({
        from: '"Confirmación alta usuario 👻" <sociologica@example.com>', // sender address
        to: user.username, // list of receivers
        subject: "Sociológica: Alta de usuario", // Subject line
        //text: "Hello world?", // plain text body
        html: `
        <b>Por favor, pinche en el siguiente enlace o pegue el mismo en su navegador para confirmar su alta de usuario</b>
        <a href="${verificationLink}">${verificationLink}</a>
        `, // html body
      });
    } catch (error) {
      emailStatus = error;
      return res.status(400).json( { message: 'Algo ha ido mal' } )
    } */

    try {
      await userRepository.save(user);
    } catch (error) {
      return res.status(400).json({ message: 'Algo ha ido mal' })
    }

    res.json({ message, info: emailStatus })

  }

  static createNewPassword = async (req: Request, res: Response) => {
    const { newPassword } = req.body;
    const resetToken = req.headers.reset as string;
    
    if(!(resetToken && newPassword)) {
      res.status(400).json({ message: 'Todos los campos son obligatorios'+ resetToken + newPassword })
    }
    const userRepository = getRepository(Users);
    let jwtPayLoad;
    let user: Users;

    try {
      jwtPayLoad = jwt.verify(resetToken, config.jwtSecret);
      user = await userRepository.findOneOrFail({where: { resetToken }})
    } catch (error) {
      return res.status(401).json( { message: 'Algo ha ido mal'} )      
    }
    user.password = newPassword;
    const validationsOps = { validationError: { target: false, value: false } };
    const errors = await validate(user, validationsOps);
    if(errors.length > 0 ) {
      return res.status(400).json(errors);
    }
    try {
      user.hashPassword();
      await userRepository.save(user);
    } catch (error) {
      return res.status(401).json({ message: 'Algo ha ido mallll '+error }) 
    }

    res.json({ message: 'Password guardada correctamente'})

  }

  static createNewActiveUser = async (req: Request, res: Response) => {
    
    const { resetToken } = req.body;

  if (!resetToken) {
    return res.status(400).json({ message: 'No se ha podido realizar la operación' });
  }

  const userRepository = getRepository(NewUsers);
  const newUserRepository = getRepository(Users);
  let user: Users;

  try {
    user = await userRepository.findOneOrFail({ where: { resetToken } });
  } catch (error) {
    return res.status(401).json({ message: 'Algo ha ido mal' });
  }

  try {
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
    
    await newUserRepository.save(user);
    return res.status(201).json({ message: 'Usuario creado correctamente', token });
  } catch (error) {
    return res.status(409).json({ message: 'Error en la operación' });
  }

  }
  
}
export default AuthController;
