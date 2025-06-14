const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

// Create sessions directory if it doesn't exist
// For Render.com, we'll use a directory that's writable in their environment
const SESSION_DIR = process.env.NODE_ENV === 'production' 
  ? path.join('/tmp', 'whatsapp-sessions') 
  : path.join(__dirname, '../sessions');

if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

// Create public directory for QR code
const PUBLIC_DIR = path.join(__dirname, '../public');
if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

// Setup WhatsApp client
const setupWhatsAppClient = (server) => {
  let sock = null;
  let qrCode = null;
  let connectionStatus = 'disconnected';
  let messageCallbacks = [];
  let statusCallbacks = [];

  // Function to initialize WhatsApp connection
  const initializeWhatsApp = async () => {
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
    
    // Create WhatsApp socket
    sock = makeWASocket({
      printQRInTerminal: true,
      auth: state,
      logger: pino({ level: 'silent' })
    });

    // Handle connection events
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        // Generate QR code and save it
        qrCode = qr;
        await QRCode.toFile(path.join(PUBLIC_DIR, 'qrcode.png'), qr, {
          scale: 8
        });
        console.log('QR Code generated. Scan to connect.');
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error instanceof Boom)
          ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
          : true;
        
        console.log('Connection closed due to ', lastDisconnect?.error?.message);
        
        if (shouldReconnect) {
          console.log('Reconnecting...');
          initializeWhatsApp();
        } else {
          console.log('Disconnected permanently.');
          connectionStatus = 'disconnected';
        }
      } else if (connection === 'open') {
        console.log('WhatsApp connection established!');
        connectionStatus = 'connected';
        qrCode = null;
      }
    });

    // Save credentials whenever updated
    sock.ev.on('creds.update', saveCreds);

    // Handle incoming messages
    sock.ev.on('messages.upsert', async ({ messages }) => {
      for (const message of messages) {
        if (!message.key.fromMe && message.message) {
          console.log('New message received:', message);
          
          // Notify all registered callbacks
          messageCallbacks.forEach(callback => {
            try {
              callback(message);
            } catch (error) {
              console.error('Error in message callback:', error);
            }
          });
        }
      }
    });

    // Handle message status updates
    sock.ev.on('messages.update', async (updates) => {
      for (const update of updates) {
        console.log('Message status update:', update);
        
        // Notify all registered callbacks
        statusCallbacks.forEach(callback => {
          try {
            callback(update);
          } catch (error) {
            console.error('Error in status callback:', error);
          }
        });
      }
    });
  };

  // Register callbacks for incoming messages
  const onMessage = (callback) => {
    messageCallbacks.push(callback);
  };

  // Register callbacks for message status updates
  const onStatusUpdate = (callback) => {
    statusCallbacks.push(callback);
  };

  // Get current connection status and QR code
  const getStatus = () => {
    return {
      status: connectionStatus,
      qrCode: qrCode
    };
  };

  return {
    whatsappClient: {
      sendMessage: async (to, message) => {
        if (!sock || connectionStatus !== 'connected') {
          throw new Error('WhatsApp client not connected');
        }
        
        // Format the recipient ID based on whether it's a group or individual chat
        let recipientId;
        
        if (to.includes('@g.us')) {
          // It's already a properly formatted group ID
          recipientId = to;
        } else if (to.includes('@s.whatsapp.net')) {
          // It's already a properly formatted individual ID
          recipientId = to;
        } else if (to.startsWith('group:')) {
          // It's a group ID without proper formatting
          recipientId = `${to.replace('group:', '')}@g.us`;
        } else {
          // It's an individual number without proper formatting
          recipientId = `${to.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
        }
        
        try {
          console.log(`Sending message to ${recipientId}`);
          const result = await sock.sendMessage(recipientId, message);
          return result;
        } catch (error) {
          console.error('Error sending message:', error);
          throw error;
        }
      },
      sendTextMessage: async (to, text) => {
        // Use the main sendMessage function that handles group IDs
        if (!sock || connectionStatus !== 'connected') {
          throw new Error('WhatsApp client not connected');
        }
        
        // Format the recipient ID using the same logic as sendMessage
        let recipientId;
        if (to.includes('@g.us')) {
          recipientId = to;
        } else if (to.includes('@s.whatsapp.net')) {
          recipientId = to;
        } else if (to.startsWith('group:')) {
          recipientId = `${to.replace('group:', '')}@g.us`;
        } else {
          recipientId = `${to.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
        }
        
        return await sock.sendMessage(recipientId, { text });
      },
      sendImageMessage: async (to, imageBuffer, caption = '') => {
        // Format the recipient ID using the same logic as sendMessage
        let recipientId;
        if (to.includes('@g.us')) {
          recipientId = to;
        } else if (to.includes('@s.whatsapp.net')) {
          recipientId = to;
        } else if (to.startsWith('group:')) {
          recipientId = `${to.replace('group:', '')}@g.us`;
        } else {
          recipientId = `${to.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
        }
        
        return await sock.sendMessage(recipientId, {
          image: imageBuffer,
          caption: caption
        });
      },
      sendDocumentMessage: async (to, documentBuffer, fileName, mimetype) => {
        // Format the recipient ID using the same logic as sendMessage
        let recipientId;
        if (to.includes('@g.us')) {
          recipientId = to;
        } else if (to.includes('@s.whatsapp.net')) {
          recipientId = to;
        } else if (to.startsWith('group:')) {
          recipientId = `${to.replace('group:', '')}@g.us`;
        } else {
          recipientId = `${to.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
        }
        
        return await sock.sendMessage(recipientId, {
          document: documentBuffer,
          fileName,
          mimetype
        });
      },
      onMessage,
      onStatusUpdate,
      getStatus,
      logout: async () => {
        if (sock) {
          await sock.logout();
          connectionStatus = 'disconnected';
          return { success: true };
        }
        return { success: false, error: 'Not connected' };
      },
      getContacts: async () => {
        if (!sock || connectionStatus !== 'connected') {
          throw new Error('WhatsApp client not connected');
        }
        return sock.getContacts();
      },
      getGroups: async () => {
        if (!sock || connectionStatus !== 'connected') {
          throw new Error('WhatsApp client not connected');
        }
        
        try {
          // Get all chats
          const chats = await sock.groupFetchAllParticipating();
          
          // Extract and format group information
          const groups = Object.entries(chats).map(([id, chat]) => ({
            id,
            name: chat.subject,
            participants: Object.keys(chat.participants).length,
            creation: chat.creation,
            owner: chat.owner,
            desc: chat.desc
          }));
          
          return groups;
        } catch (error) {
          console.error('Error fetching groups:', error);
          throw error;
        }
      }
    },
    initializeWhatsApp
  };
};

module.exports = { setupWhatsAppClient };
