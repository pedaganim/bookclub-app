# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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