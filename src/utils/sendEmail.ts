import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
});

export const sendPasswordResetEmail = async (
  email: string,
  resetLink: string
) => {
  await transporter.sendMail({
    from: `"CeramiCart" <${process.env.MAIL_USER}>`,
    to: email,
    subject: "CeramiCart - Reset Your Password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2>CeramiCart Password Reset</h2>

        <p>Hello,</p>

        <p>You requested to reset your CeramiCart password.</p>

        <p>Click the button below to reset your password:</p>

        <a
          href="${resetLink}"
          style="
            display:inline-block;
            padding:12px 20px;
            background:#000;
            color:#fff;
            text-decoration:none;
            border-radius:6px;
          "
        >
          Reset Password
        </a>

        <p style="margin-top:20px;">
          This link will expire in 15 minutes.
        </p>

        <p>If you did not request this password reset, you can safely ignore this email.</p>

        <p>Thanks,<br />CeramiCart Team</p>
      </div>
    `,
  });
};