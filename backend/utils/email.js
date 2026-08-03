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

module.exports = { sendStatusUpdateEmail };