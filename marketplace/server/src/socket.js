import { Server } from 'socket.io';
import cookie from 'cookie';
import db from './db/index.js';
import { verifyToken } from './middleware/auth.js';

export function attachSocket(httpServer, corsOrigin) {
  const io = new Server(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
  });

  io.use((socket, next) => {
    try {
      const rawCookie = socket.handshake.headers.cookie || '';
      const { token } = cookie.parse(rawCookie);
      if (!token) return next(new Error('unauthorized'));
      const payload = verifyToken(token);
      socket.userId = payload.sub;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);

    socket.on('join_conversation', (conversationId) => {
      const convo = db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId);
      if (!convo || (convo.buyer_id !== socket.userId && convo.seller_id !== socket.userId)) {
        socket.emit('error_message', { error: 'Not a participant in this conversation' });
        return;
      }
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('send_message', ({ conversationId, body }) => {
      if (!body || !String(body).trim()) return;
      const convo = db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId);
      if (!convo || (convo.buyer_id !== socket.userId && convo.seller_id !== socket.userId)) {
        socket.emit('error_message', { error: 'Not a participant in this conversation' });
        return;
      }
      const info = db
        .prepare('INSERT INTO messages (conversation_id, sender_id, body) VALUES (?, ?, ?)')
        .run(conversationId, socket.userId, String(body).trim());
      const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(info.lastInsertRowid);
      const payload = {
        id: message.id,
        conversationId: message.conversation_id,
        senderId: message.sender_id,
        body: message.body,
        kind: message.kind,
        offerId: message.offer_id,
        offerStatus: null,
        offerAmountCents: null,
        createdAt: message.created_at,
      };
      io.to(`conversation:${conversationId}`).emit('new_message', payload);
    });
  });

  return io;
}
