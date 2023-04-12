import { createTransport } from "nodemailer";

export const sendMail = async (email, subject, text) => {
    const transport = createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        service: process.env.SMTP_SERVICE,
        auth: {
            user: process.env.SMTP_MAIL,
            pass: process.env.SMTP_PASSWORD
        }
    });

    await transport.sendMail({
        from: process.env.SMTP_MAIL,
        to: email,
        subject,
        text,
    });
}