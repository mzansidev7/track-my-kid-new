// const axios = require("axios");

// const SMS_URL = "https://rest.smsportal.com/v3/BulkMessages";

// async function sendSms({ phone: any, message: any }) {
//   const clientId = process.env.SMSPORTAL_CLIENT_ID;
//   const apiSecret = process.env.SMSPORTAL_API_SECRET;

//   if (!clientId || !apiSecret) {
//     throw new Error("SMSPortal credentials are missing");
//   }

//   const credentials = Buffer.from(`${clientId}:${apiSecret}`).toString(
//     "base64",
//   );

//   const response = await axios.post(
//     SMS_URL,
//     {
//       messages: [
//         {
//           content: message,
//           destination: phone,
//         },
//       ],
//       sendOptions: {
//         testMode: process.env.SMSPORTAL_TEST_MODE === "true",
//       },
//     },
//     {
//       headers: {
//         Authorization: `Basic ${credentials}`,
//         "Content-Type": "application/json",
//         Accept: "application/json",
//       },
//       timeout: 15000,
//     },
//   );

//   return response.data;
// }

// module.exports = { sendSms };
