import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Socket.IO scaffold – ready for later real-time features
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

io.on('connection', socket => {
  // Placeholder for future events (draw, text, shape, etc.)
  socket.on('disconnect', () => {});
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'Views'));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.render('main', { user: { name: 'Username' } });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`SketchWave running at http://localhost:${PORT}`);
});
