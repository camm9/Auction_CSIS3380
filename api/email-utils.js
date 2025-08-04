const { createTransport } = require("nodemailer");

// Initialize Nodemailer transporter
const transporter = createTransport({
    service: "gmail",
    auth: {
        type: "login",
        user: process.env.Google_user,
        pass: process.env.Google_App_Password,
    },
});

async function sendMail(to, subject, text) {
    try {
        const info = await transporter.sendMail({
            from: process.env.Google_user, // Use the actual Gmail address
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

async function sendWinnerEmail(winnerEmail, itemTitle, winningBid, winnerUsername) {
    const subject = `Congratulations! You won the auction for ${itemTitle}`;
    const text = `Dear ${winnerUsername},

Congratulations! You have won the auction for "${itemTitle}" with a bid of $${winningBid}.

Please visit the auction site to complete your purchase.

Thank you for participating in our auction!

Best regards,
Auction Team`;

    return sendMail(winnerEmail, subject, text);
}

module.exports = { sendMail, sendOutbidEmail, sendWinnerEmail };
