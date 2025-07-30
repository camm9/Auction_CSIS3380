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
            from: "admin@csis3380auction.com", //This doesn't seem to work
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

async function sendOutbidEmail(toEmail, itemTitle, newBidAmount) {
    const subject = `You've been outbid on "${itemTitle}"`;
    const text = `Hello,

        You have been outbid on the auction item "${itemTitle}".
        The new highest bid is $${newBidAmount}.

        If you want to continue bidding, place a new bid before the auction closes.

        Thank you,
        Auction Team`;

    return sendMail(toEmail, subject, text);
}

module.exports = { sendMail, sendOutbidEmail };