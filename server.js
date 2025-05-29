import express from 'express';
import multer from 'multer';
import cors from 'cors';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '.png');
  }
});

const upload = multer({ storage: storage });

const app = express();

// Serve static files from public directory
app.use('/public', express.static('public'));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://artworkgen.netlify.app',
  methods: ['POST', 'GET'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Store the latest artwork data
let latestArtwork = {
  status: 'pending',
  image_url: null
};

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Endpoint to receive image from Make
app.post('/artwork', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file received' });
  }

  // Generate the public URL for the image
  const imageUrl = `${process.env.BACKEND_URL || 'https://artworkgeneration.onrender.com'}/public/${req.file.filename}`;
  
  // Store the artwork data
  latestArtwork = {
    status: 'completed',
    image_url: imageUrl
  };

  res.json({ status: 'success', image_url: imageUrl });
});

// Endpoint to check artwork status
app.post('/check-artwork', (req, res) => {
  res.json(latestArtwork);
});

// Reset artwork status after successful polling
app.post('/reset-artwork', (req, res) => {
  latestArtwork = {
    status: 'pending',
    image_url: null
  };
  res.json({ status: 'success' });
});

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const webhookUrl = 'https://hook.eu2.make.com/q1bw3ginm82kj27srcfpag03x2szz8en';

    // Handle text submission
    if (!req.file && req.body.type === 'text') {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'text',
          lyrics: req.body.lyrics
        }),
      });

      if (!response.ok) {
        throw new Error(`Webhook error: ${response.statusText}`);
      }

      return res.json({ message: 'Lyrics submitted successfully!' });
    }

    // Handle file upload
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!req.file.mimetype.includes('audio/')) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Please upload an audio file' });
    }

    const formData = new FormData();
    formData.append('type', 'audio');
    formData.append('file', fs.createReadStream(req.file.path), {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const response = await fetch(webhookUrl, {
      method: 'POST',
      body: formData,
    });

    // Clean up the uploaded file
    fs.unlinkSync(req.file.path);

    if (!response.ok) {
      throw new Error(`Webhook error: ${response.statusText}`);
    }

    res.json({ message: 'File uploaded successfully!' });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Error processing submission' });
  }
});

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Ensure public directory exists
if (!fs.existsSync('public')) {
  fs.mkdirSync('public');
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});