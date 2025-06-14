# WhatsApp Service API

A WhatsApp API service built with Node.js and Baileys library that provides endpoints for sending and receiving WhatsApp messages, generating QR codes for authentication, and monitoring message status.

## Features

- WhatsApp connection management with QR code generation
- Send text messages, images, and documents
- Receive incoming messages via webhooks
- Monitor message status updates
- Web interface for QR code scanning and connection status
- RESTful API for integration with other applications

## Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Start the server:

```bash
npm start
```

For development with auto-restart:

```bash
npm run dev
```

## API Endpoints

### Connection Management

- `GET /api/status` - Get the current connection status
- `GET /api/qrcode` - Get the QR code image for scanning
- `POST /api/logout` - Logout from WhatsApp

### Messaging

- `POST /api/send/text` - Send a text message
  - Body: `{ "to": "phone_number", "text": "Hello world" }`

- `POST /api/send/image` - Send an image
  - Form data: `to`, `image` (file), `caption` (optional)

- `POST /api/send/document` - Send a document
  - Form data: `to`, `document` (file), `fileName`

### Contacts

- `GET /api/contacts` - Get all contacts

### Webhooks

- `POST /api/webhook` - Register a webhook for events
  - Body: `{ "url": "https://your-webhook.com", "events": ["message", "status"] }`

## Web Interface

Open `http://localhost:3000` in your browser to access the web interface where you can:
- View the connection status
- Scan the QR code to connect your WhatsApp account
- View basic API documentation

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
PORT=3000
```

## Session Management

WhatsApp session data is stored in the `sessions` directory. This allows the service to reconnect without requiring a new QR code scan each time.

## Deployment to Render.com

Follow these steps to deploy this WhatsApp Service to Render.com:

1. Create a new Git repository and push this code to it:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin YOUR_GIT_REPO_URL
git push -u origin main
```

2. Sign up or log in to [Render.com](https://render.com)

3. Click on "New" and select "Web Service"

4. Connect your Git repository

5. Configure the service:
   - Name: whatsapp-service (or your preferred name)
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `node src/index.js`
   - Select the appropriate plan (Free tier works for testing)

6. Add the following environment variable:
   - `NODE_ENV`: `production`

7. Click "Create Web Service"

8. Once deployed, you can access your WhatsApp Service at the URL provided by Render

### Important Notes for Render.com Deployment

- The free tier of Render.com will spin down after periods of inactivity, which may disconnect your WhatsApp session
- You'll need to scan the QR code again after each deployment or when the service restarts
- Session data is stored in `/tmp/whatsapp-sessions` to work with Render.com's ephemeral filesystem
- For production use, consider upgrading to a paid plan for better reliability

## License

ISC
