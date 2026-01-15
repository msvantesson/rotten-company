import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USERNAME,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendRottenEmail(job: {
  recipient_email: string;
  subject: string;
  body: string;
}) {
  await transporter.sendMail({
    from: process.env.FROM_EMAIL,
    to: job.recipient_email,
    subject: job.subject,
    text: job.body,
  });
}
