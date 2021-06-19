require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const AWS = require("aws-sdk");

const port = process.argv.slice(2)[0];
const app = express();
app.use(bodyParser.json());

const accessKeyId = process.env.ID;
const secretAccessKey = process.env.SECRET;
AWS.config.update({ accessKeyId, secretAccessKey, region: "ap-southeast-1" });
// Create an SQS service object
const sqs = new AWS.SQS({ apiVersion: "2012-11-05" }); // default SQS config
const queueUrl = process.env.SQS_QUEUE_URL;

app.post("/order", (req, res) => {
  let orderData = {
    userPhone: req.body["userPhone"],
    itemName: req.body["itemName"],
    itemPrice: req.body["itemPrice"],
    itemsQuantity: req.body["itemsQuantity"],
  };

  // Construct SQS message data from our order
  let sqsOrderData = {
    MessageAttributes: {
      userPhone: {
        DataType: "String",
        StringValue: orderData.userPhone,
      },
      itemName: {
        DataType: "String",
        StringValue: orderData.itemName,
      },
      itemPrice: {
        DataType: "Number",
        StringValue: orderData.itemPrice,
      },
      itemsQuantity: {
        DataType: "Number",
        StringValue: orderData.itemsQuantity,
      },
    },
    // Stringify the JSON contents
    MessageBody: JSON.stringify(orderData),
    // Ensure the message sent to this email isn't a duplicate
    MessageDeduplicationId: req.body["userPhone"],
    MessageGroupId: "UserOrders",
    // Set the URL to our queue
    QueueUrl: queueUrl,
  };

  sqs
    .sendMessage(sqsOrderData)
    .promise()
    .then((data) => {
      console.log(`OrdersSvc | SUCCESS: ${data.MessageId}`);
      // ! click "Poll for messages" in dashboard
      res.send(
        "Thank you for your order. Check you phone for an SMS with the confirmation details"
      );
    })
    .catch((err) => {
      console.log(`OrdersSvc | ERROR: ${err}`);
      res.send("We ran into an error. Please try again.");
    });
});

console.log(`Orders service listening on port ${port}`);
app.listen(port);
