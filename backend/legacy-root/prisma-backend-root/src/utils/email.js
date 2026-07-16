const nodemailer = require('nodemailer');

// Create email transporter (configure based on your email service)
const createTransporter = () => {
  return nodemailer.createTransport({
    // Gmail configuration
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD, // Use app password for Gmail
    },
    // Alternative: SMTP configuration
    // host: process.env.SMTP_HOST,
    // port: process.env.SMTP_PORT,
    // secure: process.env.SMTP_SECURE === 'true',
    // auth: {
    //   user: process.env.SMTP_USER,
    //   pass: process.env.SMTP_PASSWORD,
    // },
  });
};

// Password reset email template
const generatePasswordResetEmail = (user, resetURL) => {
  return {
    subject: 'Password Reset Request',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { 
            background: linear-gradient(135deg, #10b981, #059669); 
            color: white; 
            padding: 30px; 
            text-align: center; 
            border-radius: 10px 10px 0 0; 
          }
          .content { 
            background: #f9fafb; 
            padding: 30px; 
            border-radius: 0 0 10px 10px; 
            border: 1px solid #e5e7eb;
          }
          .button { 
            display: inline-block; 
            background: #10b981; 
            color: white; 
            padding: 15px 30px; 
            text-decoration: none; 
            border-radius: 8px; 
            margin: 20px 0; 
            font-weight: bold;
            transition: background-color 0.3s ease;
          }
          .button:hover { background: #059669; }
          .footer { 
            text-align: center; 
            margin-top: 30px; 
            color: #6b7280; 
            font-size: 14px; 
          }
          .warning { 
            background: #fef3cd; 
            border: 1px solid #fde68a; 
            padding: 15px; 
            border-radius: 8px; 
            margin: 20px 0;
            color: #92400e;
          }
          .url-box {
            background: #f3f4f6;
            padding: 15px;
            border-radius: 8px;
            word-break: break-all;
            font-family: monospace;
            font-size: 14px;
            margin: 15px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔒 Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.name},</h2>
            <p>We received a request to reset your password for your account. If you made this request, click the button below to reset your password:</p>
            
            <div style="text-align: center;">
              <a href="${resetURL}" class="button">Reset My Password</a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <div class="url-box">${resetURL}</div>
            
            <div class="warning">
              <strong>⚠️ Important:</strong>
              <ul>
                <li>This link will expire in <strong>10 minutes</strong></li>
                <li>If you didn't request this password reset, please ignore this email</li>
                <li>Your password will remain unchanged until you create a new one</li>
              </ul>
            </div>
            
            <p>If you're having trouble clicking the button, you can also copy and paste the URL directly into your browser's address bar.</p>
            
            <p>If you have any questions or concerns, please contact our support team.</p>
          </div>
          <div class="footer">
            <p>Best regards,<br>
            <strong>${process.env.APP_NAME || 'Your App'} Team</strong></p>
            <p style="font-size: 12px; color: #9ca3af;">
              This email was sent to ${user.email}. If you received this email by mistake, please ignore it.
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  };
};

// Welcome email template
const generateWelcomeEmail = (user) => {
  return {
    subject: `Welcome to ${process.env.APP_NAME || 'Our App'}!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { 
            background: linear-gradient(135deg, #10b981, #059669); 
            color: white; 
            padding: 30px; 
            text-align: center; 
            border-radius: 10px 10px 0 0; 
          }
          .content { 
            background: #f9fafb; 
            padding: 30px; 
            border-radius: 0 0 10px 10px; 
            border: 1px solid #e5e7eb;
          }
          .button { 
            display: inline-block; 
            background: #10b981; 
            color: white; 
            padding: 15px 30px; 
            text-decoration: none; 
            border-radius: 8px; 
            margin: 20px 0; 
            font-weight: bold;
            transition: background-color 0.3s ease;
          }
          .button:hover { background: #059669; }
          .footer { 
            text-align: center; 
            margin-top: 30px; 
            color: #6b7280; 
            font-size: 14px; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to ${process.env.APP_NAME || 'Our App'}!</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.name},</h2>
            <p>Thank you for joining us! We're excited to have you on board.</p>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Get Started</a>
            </div>
            
            <p>If you have any questions, feel free to reach out to our support team.</p>
          </div>
          <div class="footer">
            <p>Best regards,<br>
            <strong>${process.env.APP_NAME || 'Your App'} Team</strong></p>
          </div>
        </div>
      </body>
      </html>
    `
  };
};

// Main email sending function
const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `${process.env.APP_NAME || 'Your App'} <${process.env.EMAIL_USER}>`,
      to: options.email,
      subject: options.subject,
      html: options.html,
      text: options.text, // Optional plain text version
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return info;

  } catch (error) {
    console.error('Email sending error:', error);
    throw new Error('Failed to send email');
  }
};

// Convenience function for password reset emails
const sendPasswordResetEmail = async (user, resetToken) => {
  const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  const emailTemplate = generatePasswordResetEmail(user, resetURL);
  
  return await sendEmail({
    email: user.email,
    subject: emailTemplate.subject,
    html: emailTemplate.html
  });
};

// Convenience function for welcome emails
const sendWelcomeEmail = async (user) => {
  const emailTemplate = generateWelcomeEmail(user);
  
  return await sendEmail({
    email: user.email,
    subject: emailTemplate.subject,
    html: emailTemplate.html
  });
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  generatePasswordResetEmail,
  generateWelcomeEmail
};