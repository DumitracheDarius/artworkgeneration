import express from 'express';
import multer from 'multer';
import cors from 'cors';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
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

// Endpoint to receive image URL from Make
app.post('/artwork', (req, res) => {
  const { image_url } = req.body;
  if (!image_url) {
    return res.status(400).json({ error: 'Image URL is required' });
  }
  // Store the artwork data
  latestArtwork = {
    status: 'completed',
    image_url
  };
  res.json({ status: 'success', image_url });
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});