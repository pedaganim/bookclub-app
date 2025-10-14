# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Onboarding System**: Comprehensive onboarding flows for new users
  - Email verification flow with verification tokens
  - First-time setup wizard guiding users through profile creation and club joining
  - Welcome step introducing core features
  - Profile setup step for name and bio
  - Club selection step allowing users to join or create clubs
  - Onboarding completion tracking
- **Email Verification**: Secure email verification for new sign-ups
  - Verification email sent to new users with secure token
  - Email verification page with token validation
  - Resend verification email functionality
  - User model fields: `emailVerified`, `verificationToken`, `onboardingCompleted`
- **Club Invite System**: Comprehensive invitation system for clubs
  - Generate shareable invite links with unique codes
  - Copy invite link to clipboard functionality
  - Send invitations via email with custom message
  - Invite acceptance page for new members
  - Email templates for club invitations
  - Backend handlers: `getInviteLink`, `sendInvite`
- **Backend API Endpoints**:
  - `POST /auth/send-verification` - Send verification email
  - `POST /auth/verify-email` - Verify email with token
  - `POST /users/me/complete-onboarding` - Mark onboarding as complete
  - `GET /clubs/{clubId}/invite-link` - Get club invite link
  - `POST /clubs/invite` - Send club invite via email
- **Frontend Pages**:
  - `/verify-email` - Email verification page
  - `/onboarding` - First-time setup wizard
  - `/invite/{inviteCode}` - Accept club invitation
- **UI Components**:
  - `InviteModal` - Modal for managing club invitations
  - Invite button added to club management interface
- **Notification Templates**: Email templates for verification and invites
  - Email verification template with branded styling
  - Club invitation template with personalization

### Changed
- **User Model**: Enhanced with email verification and onboarding fields
  - Users created via OAuth now set `emailVerified` based on provider claims
  - All new users have `onboardingCompleted` set to false initially
- **Authentication Flow**: Prepared for verification and onboarding checks
  - Routes configured for new onboarding pages
  - API service updated with new methods

### Testing
- Added comprehensive test coverage for onboarding features
  - Unit tests for email verification handler
  - Unit tests for onboarding completion handler
  - Unit tests for invite link generation
  - Unit tests for user model verification methods
  - All 278 backend tests passing

### Fixed
- **CORS Issue**: Fixed CORS errors that occurred after user login when the frontend sends authenticated API requests with JWT tokens
  - Added explicit support for `Authorization` header in CORS configuration
  - Replaced basic `cors: true` setting in `serverless.yml` with explicit CORS configuration
  - Added comprehensive CORS headers to all response methods in the response library

### Changed
- **Backend/Response Library**: Refactored CORS headers implementation
  - Extracted CORS headers into a shared constant (`CORS_HEADERS`) to reduce code duplication
  - All response methods now use the shared CORS headers constant for better maintainability
  - Removed redundant `Allow` header that was duplicating `Access-Control-Allow-Methods`

### Added
- **CORS Headers**: Added comprehensive CORS support including:
  - `Access-Control-Allow-Origin: *`
  - `Access-Control-Allow-Credentials: true`
  - `Access-Control-Allow-Headers: Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token`
  - `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`

## [Previous Changes]
- Initial project setup and base functionality