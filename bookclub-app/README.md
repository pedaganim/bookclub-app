# BookClub Application Directory

This directory contains the main application code for the BookClub serverless platform.

## 📖 Main Documentation

**Please see the [main README](../README.md) at the repository root for complete documentation, including:**
- Project overview and features
- Technology stack details
- Setup and deployment instructions
- User flow diagrams
- Cost effectiveness analysis
- API documentation
- [Phase 2 Roadmap](PHASE2.md)

## Quick Start

This directory contains:

- `frontend/` - React TypeScript application
- `backend/` - Serverless AWS Lambda functions  
- `deploy.sh` - Automated deployment script

## Development

For local development and detailed setup instructions, refer to the [main README](../README.md).

### Quick Commands

Backend (port 4000, auth bypassed, local file storage):
```bash
cd backend
npm install
npm run dev
```

Frontend (port 3000, points to local backend):
```bash
cd frontend
npm install
npm start
```
