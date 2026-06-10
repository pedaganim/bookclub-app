const AWS = require('aws-sdk');

const sns = new AWS.SNS({ apiVersion: '2010-03-31' });

const isOffline = () => 
  process.env.IS_OFFLINE === 'true' || 
  process.env.SERVERLESS_OFFLINE === 'true' || 
  process.env.NODE_ENV === 'test' ||
  process.env.NODE_ENV === 'development';

exports.handler = async (event) => {
  console.log('Create Auth Challenge Event:', JSON.stringify(event, null, 2));

  let passcode;

  // We generate a new code for each attempt to prevent code replay/reuse
  // event.request.session lists previous attempts. 
  // Let's generate a 6-digit numeric passcode.
  passcode = Math.floor(100000 + Math.random() * 900000).toString();

  const phoneNumber = event.request.userAttributes.phone_number;

  if (!phoneNumber) {
    console.error('User attribute phone_number is missing.');
    throw new Error('User has no registered phone number.');
  }

  if (isOffline()) {
    // In local development or testing, use a standard code and bypass the real SNS message dispatch
    passcode = '123456';
    console.log(`[OFFLINE BYPASS] SMS OTP code is: ${passcode} for phone number: ${phoneNumber}`);
  } else {
    console.log(`Sending SMS OTP to ${phoneNumber} via SNS...`);
    try {
      await sns.publish({
        Message: `Your TownWink verification code is: ${passcode}`,
        PhoneNumber: phoneNumber,
        MessageAttributes: {
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: 'Transactional'
          }
        }
      }).promise();
      console.log('SNS SMS OTP published successfully.');
    } catch (err) {
      console.error('Failed to send SMS OTP via SNS:', err);
      throw err;
    }
  }

  // Pass private challenge parameters to VerifyAuthChallengeResponse (encrypted/hidden from the client)
  event.response.privateChallengeParameters = {
    answer: passcode
  };

  // Public parameters are sent to the client app
  // Obfuscate the phone number for display on the front-end (e.g. +******1234)
  const length = phoneNumber.length;
  const obfuscatedPhone = phoneNumber.substring(0, Math.max(0, length - 4)).replace(/\d/g, '*') + phoneNumber.substring(length - 4);
  
  event.response.publicChallengeParameters = {
    phoneNumber: obfuscatedPhone
  };

  return event;
};
