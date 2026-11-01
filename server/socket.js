const { Server } = require('socket.io');

let io = null;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
  });

  io.on('connection', (socket) => {
    socket.on('join-project', (projectId) => {
      if (projectId) {
        socket.join(`project:${projectId}`);
      }
    });

    socket.on('leave-project', (projectId) => {
      if (projectId) {
        socket.leave(`project:${projectId}`);
      }
    });

    socket.on('join-user', (userId) => {
      if (userId) {
        socket.join(`user:${userId}`);
      }
    });
  });

  return io;
};

const getIO = () => io;

module.exports = { initSocket, getIO };

