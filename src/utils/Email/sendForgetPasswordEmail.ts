import { createEmailTransporter } from "./emailClient";

export const sendForgetPasswordEmail = async (email: string, code: string) => {
  const transporter = createEmailTransporter();

  const mailOptions = {
    from: "Virtual Community <ezatelbery164@gmail.com>",
    to: email,
    subject: "Reset Password",
    html: html(code),
  };

  await transporter.sendMail(mailOptions);
};

const html = (code: string) => {
  return `
  <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9f9f9; border: 1px solid #eee; border-radius: 8px; max-width: 600px; margin: auto;">
    <h2 style="color: #333;">🔑 Reset Your Password</h2>
    <p style="font-size: 16px; color: #555;">
      We received a request to reset your password.<br />
      Please use the code below to proceed. This code will expire in <strong>10 minutes</strong>.
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <span style="display: inline-block; font-size: 24px; background-color: #222; color: #fff; padding: 12px 24px; border-radius: 8px; letter-spacing: 3px;">
        ${code}
      </span>
    </div>
    <p style="font-size: 14px; color: #999;">
      If you didn't request a password reset, you can ignore this email.
    </p>
    <p style="font-size: 14px; color: #bbb; text-align: center; margin-top: 40px;">
      &copy; ${new Date().getFullYear()} Virtual Community. All rights reserved.
    </p>
  </div>
`;
};
