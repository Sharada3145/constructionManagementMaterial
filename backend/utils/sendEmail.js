const nodemailer = require('nodemailer');
const dns = require('dns');

// Force IPv4 first since Render often has issues connecting to Gmail via IPv6 (ENETUNREACH)
dns.setDefaultResultOrder('ipv4first');

const sendEmail = async (options) => {
  const isDefaultOrEmpty = !process.env.EMAIL_USER || 
    process.env.EMAIL_USER === 'your_email@gmail.com' || 
    process.env.EMAIL_USER.includes('your_email') ||
    !process.env.EMAIL_PASS || 
    process.env.EMAIL_PASS === 'your_app_password';

  if (isDefaultOrEmpty) {
    console.log('\n==================================================');
    console.log('⚠️  EMAIL SERVICE NOT CONFIGURRED (USING DEVELOPMENT LOG MODE)');
    console.log(`To:      ${options.email}`);
    console.log(`Subject: ${options.subject}`);
    console.log('Content:');
    console.log(options.html.replace(/<[^>]*>/g, ' ').trim().replace(/\s+/g, ' '));
    console.log('==================================================\n');
    return;
  }

  // Create a transporter
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Define the email options
  const mailOptions = {
    from: `Construction Material Management <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  // Actually send the email
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
