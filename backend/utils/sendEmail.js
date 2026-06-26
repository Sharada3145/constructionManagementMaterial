const nodemailer = require('nodemailer');
const dns = require('dns');

const sendEmail = async (options) => {
  // If no API key is provided, log to console for development
  if (!process.env.SENDGRID_API_KEY && !process.env.BREVO_API_KEY) {
    console.log('\n==================================================');
    console.log('⚠️  NO EMAIL API KEY CONFIGURED (USING DEVELOPMENT LOG MODE)');
    console.log(`To:      ${options.email}`);
    console.log(`Subject: ${options.subject}`);
    console.log('Content:');
    console.log(options.html.replace(/<[^>]*>/g, ' ').trim().replace(/\s+/g, ' '));
    console.log('==================================================\n');
    return;
  }

  if (process.env.BREVO_API_KEY) {
    // Use Brevo API
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sender: { email: process.env.EMAIL_USER, name: 'Construction Material Management' },
        to: [{ email: options.email }],
        subject: options.subject,
        htmlContent: options.html
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Brevo Error (${response.status}): ${errorData}`);
    }
    return;
  }

  // Use SendGrid API
  if (process.env.SENDGRID_API_KEY) {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: options.email }] }],
        from: { 
          email: process.env.EMAIL_USER, 
          name: 'Construction Material Management' 
        },
        subject: options.subject,
        content: [{ type: 'text/html', value: options.html }]
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`SendGrid Error (${response.status}): ${errorData}`);
    }
  }
};

module.exports = sendEmail;
