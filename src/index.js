const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const dotenv = require('dotenv');
const { setupWhatsAppClient } = require('./whatsapp');
const routes = require('./routes');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;
const server = createServer(app);

// For Render.com deployment
app.enable('trust proxy');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize WhatsApp client
const { whatsappClient, initializeWhatsApp } = setupWhatsAppClient(server);

// Routes
app.use('/api', routes(whatsappClient));

// Static files for QR code display
app.use(express.static('public'));

// Start server
server.listen(port, async () => {
  console.log(`Server is running on port ${port}`);
  await initializeWhatsApp();
});
