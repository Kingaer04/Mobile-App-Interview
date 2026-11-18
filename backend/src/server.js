require('dotenv').config();
const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const buildRouter = require('./routes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.set('trust proxy', true);
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), { maxAge: '7d' }));
app.use('/api', buildRouter(io));
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

io.on('connection', (socket) => {
  console.log(`[socket] client connected (${io.engine.clientsCount} online)`);
  socket.on('disconnect', () => console.log(`[socket] client left (${io.engine.clientsCount} online)`));
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Citizen Reports API listening on http://0.0.0.0:${PORT}/api`);
});
