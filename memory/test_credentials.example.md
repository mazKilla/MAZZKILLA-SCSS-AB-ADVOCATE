# Test Credentials — EXAMPLE TEMPLATE
# Copy this file to test_credentials.md and fill in real values
# DO NOT commit test_credentials.md — it is gitignored

## SCSS AB ADVOCATE

No authentication required — app is open access.

### AI Models
- **Claude Sonnet 4.5**: Set EMERGENT_LLM_KEY=<your-emergent-key> in backend/.env
- **Grok 3 (xAI)**: Set XAI_API_KEY=<your-xai-key> in backend/.env

### Database
- MongoDB: mongodb://localhost:27017 | DB: scss_advocate
- Collections: chat_sessions, chat_messages, email_references

### App URLs
- Frontend: https://neon-advocate.preview.emergentagent.com
- Backend API: https://neon-advocate.preview.emergentagent.com/api

### How to Obtain Keys
| Key | Where to Get |
|-----|-------------|
| EMERGENT_LLM_KEY | Emergent Profile → Universal Key |
| XAI_API_KEY | https://console.x.ai |
