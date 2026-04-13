 import nodemailer = require('nodemailer');

 export const transporter = nodemailer.createTransport({
    host: "smtp1.s.ipzmarketing.com",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: 'wqbmwxnqdgkz', // generated ethereal user
      //pass: 'rhzybrplmfsfybsp', // generated ethereal password
      //pass: 'kjbxvllxfnlkjabn', // generated ethereal password
      pass: 'GFGtP_N8lGs', // generated ethereal password
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  transporter.verify().then( ()  => {
    console.log('Ready for send email');
} ).catch(error => {
  console.error('Error during verification:', error);
});