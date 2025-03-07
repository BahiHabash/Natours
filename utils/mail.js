const fs = require('fs');
const nodemailer = require('nodemailer');

class Email {
    constructor(user, url) {
        this.to = user.email;
        this.userName = user.name;
        this.url = url;
        this.from = `Bahi Habash <${process.env.EMAIL_FROM}>`;
    } 

    transporter() {
        return nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD
            },
            tls: {
                rejectUnauthorized: false // Ignore self-signed certificate issues
            }
        });
    }

    async sendResetToken(subject, message) {
        let html = fs.readFileSync(`${__dirname}/../views/html-templates/resetPasswordToken.html`, 'utf-8');
        html = html.replace('{{%MESSAGE%}}', message);
        html = html.replace('{{%RESET_LINK%}}', this.url);
        html = html.replace('{{%USER_NAME%}}', this.userName);

        const mailOptions = {
            to: this.to,
            from: this.from,
            subject,
            html
        };

        await this.transporter().sendMail(mailOptions);
    }

    async sendWelcome(subject, message) {
        let html = fs.readFileSync(`${__dirname}/../views/html-templates/welcom.html`, 'utf-8');
        html = html.replace('{{%MESSAGE%}}', message);
        html = html.replace('{{%USER_NAME%}}', this.userName);
        html = html.replace('{{%HOME_PAGE_URL%}}', this.url);
        
        const mailOptions = {
            to: this.to,
            from: this.from,
            subject,
            html
        };

        await this.transporter().sendMail(mailOptions);
    }
}

module.exports = Email;





