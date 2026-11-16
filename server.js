require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Cloudinary Setup
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: { folder: 'upi-screenshots', allowed_formats: ['jpg', 'jpeg', 'png', 'webp'] },
});
const upload = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Database Model
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  upiId: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'done', 'disputed'], default: 'pending' },
  utr: { type: String, default: '' },
  screenshotUrl: { type: String, default: '' },
  markedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});
const User = mongoose.model('User', userSchema);

// ============ ADMIN ROUTES ============
app.get('/api/admin/users', async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json(users);
});

app.post('/api/admin/users', async (req, res) => {
  const { name, upiId, amount } = req.body;
  const user = await User.create({ name, upiId, amount });
  res.json(user);
});

app.post('/api/admin/dispute/:id', async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { status: 'disputed', markedAt: new Date() }, { new: true });
  res.json(user);
});

// ============ CLIENT ROUTES ============
// Client dashboard data fetch karega (saari list)
app.get('/api/client/dashboard', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Client pay karega (Done dabayega)
app.post('/api/client/:id/done', upload.single('screenshot'), async (req, res) => {
  const update = { status: 'done', markedAt: new Date() };
  if (req.body.utr) update.utr = req.body.utr;
  if (req.file) update.screenshotUrl = req.file.path;
  const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });
  res.json(user);
});

// Client dispute raise karega
app.post('/api/client/:id/dispute', async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { status: 'disputed', markedAt: new Date() }, { new: true });
  res.json(user);
});

// ============ DATABASE CONNECT ============
const PORT = process.env.PORT || 3000;
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected ✅');
    app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT} 🚀`));
  })
  .catch(err => console.error('DB Error:', err));
