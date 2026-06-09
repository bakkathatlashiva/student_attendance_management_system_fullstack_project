const socketIo = require('socket.io');
const Notification = require('../models/notification');

let io = null;
const userSockets = {}; // Map of userId -> socketId

function init(server) {
  io = socketIo(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    // Register user socket connection mapping
    socket.on('register', (userId) => {
      if (userId) {
        userSockets[userId] = socket.id;
        console.log(`Socket registered: User ${userId} on socket ${socket.id}`);
      }
    });

    socket.on('disconnect', () => {
      // Clean registered mappings
      Object.keys(userSockets).forEach((userId) => {
        if (userSockets[userId] === socket.id) {
          delete userSockets[userId];
          console.log(`Socket disconnected: User ${userId}`);
        }
      });
    });
  });

  return io;
}

// Emits socket event and persists database notification document
async function notifyUser(userId, message, type = 'info') {
  try {
    // 1. Create and save notification document
    const notification = new Notification({
      userId,
      message,
      type
    });
    await notification.save();

    // 2. Emit Socket.io notification if online
    if (io) {
      const socketId = userSockets[userId.toString()];
      if (socketId) {
        io.to(socketId).emit('notification', notification);
        console.log(`Socket notification emitted to User ${userId}: ${message}`);
      } else {
        // Broadcast to general channels if target user is not logged in directly
        io.emit(`notification-${userId}`, notification);
      }
    }
    return notification;
  } catch (err) {
    console.error('Failed to dispatch notification:', err.message);
  }
}

module.exports = {
  init,
  notifyUser
};
