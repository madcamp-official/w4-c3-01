import http from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';

const port = Number(process.env.PORT || 8787);
const lounges = new Map();

function getLounge(id) {
  if (!lounges.has(id)) lounges.set(id, { strokes: new Map(), clients: new Set() });
  return lounges.get(id);
}

function send(socket, data) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(data));
}

function broadcast(lounge, data) {
  for (const client of lounge.clients) send(client, data);
}

function validId(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value);
}

function normalizeStroke(value, loungeId, userId) {
  if (!value || typeof value !== 'object' || !validId(value.id)) return null;
  if (!Array.isArray(value.points) || value.points.length < 2 || value.points.length > 5000) return null;

  const points = value.points.map((point) => {
    if (!Array.isArray(point) || point.length !== 3 || point.some((number) => !Number.isFinite(number))) return null;
    return point.map((number) => Math.round(number * 10000) / 10000);
  });
  if (points.some((point) => point === null)) return null;

  return {
    id: value.id,
    loungeId,
    userId,
    color: /^#[0-9a-fA-F]{6}$/.test(value.color) ? value.color : '#8ef0d0',
    widthMm: Math.max(4, Math.min(24, Number(value.widthMm) || 14)),
    points,
    createdAt: new Date().toISOString()
  };
}

const server = http.createServer((request, response) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (request.url === '/health') {
    response.end(JSON.stringify({ ok: true, loungeCount: lounges.size }));
    return;
  }

  const match = request.url?.match(/^\/api\/lounges\/([^/]+)\/strokes$/);
  if (request.method === 'GET' && match && validId(match[1])) {
    response.end(JSON.stringify([...getLounge(match[1]).strokes.values()]));
    return;
  }

  response.writeHead(404);
  response.end(JSON.stringify({ error: 'not_found' }));
});

const webSockets = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url || '/', `http://${request.headers.host}`);
  const loungeId = url.searchParams.get('loungeId');
  const userId = url.searchParams.get('userId');
  if (url.pathname !== '/ws' || !validId(loungeId) || !validId(userId)) {
    socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
    socket.destroy();
    return;
  }

  webSockets.handleUpgrade(request, socket, head, (webSocket) => {
    webSockets.emit('connection', webSocket, request, { loungeId, userId });
  });
});

webSockets.on('connection', (socket, _request, identity) => {
  const { loungeId, userId } = identity;
  const lounge = getLounge(loungeId);
  lounge.clients.add(socket);

  send(socket, {
    type: 'snapshot',
    strokes: [...lounge.strokes.values()],
    onlineCount: lounge.clients.size
  });
  broadcast(lounge, { type: 'presence', onlineCount: lounge.clients.size });

  socket.on('message', (buffer) => {
    if (buffer.byteLength > 2_000_000) return;
    let message;
    try {
      message = JSON.parse(buffer.toString());
    } catch {
      return;
    }

    if (message.type === 'stroke:create') {
      const stroke = normalizeStroke(message.stroke, loungeId, userId);
      if (!stroke) return;
      if (lounge.strokes.size >= 500) lounge.strokes.delete(lounge.strokes.keys().next().value);
      lounge.strokes.set(stroke.id, stroke);
      broadcast(lounge, { type: 'stroke:created', stroke });
    } else if (message.type === 'stroke:delete' && validId(message.strokeId)) {
      const stroke = lounge.strokes.get(message.strokeId);
      if (!stroke || stroke.userId !== userId) return;
      lounge.strokes.delete(message.strokeId);
      broadcast(lounge, { type: 'stroke:deleted', strokeId: message.strokeId });
    } else if (message.type === 'lounge:clear') {
      lounge.strokes.clear();
      broadcast(lounge, { type: 'lounge:cleared' });
    }
  });

  socket.on('close', () => {
    lounge.clients.delete(socket);
    broadcast(lounge, { type: 'presence', onlineCount: lounge.clients.size });
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Lounge sync server: http://0.0.0.0:${port}`);
});
