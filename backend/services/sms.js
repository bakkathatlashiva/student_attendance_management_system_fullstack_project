const twilio = require('twilio');

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '';

let client = null;
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  try {
    client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    console.log('Twilio SMS service configured.');
  } catch (err) {
    console.error('Failed to configure Twilio:', err.message);
  }
}

async function sendSMS(to, body) {
  if (client && TWILIO_PHONE_NUMBER) {
    try {
      const message = await client.messages.create({
        body,
        from: TWILIO_PHONE_NUMBER,
        to
      });
      console.log('SMS sent successfully:', message.sid);
      return message;
    } catch (err) {
      console.error('Twilio SMS sending failed:', err.message);
    }
  }

  // Fallback Mock Log
  console.log(`\n=================== [SMS MOCK SERVICE] ===================`);
  console.log(`TO:      ${to}`);
  console.log(`BODY:    ${body}`);
  console.log(`===========================================================\n`);
  return { mockId: `mock-sms-${Date.now()}` };
}

module.exports = {
  sendSMS
};
