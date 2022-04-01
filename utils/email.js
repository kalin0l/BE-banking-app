const nodemailer = require('nodemailer');


const sendEmail = async(options) => {
    // create transporter
    const transporter = nodemailer.createTransport({
        host: "smtp.mailtrap.io",
        port: 2525,
        auth: {
            user:"c85c888aeb3b2f",
            pass:"7aa6372858efb2"
        }
    })

    // Define the email options
    const mailOptions = {
        from: "Someone <ajass@test.com>",
        to: options.email,
        subject: options.subject,
        text: options.message,

    }

    // send the email with nodemailer
    try {

        transporter.sendMail(mailOptions);
    }catch(err){}

}

module.exports = sendEmail;