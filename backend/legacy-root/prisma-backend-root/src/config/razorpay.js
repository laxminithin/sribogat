const Razorpay = require('razorpay');
require('dotenv').config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});
console.log("🔐 Razorpay Key:", process.env.RAZORPAY_KEY_ID);
console.log("🔐 Razorpay Secret:", process.env.RAZORPAY_KEY_SECRET ? "✔ Present" : "❌ Missing");


module.exports = razorpay; 