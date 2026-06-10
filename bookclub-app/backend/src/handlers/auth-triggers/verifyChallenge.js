/**
 * Cognito Verify Auth Challenge Response trigger handler.
 * Validates the user's submitted passcode.
 */
exports.handler = async (event) => {
  console.log('Verify Auth Challenge Event:', JSON.stringify(event, null, 2));

  const expectedAnswer = event.request.privateChallengeParameters.answer;
  const challengeAnswer = event.request.challengeAnswer;

  if (challengeAnswer === expectedAnswer) {
    console.log('Passcode match: challenge answer is correct.');
    event.response.answerCorrect = true;
  } else {
    console.log(`Passcode mismatch: expected ${expectedAnswer}, got ${challengeAnswer}.`);
    event.response.answerCorrect = false;
  }

  return event;
};
