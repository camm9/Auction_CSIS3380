import { createTransport } from "nodemailer";
import dotenv from 'dotenv';
dotenv.config();

//https://nodemailer.com/usage/using-gmail

const transporter = createTransport({
    service: "gmail",
    auth: {
        type: "login",
        user: process.env.Google_user,
        pass: process.env.Google_App_Password,
    },
});

await transporter.verify();
console.log("Server is ready to take our messages");