const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Create routes
const routes = (whatsappClient) => {
  const router = express.Router();

  // Get connection status and QR code
  router.get('/status', (req, res) => {
    const status = whatsappClient.getStatus();
    res.json({
      success: true,
      data: {
        status: status.status,
        qrCodeAvailable: !!status.qrCode
      }
    });
  });

  // Get QR code image
  router.get('/qrcode', (req, res) => {
    const qrCodePath = path.join(__dirname, '../public/qrcode.png');
    
    if (fs.existsSync(qrCodePath)) {
      res.sendFile(qrCodePath);
    } else {
      res.status(404).json({
        success: false,
        error: 'QR code not available. WhatsApp might be already connected or not initialized yet.'
      });
    }
  });

  // Send text message
  router.post('/send/text', async (req, res) => {
    try {
      const { to, text } = req.body;
      
      if (!to || !text) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters: to, text'
        });
      }

      const result = await whatsappClient.sendTextMessage(to, text);
      
      res.json({
        success: true,
        data: {
          messageId: result.key.id,
          to: result.key.remoteJid,
          timestamp: result.messageTimestamp
        }
      });
    } catch (error) {
      console.error('Error sending text message:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Send image message
  router.post('/send/image', upload.single('image'), async (req, res) => {
    try {
      const { to, caption } = req.body;
      const imageBuffer = req.file?.buffer;
      
      if (!to || !imageBuffer) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters: to, image'
        });
      }

      const result = await whatsappClient.sendImageMessage(to, imageBuffer, caption || '');
      
      res.json({
        success: true,
        data: {
          messageId: result.key.id,
          to: result.key.remoteJid,
          timestamp: result.messageTimestamp
        }
      });
    } catch (error) {
      console.error('Error sending image message:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Send document message
  router.post('/send/document', upload.single('document'), async (req, res) => {
    try {
      const { to, fileName } = req.body;
      const documentBuffer = req.file?.buffer;
      const mimetype = req.file?.mimetype;
      
      if (!to || !documentBuffer || !fileName) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters: to, document, fileName'
        });
      }

      const result = await whatsappClient.sendDocumentMessage(
        to, 
        documentBuffer, 
        fileName, 
        mimetype || 'application/octet-stream'
      );
      
      res.json({
        success: true,
        data: {
          messageId: result.key.id,
          to: result.key.remoteJid,
          timestamp: result.messageTimestamp
        }
      });
    } catch (error) {
      console.error('Error sending document message:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Logout from WhatsApp
  router.post('/logout', async (req, res) => {
    try {
      const result = await whatsappClient.logout();
      res.json(result);
    } catch (error) {
      console.error('Error during logout:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Get contacts
  router.get('/contacts', async (req, res) => {
    try {
      const contacts = await whatsappClient.getContacts();
      res.json({
        success: true,
        data: contacts
      });
    } catch (error) {
      console.error('Error getting contacts:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
  
  // Get groups
  router.get('/groups', async (req, res) => {
    try {
      const groups = await whatsappClient.getGroups();
      res.json({
        success: true,
        data: groups
      });
    } catch (error) {
      console.error('Error getting groups:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Webhook registration for message callbacks
  router.post('/webhook', (req, res) => {
    const { url, events } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'Missing webhook URL'
      });
    }

    // Register webhook for message events
    if (events?.includes('message')) {
      whatsappClient.onMessage(async (message) => {
        try {
          await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              event: 'message',
              data: message
            })
          });
        } catch (error) {
          console.error('Error sending webhook for message:', error);
        }
      });
    }

    // Register webhook for status update events
    if (events?.includes('status')) {
      whatsappClient.onStatusUpdate(async (update) => {
        try {
          await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              event: 'status',
              data: update
            })
          });
        } catch (error) {
          console.error('Error sending webhook for status update:', error);
        }
      });
    }

    res.json({
      success: true,
      message: 'Webhook registered successfully'
    });
  });

  return router;
};

module.exports = routes;
