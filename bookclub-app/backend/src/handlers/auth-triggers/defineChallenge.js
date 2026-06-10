/**
 * Cognito Define Auth Challenge trigger handler.
 * Dictates the auth flow state machine.
 */
exports.handler = async (event) => {
  console.log('Define Auth Challenge Event:', JSON.stringify(event, null, 2));

  // If user is not found, fail authentication
  if (event.request.userNotFound) {
    console.log('User not found. Failing authentication.');
    event.response.issueTokens = false;
    event.response.failAuthentication = true;
    return event;
  }

  // If no sessions exist yet, present the custom challenge (SMS OTP)
  if (!event.request.session || event.request.session.length === 0) {
    console.log('No sessions exist. Presenting CUSTOM_CHALLENGE.');
    event.response.issueTokens = false;
    event.response.failAuthentication = false;
    event.response.challengeName = 'CUSTOM_CHALLENGE';
    return event;
  }

  const lastSession = event.request.session[event.request.session.length - 1];

  // If the user correctly answered the custom challenge, issue tokens
  if (lastSession.challengeName === 'CUSTOM_CHALLENGE' && lastSession.challengeResult === true) {
    console.log('Custom challenge answered correctly. Issuing tokens.');
    event.response.issueTokens = true;
    event.response.failAuthentication = false;
    return event;
  }

  // Allow up to 3 failed attempts before locking out
  if (event.request.session.length >= 3) {
    console.log('Max challenge attempts reached (3). Failing authentication.');
    event.response.issueTokens = false;
    event.response.failAuthentication = true;
    return event;
  }

  // If the last response was incorrect but attempts remain, present challenge again
  console.log('Challenge answered incorrectly. Presenting CUSTOM_CHALLENGE again.');
  event.response.issueTokens = false;
  event.response.failAuthentication = false;
  event.response.challengeName = 'CUSTOM_CHALLENGE';
  return event;
};
