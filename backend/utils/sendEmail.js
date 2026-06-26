const nodemailer = require('nodemailer');
const dns = require('dns');

// Force IPv4 first since Render often has issues connecting to Gmail via IPv6 (ENETUNREACH)
dns.setDefaultResultOrder('ipv4first');

const sendEmail = async (options) => {
  // If no SendGrid API key is provided, log to console for development
  if (!process.env.SENDGRID_API_KEY) {
    console.log('\n==================================================');
    console.log('⚠️  SENDGRID_API_KEY NOT CONFIGURED (USING DEVELOPMENT LOG MODE)');
    console.log(`To:      ${options.email}`);
    console.log(`Subject: ${options.subject}`);
    console.log('Content:');
    console.log(options.html.replace(/<[^>]*>/g, ' ').trim().replace(/\s+/g, ' '));
    console.log('==================================================\n');
    return;
  }

  // Use fetch to call SendGrid's HTTP API (bypasses Render SMTP blocks)
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
};

module.exports = sendEmail;
