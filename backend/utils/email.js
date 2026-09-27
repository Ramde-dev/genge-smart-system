const nodemailer = require('nodemailer');

// Configure the transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Add this to your .env file
    pass: process.env.EMAIL_PASS  // Add your App Password here
  }
});

const sendStatusUpdateEmail = async (email, orderId, status) => {
  try {
    await transporter.sendMail({
      from: '"Genge Smart System" <noreply@genge.com>',
      to: email,
      subject: `Order #${orderId} Update`,
      text: `Hello, your order #${orderId} has been updated to: ${status.toUpperCase()}.`,
      html: `<h2>Order Update</h2><p>Your order <strong>#${orderId}</strong> status has been updated to: <strong>${status.toUpperCase()}</strong>.</p>`
    });
    console.log(`Email sent to ${email} for order #${orderId}`);
  } catch (error) {
    console.error("Email error:", error);
  }
};

const sendNotificationEmail = async (email, title, message, link = null) => {
  if (!email || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
  try {
    const actionUrl = link ? `${process.env.CLIENT_URL || 'http://localhost:5173'}${link}` : null;
    const text = actionUrl ? `${message}\n\nTake action: ${actionUrl}` : message;
    const actionButton = actionUrl
      ? `<p><a href="${actionUrl}" style="display:inline-block;padding:10px 16px;background:#ff6a00;color:#fff;text-decoration:none;border-radius:4px">Open in GengeSmart</a></p>`
      : '';
    await transporter.sendMail({
      from: '"Genge Smart System" <noreply@genge.com>',
      to: email,
      subject: title,
      text,
      html: `<h2>${title}</h2><p>${message}</p>${actionButton}`
    });
    console.log(`Notification email sent to ${email}`);
  } catch (error) {
    console.error('Notification email error:', error.message);
  }
};

const sendVerificationCodeEmail = async (email, code) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Email service is not configured');
  }

  await transporter.sendMail({
    from: `"Genge Smart System" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verify your GengeSmart email',
    text: `Your GengeSmart verification code is ${code}. It expires in 10 minutes.`,
    html: `<h2>Verify your email</h2><p>Your GengeSmart verification code is <strong>${code}</strong>.</p><p>This code expires in 10 minutes.</p>`
  });
};

const sendPasswordResetCodeEmail = async (email, code) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Email service is not configured');
  }

  await transporter.sendMail({
    from: `"Genge Smart System" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your GengeSmart password reset code',
    text: `Your GengeSmart password reset code is ${code}. It expires in 10 minutes.`,
    html: `<h2>Reset your password</h2><p>Your password reset code is <strong>${code}</strong>.</p><p>This code expires in 10 minutes.</p>`
  });
};

module.exports = { sendStatusUpdateEmail, sendNotificationEmail, sendVerificationCodeEmail, sendPasswordResetCodeEmail };