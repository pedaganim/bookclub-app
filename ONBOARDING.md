# Onboarding System

This document describes the onboarding system implemented for BookClub, including email verification, first-time setup, and invite flows.

## Overview

The onboarding system provides a comprehensive user experience for new members, including:
- **Email Verification**: Ensures user email addresses are valid
- **First-Time Setup**: Guides new users through essential setup steps
- **Club Invites**: Allows existing members to invite others via email or shareable links

## Features

### 1. Email Verification

When users sign up (either via OAuth or local registration), they receive a verification email.

#### Backend Implementation

**User Model Fields:**
- `emailVerified` (boolean): Whether the email has been verified
- `verificationToken` (string): Unique token for email verification
- `onboardingCompleted` (boolean): Whether the user completed first-time setup

**API Endpoints:**
- `POST /auth/send-verification` - Resend verification email
- `POST /auth/verify-email` - Verify email with token

**Example Request:**
```bash
curl -X POST https://api.booklub.shop/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token": "abc123..."}'
```

#### Frontend Implementation

**Pages:**
- `/verify-email?token=...` - Email verification page

**Features:**
- Automatic verification on page load
- Resend verification email option
- Success/error states with appropriate messaging
- Redirect to onboarding after successful verification

### 2. First-Time Onboarding

New users are guided through a three-step wizard after email verification.

#### Steps

**Step 1: Welcome**
- Introduction to BookClub features
- Overview of what users can do

**Step 2: Profile Setup**
- Name (required)
- Bio (optional)
- Timezone selection

**Step 3: Join or Create a Club**
- Option to join an existing club with invite code
- Option to create a new club
- Can skip if user wants to explore first

#### Backend Implementation

**API Endpoint:**
- `POST /users/me/complete-onboarding` - Mark onboarding as complete

#### Frontend Implementation

**Pages:**
- `/onboarding` - Multi-step onboarding wizard

**Features:**
- Progress indicator showing current step
- Form validation
- Skip options for non-essential steps
- Redirect to library after completion

### 3. Club Invite System

Members can invite others to join their clubs via email or shareable links.

#### Invite Methods

**1. Shareable Link**
- Each club has a unique 8-character invite code
- Link format: `https://booklub.shop/invite/ABC12345`
- Copy-to-clipboard functionality

**2. Email Invitation**
- Send invites directly to email addresses
- Personalized email with club name and inviter
- Optional recipient name for personalization

#### Backend Implementation

**API Endpoints:**
- `GET /clubs/{clubId}/invite-link` - Get invite link for club
- `POST /clubs/invite` - Send email invitation

**Example Request (Get Invite Link):**
```bash
curl -X GET https://api.booklub.shop/clubs/123/invite-link \
  -H "Authorization: Bearer {token}"
```

**Example Request (Send Email Invite):**
```bash
curl -X POST https://api.booklub.shop/clubs/invite \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "clubId": "123",
    "email": "friend@example.com",
    "name": "John"
  }'
```

#### Frontend Implementation

**Pages:**
- `/invite/{inviteCode}` - Accept club invitation

**Components:**
- `InviteModal` - Modal for managing invitations
  - Generate and copy invite link
  - Send email invitations

**Features:**
- Automatic join on authenticated user click
- Redirect to login for unauthenticated users
- Store pending invite code in session for post-login processing

## Email Templates

### Verification Email

Subject: `Verify your email - BookClub`

Content:
- Personalized greeting
- Call-to-action button for verification
- Expiration notice (24 hours)
- Safety note for non-registered users

### Club Invitation Email

Subject: `{Inviter Name} invited you to join {Club Name}`

Content:
- Personalized message from inviter
- Club name and description
- Call-to-action button to accept
- Brief description of BookClub features

## User Flow Examples

### New User Flow (OAuth)

1. User signs in with Google
2. OAuth callback creates user record with `emailVerified: true` (from Google)
3. User redirected to `/onboarding`
4. User completes onboarding wizard
5. User redirected to `/library`

### New User Flow (Email Invite)

1. User clicks invite link without being logged in
2. Invite code stored in session
3. User redirected to login
4. After login, invite code retrieved from session
5. User automatically joins club
6. User redirected to `/onboarding`
7. User completes onboarding
8. User redirected to clubs page

### Existing User Flow (Invite)

1. Club admin opens InviteModal from club settings
2. Admin copies invite link or sends email
3. Recipient clicks link
4. If authenticated, automatically joins club
5. Success message and redirect to clubs

## Configuration

### Environment Variables

Backend:
- `FRONTEND_URL` - Frontend base URL for generating links (default: `http://localhost:3000`)
- `NOTIFY_FROM_EMAIL` - Email address for sending notifications (default: `notify@booklub.shop`)
- `ADMIN_NOTIFY_EMAIL` - Admin email for new user notifications

Frontend:
- `REACT_APP_API_URL` - Backend API base URL

## Security Considerations

1. **Verification Tokens**: Generated using UUID v4 for uniqueness
2. **Email Validation**: Server-side email format validation
3. **Authorization**: All invite operations require authentication
4. **Member Verification**: Only club members can generate invites
5. **Token Expiration**: Verification emails should expire after 24 hours (implemented in future iteration)

## Testing

All onboarding features are covered by comprehensive tests:

- Unit tests for handlers: `verifyEmail.test.js`, `completeOnboarding.test.js`, `getInviteLink.test.js`
- Unit tests for user model: Email verification and onboarding methods
- Integration tests ensure proper flow through the system

Run tests:
```bash
cd bookclub-app/backend
npm test
```

## Future Enhancements

1. **Token Expiration**: Add 24-hour expiration for verification tokens
2. **Invite Analytics**: Track invite acceptance rates
3. **Custom Invite Messages**: Allow personalized messages in email invites
4. **Invite Limits**: Rate limiting for invite sending
5. **Onboarding Customization**: Allow users to customize their onboarding experience
6. **Multi-language Support**: Translate onboarding content and emails
7. **Onboarding Progress Tracking**: Analytics on drop-off points

## Support

For questions or issues related to the onboarding system, please:
1. Check the CHANGELOG.md for recent updates
2. Review test files for implementation examples
3. Create an issue on GitHub with the `onboarding` label
