import { createEmailTransporter } from "./emailClient";

export const sendVerifyEmail = async (EmailTo: string, code: string) => {
  const transporter = createEmailTransporter();

  await transporter.sendMail({
    from: "Virtual Community <ezatelbery164@gmail.com>",
    to: EmailTo,
    subject: "Your Verification Code",
    html: html(code),
  });
};

const html = (code: string) => {
  return `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #f9f9f9;">
    <h2 style="color: #333;">🔐 Verify Your Email</h2>
    <p style="font-size: 16px; color: #555;">
      Thank you for registering on <strong>Virtual Community</strong>.
      <br />
      Please use the following verification code to activate your account. This code will expire in <strong>10 minutes</strong>.
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <span style="display: inline-block; font-size: 24px; background-color: #222; color: #fff; padding: 12px 24px; border-radius: 8px; letter-spacing: 3px;">
        ${code}
      </span>
    </div>

    <p style="font-size: 14px; color: #999;">
      If you didn’t create an account, you can safely ignore this email.
    </p>

    <p style="font-size: 14px; color: #bbb; text-align: center; margin-top: 40px;">
      &copy; ${new Date().getFullYear()} Virtual Community. All rights reserved.
    </p>
  </div>
`;
};
