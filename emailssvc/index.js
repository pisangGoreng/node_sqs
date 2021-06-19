require("dotenv").config();
const AWS = require("aws-sdk");
const { Consumer } = require("sqs-consumer");
const nodemailer = require("nodemailer");

// Configure the region
const accessKeyId = process.env.ID;
const secretAccessKey = process.env.SECRET;
AWS.config.update({ accessKeyId, secretAccessKey, region: "ap-southeast-1" });
const queueUrl = process.env.SQS_QUEUE_URL;

// Configure Nodemailer to user Gmail
let transport = nodemailer.createTransport({
  service: "gmail",
  port: 587,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

function sendMail(message) {
  let sqsMessage = JSON.parse(message.Body);
  const emailMessage = {
    from: "sender_email_adress", // Sender address
    to: sqsMessage.userEmail, // Recipient address
    subject: "Order Received | NodeShop", // Subject line
    html: `<p>Hi ${sqsMessage.userEmail}.</p. <p>Your order of ${sqsMessage.itemsQuantity} ${sqsMessage.itemName} has been received and is being processed.</p> <p> \
 Thank you for shopping with us! </p>`, // Plain text body
  };

  return new Promise((resolve, reject) => {
    transport.sendMail(emailMessage, (err, info) => {
      if (err) {
        console.log(`EmailsSvc | ERROR: ${err}`);
        return reject(err);
      } else {
        console.log(`EmailsSvc | INFO: ${info.response}`);
        return resolve(info);
      }
    });
  });
}

function sendSMS(message) {
  let msg = JSON.parse(message.Body);
  let textMsg = `Hi ${msg.userPhone}. Your order of ${msg.itemsQuantity} ${msg.itemName} has been received and is being processed. Thank you for shopping with us!`;
  let params = {
    Message: textMsg,
    Subject: "Order Received | NodeShop",
    PhoneNumber: msg.userPhone,
  };

  const sns = new AWS.SNS({ region: "ap-southeast-1" });
  sns
    .publish(params)
    .promise()
    .then((data) => {
      console.log(`Message sent: ${data.MessageId}`);
    })
    .catch((err) => {
      console.error(err, err.stack);
    });
}

// Create our consumer
// this will automatic execute if order service is run
// if new queue SQS is created
const app = Consumer.create({
  queueUrl: queueUrl,
  handleMessage: async (message) => {
    // await sendMail(message);
    await sendSMS(message);
  },
  sqs: new AWS.SQS(),
  batchSize: 10,
});

app.on("error", (err) => {
  console.error(err.message);
});

app.on("processing_error", (err) => {
  console.error(err.message);
});

console.log("Emails || SMS service is running");
app.start();
