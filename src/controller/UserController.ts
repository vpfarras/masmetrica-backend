import { getRepository, createQueryBuilder, LessThan } from 'typeorm';
import { Request, Response } from 'express';
import { Users, DeleteUsers, NewUsers, Invitations, CodigosPostales, Pays } from '../entity/Users';
import { validate } from 'class-validator';
import * as jwt from 'jsonwebtoken';
import config from '../config/config';
import { transporter } from './../config/mailer'
import { userInfo } from 'os';

const multer = require('multer');
const xlsx = require('xlsx');
const uploadFile = require("../middlewares/uploadRouter");
const path = require("path");
const fs = require("fs");
const https = require('https');

// Configuración de multer para almacenar el archivo subido
/*let storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '/uploads');
  },
  filename: (req, file, cb) => {
    console.log('file.originalName', file.originalname)
    cb(null, file.originalname);
  }
});

const uploadFile = multer({ storage: storage }); */

interface MulterRequest extends Request {
  file: any; // Usamos 'any' para evitar la necesidad de instalar los tipos de Multer
}

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000; // 7 días en milisegundos
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000; // 24 horas en milisegundos

export class UserController {
  static getAll = async (req: Request, res: Response) => {
    const userRepository = getRepository(Users);
    let users;

    try {
      users = await userRepository.find({ select: ['id', 'username', 'role', 'name', 'apellido1', 
    'apellido2', 'sexo', 'provincia', 'municipio', 'codigo_postal', 'numero_hijos', 'ingresos_mensuales'] });
    } catch (e) {
      res.status(404).json({ message: 'Somenthing goes wrong!' });
    }

    if (users.length > 0) {
      res.send(users);
    } else {
      res.status(404).json({ message: 'Not result 1' });
    }
  };

