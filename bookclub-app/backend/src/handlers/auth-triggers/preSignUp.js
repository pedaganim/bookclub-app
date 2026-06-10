/**
 * Cognito Pre SignUp trigger handler.
 * Automatically confirms users and marks their phone numbers/emails as verified.
 */
exports.handler = async (event) => {
  console.log('Pre SignUp Event:', JSON.stringify(event, null, 2));

  // Auto-confirm the user signup
  event.response.autoConfirmUser = true;

  // Auto-verify phone number if provided
  if (event.request.userAttributes.phone_number) {
    console.log('Auto-verifying phone number attribute.');
    event.response.autoVerifyPhone = true;
  }

  // Auto-verify email if provided
  if (event.request.userAttributes.email) {
    console.log('Auto-verifying email attribute.');
    event.response.autoVerifyEmail = true;
  }

  return event;
};
