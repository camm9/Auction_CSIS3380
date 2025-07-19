const { createTransport } = require("nodemailer");
require('dotenv').config();

//https://nodemailer.com/usage/using-gmail

const transporter = createTransport({
    service: "gmail",
    auth: {
        type: "login",
        user: process.env.Google_user,
        pass: process.env.Google_App_Password,
    },
});

(async () => {
    try {
        await transporter.verify();
        console.log("Server is ready to take our messages");
    } catch (error) {
        console.error("Error verifying transporter:", error);
    }
})();

async function sendMail(to, subject, text) {
    try {
        const info = await transporter.sendMail({
            from: "admin@csis3380auction.com",
            to: to,
            subject: subject,
            text: text,
        });
        console.log("Envelope info: ", info.envelope);
        console.log("Message sent: ", info.messageId);
        return info;
    } catch (error) {
        console.error("Error sending email:", error);
        throw error;
    }
}

module.exports = { sendMail };