  static getById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const userRepository = getRepository(Users);
    try {
      const user = await userRepository.findOneOrFail(id);
      res.send(user);
    } catch (e) {
      res.status(404).json({ message: 'Not result 2' });
    }
  };

  static getActUser = async (req: Request, res: Response) => {
    //res.status(404).json({ message: 'Entra en getactuser' });
    console.log('entra en getActUser');
    const { userId } = res.locals.jwtPayload;
    const userRepository = getRepository(Users);
    try {
      console.log('entra en getActUser try');
      const user = await userRepository
      .findOneOrFail(userId, {select: ['id', 'username', 'role', 'name', 'apellido1', 'apellido2', 'apellidos', 'telefono', 'codigo_postal', 
    'ingresos_mensuales', 'municipio', 'numero_hijos', 'provincia', 'sexo', 'ocupacion', 'clase_social', 'vive_con', 'nivel_estudios', 'fecha_nacimiento',
    'fecha_nacimiento_hijo1', 'fecha_nacimiento_hijo2', 'fecha_nacimiento_hijo3']});
      res.send(user);
    } catch (e) {
      console.log('entra en getActUser catch');
      res.status(404).json({ message: 'Not result 3' });
    }
  };


  static new = async (req: Request, res: Response) => {
    res.send('User created al pricipio');
    const { username, password, role , name, apellido1, apellido2, municipio } = req.body;
    const user = new Users();

    user.username = username;
    user.password = password;
    user.role = role;
    user.name = name;
    user.apellido1 = apellido1;
    user.apellido2 = apellido2;
    user.municipio = municipio;
    console.log('user', user);
    // Validate
    const validationOpt = { validationError: { target: false, value: false } };
    const errors = await validate(user, validationOpt);
    if (errors.length > 0) {
      return res.status(400).json(errors);
    }

    // TODO: HASH PASSWORD

    const userRepository = getRepository(Users);
    console.log('userRepository', userRepository);
    try {
      user.hashPassword();
      console.log('después de haspassword');
      await userRepository.save(user);
      console.log('después de save');
    } catch (e) {
      return res.status(409).json({ message: 'Username already exist' });
    }
    // All ok
    console.log('antes del send')
    //res.send('User created');
  };

  static newNotAdmin = async (req: Request, res: Response) => {
    console.log('---------newNotAdmin------------------');
    console.log('Request body:', req.body);

    const { username, password, name, phone, apellidos, codigo_postal, sexo, fecha_nacimiento, condiciones_legales, params } = req.body;

    if (!username || !password || !name || !phone || !apellidos || !codigo_postal || !sexo || !fecha_nacimiento || !condiciones_legales) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const user = new Users();
    let fechaComoDate: Date;

    try {
        const partes = fecha_nacimiento.split("/");
        if (partes.length !== 3) {
            throw new Error('Invalid date format');
        }
        fechaComoDate = new Date(+partes[2], +partes[1] - 1, +partes[0]);
        if (isNaN(fechaComoDate.getTime())) {
            throw new Error('Invalid date');
        }
        console.log('fechaComoDate', fechaComoDate);
        user.fecha_nacimiento = fechaComoDate;
    } catch (error) {
        console.error('Error parsing date:', error);
        return res.status(400).json({ message: 'Invalid date format' });
    }

    user.username = username;
    user.password = password;
    user.name = name;
    user.telefono = phone;
    user.apellidos = apellidos;
    user.codigo_postal = codigo_postal;
    user.sexo = sexo;
    user.role = 'suscriptor';
    user.apellido1 = ''; // Default or value from request
    user.apellido2 = ''; // Default or value from request
    user.numero_hijos = '0'; // Default or value from request
    user.ingresos_mensuales = '0'; // Default or value from request
    user.condiciones_legales = condiciones_legales; // Default or value from request
    user.is_valid = true; // Default or value from request
    user.fecha_nacimiento_hijo1 = null;
    user.fecha_nacimiento_hijo2 = null;
    user.fecha_nacimiento_hijo3 = null;

    const postalCodeExists = getRepository(CodigosPostales);
    const hasCode = await postalCodeExists.findOne({ where: { codigo_postal: user.codigo_postal } });
    if (!hasCode) {
        return res.status(409).json({ message: 'El código postal no existe' });
    }

    user.provincia = hasCode.provincia;
    user.municipio = hasCode.poblacion;
    user.ccaa = hasCode.ccaa;
    user.region = hasCode.region;
    user.areas_nielsen = hasCode.areas_nielsen;
    user.zona_nielsen = hasCode.zona_nielsen;
    user.poblacion_2021 = hasCode.poblacion2021;
    user.hombres = hasCode.hombres;
    user.mujeres = hasCode.mujeres;
    
    if(params.source) {
      user.source = params.source;
    }

    if(params.user) {
      user.user_invite = params.user
    }

    if(params.friend) {
      user.friend_register = params.friend;
    }

    console.log('User object before validation:', user);

    const validationOpt = { validationError: { target: false, value: false } };
    const errors = await validate(user, validationOpt);
    if (errors.length > 0) {
        console.log('Validation errors:', errors);
        return res.status(400).json(errors);
    }

    const userExistRepository = getRepository(Users);
    const hasUser = await userExistRepository.findOne({ where: { username: user.username } });
    const hasPhone = await userExistRepository.findOne({ where: { telefono: user.telefono } });
    if (hasUser || hasPhone) {
        return res.status(409).json({ message: 'El usuario ya existe o el número de teléfono ya está en uso' });
    }
    

    const userRepository = getRepository(NewUsers);
    try {
        user.hashPassword();
        console.log('User object before save:', user);
        await userRepository.save(user);

        const token = jwt.sign(
            { userId: user.id, username: user.username },
            config.jwtSecret,
            { expiresIn: '1h' }
        );

        res.status(201).json({ message: 'User created', token });
        console.log('Token sent:', token);
    } catch (e) {
        console.error('Error saving user:', e);
        return res.status(409).json({ message: 'Error en la operación de alta' });
    }
  }
  

  static edit = async (req: Request, res: Response) => {
    let user;
    const { id } = req.params;
    const { username, role, name, apellido1, apellido2, municipio, provincia, codigo_postal,
    numero_hijos, sexo, ingresos_mensuales } = req.body;

    const userRepository = getRepository(Users);
    // Try get user
    try {
      user = await userRepository.findOneOrFail(id);
      user.username = username;
      user.role = role;
      user.name = name;
      user.apellido1 = apellido1;
      user.apellido2 = apellido2;
      user.municipio = municipio;
      user.provincia = provincia;
      user.codigo_postal = codigo_postal;
      user.numero_hijos = numero_hijos;
      user.sexo = sexo;
      user.ingresos_mensuales = ingresos_mensuales;
    } catch (e) {
      return res.status(404).json({ message: 'User not found' });
    }
    const validationOpt = { validationError: { target: false, value: false } };
    const errors = await validate(user, validationOpt);

    if (errors.length > 0) {
      return res.status(400).json(errors);
    }

    // Try to save user
    try {
      await userRepository.save(user);
    } catch (e) {
      return res.status(409).json({ message: 'Username already in use 01' });
    }

    res.status(201).json({ message: 'User update' });
  };

  static delete = async (req: Request, res: Response) => {
    const { id } = req.params;
    const userRepository = getRepository(Users);
    const newUser = getRepository(NewUsers);
    const deleteUser = getRepository(DeleteUsers);
    let user: Users;

    try {
      user = await userRepository.findOneOrFail(id);
    } catch (e) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove user
    userRepository.delete(id);
    newUser.delete(id);
    //await deleteUser.save(user);
    res.status(201).json({ message: ' User deleted' });
  };

  static editActUser = async (req: Request, res: Response) => {
    console.log('editActUser');
  let user;
    const { id } = res.locals.jwtPayload;
    const { userId } = res.locals.jwtPayload;
    const { name, apellidos, codigo_postal, ingresos_mensuales, municipio, provincia, 
      numero_hijos, sexo, ocupacion, vive_con, nivel_estudios, clase_social, fecha_nacimiento,
      fecha_nacimiento_hijo1, fecha_nacimiento_hijo2, fecha_nacimiento_hijo3 } = req.body;

    const userRepository = getRepository(Users);
    console.log('userRepository', userRepository);

    let fechaComoDate: Date;
    let fechaComoDateH1: Date;
    let fechaComoDateH2: Date;
    let fechaComoDateH3: Date;

    // Try get user
    try {
      user = await userRepository.findOneOrFail(userId);
      user.name = name;
      user.codigo_postal = codigo_postal;
      user.ingresos_mensuales = ingresos_mensuales;
      user.municipio = municipio;
      user.provincia = provincia;
      user.apellidos = apellidos;
      user.numero_hijos = numero_hijos;
      user.sexo = sexo;
      user.ocupacion = ocupacion;
      user.vive_con = vive_con;
      user.nivel_estudios = nivel_estudios;
      user.clase_social = clase_social;

      // Validar y procesar fecha_nacimiento
      if (fecha_nacimiento) {
        try {
          const partes = fecha_nacimiento.split("/");
          if (partes.length !== 3) {
            throw new Error('Invalid date format');
          }
          fechaComoDate = new Date(+partes[2], +partes[1] - 1, +partes[0]);
          if (isNaN(fechaComoDate.getTime())) {
            throw new Error('Invalid date');
          }
          user.fecha_nacimiento = fechaComoDate;
        } catch (error) {
          console.error('Error parsing date:', error);
          return res.status(400).json({ message: 'Invalid date format for fecha_nacimiento' });
        }
      }

      // Validar y procesar fecha_nacimiento_hijo1
      if (fecha_nacimiento_hijo1) {
        try {
          const partes = fecha_nacimiento_hijo1.split("/");
          if (partes.length !== 3) {
            throw new Error('Invalid date format');
          }
          fechaComoDateH1 = new Date(+partes[2], +partes[1] - 1, +partes[0]);
          if (isNaN(fechaComoDateH1.getTime())) {
            throw new Error('Invalid date');
          }
          user.fecha_nacimiento_hijo1 = fechaComoDateH1;
        } catch (error) {
          console.error('Error parsing date:', error);
          return res.status(400).json({ message: 'Invalid date format for fecha_nacimiento_hijo1' });
        }
      }

      // Validar y procesar fecha_nacimiento_hijo2
      if (fecha_nacimiento_hijo2) {
        try {
          const partes = fecha_nacimiento_hijo2.split("/");
          if (partes.length !== 3) {
            throw new Error('Invalid date format');
          }
          fechaComoDateH2 = new Date(+partes[2], +partes[1] - 1, +partes[0]);
          if (isNaN(fechaComoDateH2.getTime())) {
            throw new Error('Invalid date');
          }
          user.fecha_nacimiento_hijo2 = fechaComoDateH2;
        } catch (error) {
          console.error('Error parsing date:', error);
          return res.status(400).json({ message: 'Invalid date format for fecha_nacimiento_hijo2' });
        }
      }

      // Validar y procesar fecha_nacimiento_hijo3
      if (fecha_nacimiento_hijo3) {
        try {
          const partes = fecha_nacimiento_hijo3.split("/");
          if (partes.length !== 3) {
            throw new Error('Invalid date format');
          }
          fechaComoDateH3 = new Date(+partes[2], +partes[1] - 1, +partes[0]);
          if (isNaN(fechaComoDateH3.getTime())) {
            throw new Error('Invalid date');
          }
          user.fecha_nacimiento_hijo3 = fechaComoDateH3;
        } catch (error) {
          console.error('Error parsing date:', error);
          return res.status(400).json({ message: 'Invalid date format for fecha_nacimiento_hijo3' });
        }
      }

    } catch (e) {
      return res.status(404).json({ message: 'User not found' });
    }

    const validationOpt = { validationError: { target: false, value: false } };
    const errors = await validate(user, validationOpt);

    if (errors.length > 0) {
      return res.status(400).json(errors);
    }

    // Try to save user
    try {
      await userRepository.save(user);
    } catch (e) {
      return res.status(409).json({ message: 'Username already in use 02' });
    }

    res.status(201).json({ message: 'User update' });
  }

  static editPhoneActUser = async (req: Request, res: Response) => {
    console.log('editPhoneActUser');
  let user;
    const { id } = res.locals.jwtPayload;
    const { userId } = res.locals.jwtPayload;
    const { telefono } = req.body;

    const userRepository = getRepository(Users);
    console.log('userRepository', userRepository);
    // Try get user
    try {
      user = await userRepository.findOneOrFail(userId);
      //res.status(202).json({ message: 'User => '+ res.locals.jwtPayload});
      ///user.username = 'vicente@test.com';
      //user.role = 'admin';
      user.telefono = telefono;
    } catch (e) {
      return res.status(404).json({ message: 'User not found' });
    }
    const validationOpt = { validationError: { target: false, value: false } };
    const errors = await validate(user, validationOpt);

    if (errors.length > 0) {
      return res.status(400).json(errors);
    }

    // Try to save user
    try {
      await userRepository.save(user);
    } catch (e) {
      return res.status(409).json({ message: 'Username already in use' });
    }

    res.status(201).json({ message: 'User update' });
  }

  static checkPassword = async(req: Request, res: Response) => { 
    
    const { userId } = res.locals.jwtPayload;
    const { password } = req.body;

    const userRepository = getRepository(Users);
    let user: Users;

    try {
      user = await userRepository.findOneOrFail(userId);
    } catch (e) {
      res.status(400).json({ message: 'Somenthing goes wrong!' });
    }

    if (!user.checkPassword(password)) {
      return res.status(401).json({ message: 'Password incorrecta' });
    } else {res.json({ message: 'Password correcta' }); }
  }

  static changePassword = async (req: Request, res: Response) => {
   // res.status(400).json({ message: 'userId' });
    const { userId } = res.locals.jwtPayload;
    const { password, newPassword } = req.body;
    
    if (!(password && newPassword)) {
      res.status(400).json({ message: 'Old password & new password are required' });
    }

    const userRepository = getRepository(Users);
    let user: Users;

    try {
      user = await userRepository.findOneOrFail(userId);
    } catch (e) {
      res.status(400).json({ message: 'Somenthing goes wrong!' });
    }

    if (!user.checkPassword(password)) {
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

  static deleteUser = async (req: Request, res: Response) => {
    //const { id } = req.params;
    const { userId } = res.locals.jwtPayload;
    const userRepository = getRepository(Users);
    const newUser = getRepository(NewUsers);
    const deleteUser = getRepository(DeleteUsers);
    let user: Users;
    // res.status(201).json({ message: ' User deleted'+ userId });
    try {
      user = await userRepository.findOneOrFail(userId);
    } catch (e) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove user
    user.deleted_at = new Date();
    await deleteUser.save(user);
    await userRepository.delete(user.id);
    await newUser.delete(user.id);
    
    res.status(201).json({ message: ' User deleted'+ user });
  };

  static setInvitationStatus = async (req: Request, res: Response) => {
    console.log('setInvitationStatus', req);
    //const { id } = req.params;
    const { userId } = res.locals.jwtPayload;
    const inviter = '96';
    const newFriend = 'vpfarras2@gmail.com';

    const invitations = getRepository(Invitations);
    let invited: Invitations;
    // res.status(201).json({ message: ' User deleted'+ userId });
    try {
      invited = await invitations.findOne({
        where: {
          username: newFriend,
          sender_id: inviter,
        }
      });
    } catch (e) {
      return res.status(404).json({ message: 'User not found' });
    }

    invited.is_used = true;

    // Remove user
    
    await invitations.save(invited);
    res.status(201).json({ message: ' invitación usada' });
  };
  
  static createQueryBuild = async (req: Request, res: Response) => {
    const { formQuery } = req.body; // Recibir la consulta directamente
    console.log("Consulta recibida:", formQuery);
    const userRepository = getRepository(Users);
  
    try {
      // Validar que la consulta es un SELECT
      if (!formQuery.trim().toLowerCase().match(/^\(*\s*select/)) {
        return res.status(400).json({ message: "Solo se permiten consultas SELECT." });
      }
  
      // Ejecutar la consulta
      const users = await userRepository.query(formQuery);
  
      // Enviar los resultados
      res.send(users);
    } catch (error) {
      console.error("Error ejecutando la consulta:", error);
      res.status(400).json({ message: "Error al procesar la consulta." });
    }
  };
  
  
  
  
  

  static newInvitation = async (req: Request, res: Response ) => {
    console.log('newInvitation');
    const { friendIds, coments } = req.body;
    const { email, senderId } = req.body;
    const { userId } = res.locals.jwtPayload;
    console.log('newInvitation userId', userId);
    console.log('newInvitation friendIds', friendIds);
    const code = generateInvitationCode();
    // Verificar que al menos se haya especificado un amigo para enviar la invitación
    if (!friendIds || !Array.isArray(friendIds) || friendIds.length === 0) {
      return res.status(400).json({ message: 'Debe especificar al menos un amigo para enviar la invitación' });
    }
  
    const invitacionRepository = getRepository(Invitations);

    try {

      const invitacionesExistentes: Invitations[] = [];
    for (const friendId of friendIds) {
      const invitacionExistente = await invitacionRepository.findOne({
        where: {
          sender_id: userId,
          username: friendId,
        }
      });
      if (invitacionExistente) {
        invitacionesExistentes.push(invitacionExistente);
      }
    }
    
    
      /*if (invitacionesExistentes.length > 0) {
        const amigosConInvitaciones = invitacionesExistentes.map((invitacion) => invitacion.username);
        const amigosSinInvitaciones = friendIds.filter((friendId) => !amigosConInvitaciones.includes(friendId));
        return res.status(400).json({ message: `Ya habías enviado una invitación a los amigos con ID: ${amigosConInvitaciones}. No es posible enviar mas de una invitación` });
      }*/
  
      const nuevasInvitaciones = friendIds.map((friendId) => {
        const invitacion = new Invitations();
        invitacion.sender_id = userId;
        invitacion.username = friendId;
        invitacion.is_used = false;
        invitacion.coments = coments;
        return invitacion;
      }); 
  
      await
  invitacionRepository.save(nuevasInvitaciones);
  
  const userRepository = getRepository(Users);
  const user = await userRepository.findOne(userId);
  
  console.log('newInvitation friendIds antes del foreach', friendIds);
  friendIds.forEach(async (friendId) => {
    //const friend = await userRepository.findOne(friendId);
    const baseUrl = process.env.BASE_URL || 'http://localhost:4200'; 
    const inviteLink = `${baseUrl}/register?source=MGM&user=${userId}&friend=${friendId}`;
    console.log('inviteLink', inviteLink);
    const emailBody = `<table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0; padding: 20px 0; background-color: #f4f4f4;font-family:Arial;font-size: 14px">
    <tbody><tr>
        <td align="center" style="padding: 0 15px;">
            <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 100%; background-color: #ffffff; box-shadow: 0 2px 3px rgba(0,0,0,0.1);">
                <tbody><tr>
                    <td align="center" style="padding: 0;">
                        <img src="https://ci3.googleusercontent.com/meips/ADKq_NaPNTXjBNi5pPbpTnr9SEKIRGuTv1jLy7o1BqVLY5zj2Zj9hduBZSRZ-WkgOuxVki9vfcDQ8UNFQ3umgxiyNvJhQKTaOags-9PDPMNTrJ_nXHI57Jekwpa1H9o3Im1i0nwYSb5K7-SPRMWSeLRJi-ZmUnMfJSSfh-hiwWCkQTBYShMmQeV17_iauP4v9GVuGQ=s0-d-e1-ft#https://emails.masmetrica.es/data/aa2eaaed7bf4374690815f6347c22f6521e31eb3/media_files/5/original/ImagenOptinCabecera3.jpg" alt="Cabecera" style="display: block; width: 100%; height: auto;">
                    </td>
                </tr>
                <tr>
                    <td align="left" style="padding: 20px; font-family: Arial, sans-serif; line-height: 1.6; color: #333333;">
                        <p style="margin: 0 0 15px;">Hola ${friendId},</p>
                        <p style="margin: 0 0 15px;">${user.username} te ha invitado a unirte a su red de amigos en <b>MásMétrica</b> (empresa de investigación de mercados que te paga por dar tu opinión en divertidas y breves encuestas sobre temas de actualidad). Si quieres regístrarte y participar de forma voluntaria y gratuita haz click en el siguiente enlace para aceptar la invitación</p>
                        <a href="${inviteLink}" style="margin-top:10px;width:auto;max-width:180px;border-radius:5px;margin:0 auto;display:block;text-align:center;background-color:#3498db;color: #fff; text-decoration: none;">Aceptar invitación</a>
                        <p>Una vez hayas activado tu cuenta, recibirás encuestas y estudios de mercado en tu dirección de correo electrónico. <b>MásMétrica</b> te premiará cada vez que completes las encuestas que te proponga con dinero efectivo ingresado en tu cuenta Paypal, Bizum o a través de Amazon.</p>
                        <p style="margin: 0 0 15px;">Si no puedes pinchar sobre el enlace, copia la siguiente dirección, pégala en tu navegador y pulsa intro para ejecutarlo: <br>${inviteLink}</p>
                        <p style="margin: 0;background-color:#333;color:#fff;padding:7px">Recibe un cordial saludo,<br>El equipo de <b>MásMétrica</b></p>
                    </td>
                </tr>
            </tbody></table>
        </td>
    </tr>
</tbody></table>
    `;
    console.log('emailBody', emailBody);
    const mailOptions = {
      from: 'info@masmetrica.es',
      to: friendId,
      subject: 'Invitación a unirse a MasMétrica',
      html: emailBody,
    };
    console.log('mailOptions', mailOptions);
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) throw err;
    });
  }); 
  return res.json({ message: 'Invitaciones enviadas correctamente' });
  } catch (error) {
  return res.status(500).json({ message: 'Error al enviar invitaciones' });
  }
  };

  static uploadNewFile = async (req, res) => {
    console.log('---------------upload---------------')
    
    try {
      console.log('-----------uploadNewFile----------', req.file)
      await uploadFile(req, res);
  
      if (req.file == undefined) {
        return res.status(400).send({ message: "Please upload a file!" });
      }
  
      res.status(200).send({
        message: "Uploaded the file successfully: " + req.file.originalname,
      });
    } catch (err) {
      res.status(500).send({
        message: `Could not upload the file: ${req.file.originalname}. ${err}`,
      });
    }
  };

  static uploadAndProcessFile = async (req, res) => {
    console.log('File received:', req.file); // Verifica que el archivo esté en req.file
    console.log('File path:', req.file?.path);
    try {
      // Verifica si hay un archivo
      if (!req.file) {
        return res.status(400).send({ message: "No file uploaded" });
      }
      console.log('workbook', xlsx.readFile(req.file.path));
      // Procesar el archivo Excel
      const workbook = xlsx.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(worksheet);
  
      const paysRepository = getRepository(Pays);
      const usersRepository = getRepository(Users);
  
      // Procesar cada fila del archivo Excel
      for (const row of rows) {
        const { Email, metodoPago, cantidad, IdEncuestado, NombreEncuesta, FechaPago } = row;

        let parsedDate: Date;

            // Manejar FechaPago numérica (formato de Excel)
            if (typeof FechaPago === 'number') {
                parsedDate = new Date((FechaPago - 25569) * 86400000); // Convertir a fecha
            } else if (typeof FechaPago === 'string') {
                // Manejar FechaPago como cadena (DD/MM/YYYY)
                const dateParts = FechaPago.split('/');
                if (dateParts.length !== 3) {
                    return res.status(400).send({ message: `Fecha inválida para IdEncuestado ${IdEncuestado}` });
                }
                parsedDate = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`); // YYYY-MM-DD
            } else {
                return res.status(400).send({ message: `Formato de FechaPago inválido para IdEncuestado ${IdEncuestado}` });
            }

            if (isNaN(parsedDate.getTime())) {
                return res.status(400).send({ message: `Fecha inválida para IdEncuestado ${IdEncuestado}` });
            }
  
        // Buscar el usuario por Email
        let user = await usersRepository.findOne({ where: { id: IdEncuestado } });
        let existsPay = await paysRepository.findOne( {where: { 
          IdEncuestado: IdEncuestado, 
          NombreEncuesta: NombreEncuesta
        }})
  
        // Si el usuario no existe, puedes manejarlo de la manera que prefieras (ej. lanzar error)
        if (!user) {
          return res.status(404).send({ message: `No se ha encontrado al usuario ${IdEncuestado}` });
        }

        if (existsPay) {
          return res.status(404).send({ message: `Ya existe un registro para el usuario ${IdEncuestado} asociado a la encuesta ${NombreEncuesta}` });
        }
  
  
        // Crear un nuevo pago para el usuario encontrado
        const newPay = new Pays();
        newPay.metodoPago = metodoPago;
        newPay.cantidad = cantidad;
        newPay.IdEncuestado = IdEncuestado;
        newPay.NombreEncuesta = NombreEncuesta;
        newPay.FechaPago = parsedDate;
        newPay.Email = Email; // No es estrictamente necesario guardar el email aquí, ya que está en `user`
        //newPay.usersId = user; // Asignar el usuario
  
        // Guardar el nuevo pago
        await paysRepository.save(newPay);
      }
  
      return res.status(200).send({ message: "File processed and payments saved" });
    } catch (error) {
      console.error(error);
      return res.status(500).send({ message: "Error processing file", error });
    }
  };

  static downloadFile = async (req, res) => {
    console.log('---------------download---------------')

    const { filename } = req.params;
    const filePath = path.join(__dirname, "../../uploads", filename);

    console.log('----------filename-----------', filename);
    console.log('----------filePath-----------', filePath);
    
    if (fs.existsSync(filePath)) {
      console.log('----------existe-----------', filePath);
      res.set("Content-Disposition", `attachment; filename=${filename}`);
      res.set("Content-Type", "application/octet-stream");
      res.download(filePath); // Inicia la descarga del archivo
    } else {
      res.status(404).send("El archivo no existe");
    } 
  };
  

  static getPaymentData = async (req, res) => {
    
    const { email, month, userId, year } = req.body;
    console.log('-----------email----------', email);
    console.log('-----------userId----------', userId);
console.log('---------month--------', month);    // Ruta del archivo Excel
try {
  const paysRepository = getRepository(Pays);
  const userPays = await paysRepository.find({ where: { IdEncuestado: userId } });
  console.log('userPays', userPays);   
  res.send(userPays);
} catch (error) {
    console.error(error);
    return res.status(500).send('Error comprobando los pagos');
}
   /* const filePath = path.join(__dirname, "../../uploads", 'pagos.xlsx');

    // Cargar el archivo Excel
    const workbook = xlsx.readFile(filePath);

    // Obtener la primera hoja del archivo
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convertir los datos de la hoja en formato JSON
    

    try {
      const jsonData = await xlsx.utils.sheet_to_json(worksheet);
      // const filteredData = jsonData.filter(row => row.Email === 'vpfarras@gmail.com');
      const filteredData = jsonData.filter(row => {
        
        if (month && month !== '') {
          const fechaPago = new Date(row.FechaPago);
          return (
            fechaPago.getMonth() === parseInt(month, 10) &&
            row.Email === email
          );
        } else {
          return row.Email === email;
        }
      });
      res.send(filteredData);
    } catch (e) {
      res.status(404).json({ message: 'Error al cargar los datos' });
    } */
  }

  static requestSmsCode = async (req, resp) => {

    console.log('---------------requestSmsCode body req-------------------', req.body.resetToken);

    let msisdn;
    let msg;
    // Verificar el tipo de resetToken
    if (typeof req.body.resetToken === 'string') {
        // Caso cuando resetToken es una cadena de texto
        msisdn = '34' + req.body.resetToken;
        msg = 'Introduce el siguiente código para finalizar el alta en MASMETRICA: {PIN}'
    } else if (typeof req.body.resetToken === 'object' && req.body.resetToken.telefono) {
        // Caso cuando resetToken es un objeto con la propiedad telefono
        msisdn = '34' + req.body.resetToken.telefono;
        msg = 'Introduce el siguiente código para cambiar tu número de teléfono en MASMETRICA: {PIN}'
    } else {
        // Manejar caso inválido
        return resp.status(400).send('Invalid resetToken format');
    }

    console.log('msisdn', msisdn);
    console.log('msg', msg);
    try {
      const userRepository = getRepository(Users);
      const existingUser = await userRepository.findOne({ where: { telefono: req.body.resetToken.telefono } });
      console.log('existingUser', existingUser);
      console.log('req.body.resetToken', req.body.resetToken.telefono);
      if (existingUser) {
          // Si el número ya existe, devolver un mensaje de error
          return resp.status(400).json({ message: 'El número de teléfono ya está registrado.' });
      }
      const data = JSON.stringify({
          api_key: 'e836182865bb42f88a30e6aeb4e63fc8',
          msisdn: msisdn,
          sender: 'MASMETRICA',
          sms_text: msg,
          hlr_lookup: 1
        });

      const options = {
        hostname: 'api.gateway360.com',
        port: 443,
        path: '/api/2fa/request',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };

      console.log('----------data----------', data);
      console.log('----------options----------', options);

      const requ = https.request(options, (res) => {
        let responseBody = '';
      
        res.on('data', (chunk) => {
          responseBody += chunk;
        });
      
        res.on('end', () => {
          console.log(responseBody);
          resp.send(responseBody);
        });
      });
    
      requ.on('error', (error) => {
        console.error(error);
      });
    
      requ.write(data);
      requ.end(); 
    } catch (error) {
        console.error(error);
        return resp.status(500).send('Error verifying phone number');
    }
  }

  static validateSmsCode = async (req, resp) => {

    console.log('---------------requestSmsCode body api-------------------', req.body.pin);
    console.log('---------------requestSmsCode body api-------------------', req.body.msisdn);
    const data = JSON.stringify({
        api_key: 'e836182865bb42f88a30e6aeb4e63fc8',
        msisdn: '34'+req.body.msisdn,
        pin: req.body.pin
    });

    const options = {
        hostname: 'api.gateway360.com',
        port: 443,
        path: '/api/2fa/verify',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Content-Length': data.length
        }
    };

    console.log('---------data--------', data);
    console.log('---------options--------', options);
    try {
      const userRepository = getRepository(Users);
      const existingUser = await userRepository.findOne({ where: { telefono: req.body.msisdn } });

      if (existingUser) {
          // Si el número ya existe, devolver un mensaje de error
          return resp.status(400).json({ message: 'El número de teléfono ya está registrado.' });
      }

      const requ = https.request(options, (res) => {
          let responseBody = '';

          res.on('data', (chunk) => {
              responseBody += chunk;
          });

          res.on('end', () => {
              console.log(responseBody);
              resp.send(responseBody);
          });
      });

      requ.on('error', (error) => {
          console.error(error);
      });

      requ.write(data);
      requ.end(); 
    } catch (error) {
        console.error(error);
        return resp.status(500).send('Error verifying phone number');
      }

  }

  static requestEmailChange = async (req: Request, res: Response) => {
    const { newEmail } = req.body;
    const { userId } = res.locals.jwtPayload;
    
    if (!newEmail) {
        return res.status(400).json({ message: 'Email requerido' });
    }

    // Verificar si el email ya existe
    const userRepository = getRepository(Users);
    const existingUser = await userRepository.findOne({ where: { username: newEmail } });
    if (existingUser) {
        return res.status(409).json({ message: 'El email ya está registrado' });
    }

    // Generar un código de verificación de 4 dígitos
    const verificationCode = Math.floor(1000 + Math.random() * 9000); // Generar un código aleatorio de 4 dígitos

    // Guardar el código temporalmente en la base de datos (o sesión)
    let user = await userRepository.findOneOrFail(userId);
    user.verifyToken = verificationCode.toString();

    await userRepository.save(user);

    // Enviar el email con el enlace de verificación
    const baseUrl = process.env.BASE_URL || 'http://localhost:4200';
    
    const emailBody = `<table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0; padding: 20px 0; background-color: #f4f4f4;font-family:Arial;font-size: 14px">
    <tbody><tr>
        <td align="center" style="padding: 0 15px;">
            <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 100%; background-color: #ffffff; box-shadow: 0 2px 3px rgba(0,0,0,0.1);">
                <tbody><tr>
                    <td align="center" style="padding: 0;">
                        <img src="https://ci3.googleusercontent.com/meips/ADKq_NaPNTXjBNi5pPbpTnr9SEKIRGuTv1jLy7o1BqVLY5zj2Zj9hduBZSRZ-WkgOuxVki9vfcDQ8UNFQ3umgxiyNvJhQKTaOags-9PDPMNTrJ_nXHI57Jekwpa1H9o3Im1i0nwYSb5K7-SPRMWSeLRJi-ZmUnMfJSSfh-hiwWCkQTBYShMmQeV17_iauP4v9GVuGQ=s0-d-e1-ft#https://emails.masmetrica.es/data/aa2eaaed7bf4374690815f6347c22f6521e31eb3/media_files/5/original/ImagenOptinCabecera3.jpg" alt="Cabecera" style="display: block; width: 100%; height: auto;">
                    </td>
                </tr>
                <tr>
                    <td align="left" style="padding: 20px; font-family: Arial, sans-serif; line-height: 1.6; color: #333333;">
                    <p>Su código de verifiación de cambio de email en MásMétrica es:<strong>"${verificationCode}"></strong></p>
                        <p style="margin: 0;background-color:#333;color:#fff;padding:7px">Recibe un cordial saludo,<br>El equipo de <b>MásMétrica</b></p>
                    </td>
                </tr>
            </tbody></table>
        </td>
    </tr>
</tbody></table>
    `;
    console.log('emailBody', emailBody);
    const mailOptions = {
      from: 'info@masmetrica.es',
      to: newEmail,
      subject: 'Masmetrica: Cambio de email',
      html: emailBody,
    };
    console.log('mailOptions new Email', mailOptions);
    /*transporter.sendMail(mailOptions, (err, info) => {
      if (err) throw err;
    });*/
    /*const mailOptions = {
        from: 'info@tuapp.com',
        to: newEmail,
        subject: 'Verificación de cambio de email',
        html: `<p>Haga clic en el siguiente enlace para verificar su nuevo email:</p><a href="${verificationLink}">Verificar email</a>`
    };*/

    try {
        await transporter.sendMail(mailOptions);
        return res.status(200).json({ message: 'Código de verificación enviado' });
    } catch (err) {
        return res.status(500).json({ message: 'Error al enviar el el código de verificación' });
    }
};

static verifyEmailCode = async (req: Request, res: Response) => {
  const { userId } = res.locals.jwtPayload;
  const { newEmail, verificationCode } = req.body;

  if (!newEmail || !verificationCode) {
      return res.status(400).json({ message: 'Email y código de verificación requeridos' });
  }

  const userRepository = getRepository(Users);
  let user = await userRepository.findOneOrFail(userId);

  // Verificar si el código coincide
  if (user.verifyToken === verificationCode) {
      user.username = newEmail; // Cambiar el email
      user.verifyToken = ''; // Limpiar el token después de su uso
      await userRepository.save(user);

      return res.status(200).json({ message: 'Email actualizado correctamente' });
  } else {
      return res.status(400).json({ message: 'Código de verificación incorrecto' });
  }
};
  
}


function generateInvitationCode() {
  let code = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 8; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}


// Función para eliminar usuarios antiguos
async function deleteOldUsers() {
  console.log('Ejecutando eliminación de usuarios antiguos...');

  const currentDate = new Date();
  const sevenDaysAgo = new Date(currentDate.getTime() - SEVEN_DAYS);

  const userRepository = getRepository(NewUsers);

  try {
    const result = await userRepository.delete({ created_at: LessThan(sevenDaysAgo) });
    console.log('Usuarios antiguos eliminados:', result.affected);
  } catch (error) {
    console.error('Error eliminando usuarios antiguos:', error);
  }
}

// Ejecutar la función cada 24 horas
setInterval(deleteOldUsers, TWENTY_FOUR_HOURS);


export default UserController;
