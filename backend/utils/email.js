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

module.exports = { sendStatusUpdateEmail, sendNotificationEmail };