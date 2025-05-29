import React, { useState, useRef, useEffect, ChangeEvent } from 'react';
import { Upload, CheckCircle, AlertCircle, FileText, Music, Download } from 'lucide-react';

interface UploadStatus {
  type: 'idle' | 'uploading' | 'success' | 'error';
  message?: string;
  progress?: number;
}

interface InputMethod {
  type: 'file' | 'text';
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function FileUpload() {
  const [status, setStatus] = useState<UploadStatus>({ type: 'idle' });
  const [inputMethod, setInputMethod] = useState<InputMethod['type']>('file');
  const [lyrics, setLyrics] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollTimeoutRef = useRef<NodeJS.Timeout>();

  const downloadImage = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = 'generated_artwork.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const pollForArtwork = async () => {
    try {
      const response = await fetch(`${API_URL}/check-artwork`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      if (data.status === 'completed' && data.image_url) {
        setImageUrl(data.image_url);
        // Reset the artwork status on the server
        await fetch(`${API_URL}/reset-artwork`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        if (pollTimeoutRef.current) {
          clearTimeout(pollTimeoutRef.current);
        }
      } else {
        // Continue polling every 5 seconds if status is still pending
        pollTimeoutRef.current = setTimeout(pollForArtwork, 5000);
      }
    } catch (error) {
      console.error('Error polling for artwork:', error);
      // Continue polling even if there's an error
      pollTimeoutRef.current = setTimeout(pollForArtwork, 5000);
    }
  };

  useEffect(() => {
    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, []);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('audio/')) {
      setStatus({
        type: 'error',
        message: 'Please select an MP3 file'
      });
      return;
    }

    try {
      setStatus({ type: 'uploading', progress: 0 });
      setImageUrl(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'audio');

      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setStatus({
        type: 'success',
        message: 'File uploaded successfully! Generating artwork...'
      });

      // Start polling for artwork
      pollForArtwork();
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Upload failed'
      });
    }
  };

  const handleLyricsSubmit = async () => {
    if (!lyrics.trim()) {
      setStatus({
        type: 'error',
        message: 'Please enter some lyrics'
      });
      return;
    }

    try {
      setStatus({ type: 'uploading', progress: 0 });
      setImageUrl(null);

      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'text',
          lyrics: lyrics.trim()
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Submission failed');
      }

      setStatus({
        type: 'success',
        message: 'Lyrics submitted successfully! Generating artwork...'
      });
      setLyrics('');

      // Start polling for artwork
      pollForArtwork();
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Submission failed'
      });
    }
  };

  const resetForm = () => {
    setStatus({ type: 'idle' });
    setImageUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setLyrics('');
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
    }
  };

  const statusStyles = {
    idle: 'border-gray-300 bg-white',
    uploading: 'border-blue-300 bg-blue-50',
    success: 'border-green-300 bg-green-50',
    error: 'border-red-300 bg-red-50'
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex justify-center space-x-4 mb-6">
        <button
          onClick={() => {
            setInputMethod('file');
            resetForm();
          }}
          className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
            inputMethod === 'file'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Music className="w-4 h-4 mr-2" />
          MP3 Upload
        </button>
        <button
          onClick={() => {
            setInputMethod('text');
            resetForm();
          }}
          className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
            inputMethod === 'text'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <FileText className="w-4 h-4 mr-2" />
          Enter Lyrics
        </button>
      </div>

      {/* Display generated artwork */}
      {imageUrl && (
        <div className="mb-6 text-center">
          <div className="relative rounded-lg overflow-hidden shadow-lg">
            <img 
              src={imageUrl} 
              alt="Generated Artwork" 
              className="w-full h-auto"
            />
            <button
              onClick={() => downloadImage(imageUrl)}
              className="absolute bottom-4 right-4 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 shadow-lg transition-colors"
              title="Download Artwork"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center ${statusStyles[status.type]}`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="audio/mp3"
          className="hidden"
          disabled={inputMethod === 'text' || status.type === 'uploading' as UploadStatus['type']}
        />
        
        {status.type === 'idle' && inputMethod === 'file' && (
          <div>
            <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Select MP3 File
            </button>
            <p className="mt-2 text-sm text-gray-500">
              Upload your MP3 file to generate artwork
            </p>
          </div>
        )}

        {status.type === 'idle' && inputMethod === 'text' && (
          <div>
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <textarea
              value={lyrics}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setLyrics(e.target.value)}
              placeholder="Enter your song lyrics here..."
              className="w-full h-32 p-3 border rounded-lg mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={status.type === 'uploading' as UploadStatus['type']}
            />
            <button
              onClick={handleLyricsSubmit}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              disabled={status.type === 'uploading' as UploadStatus['type']}
            >
              Submit Lyrics
            </button>
          </div>
        )}

        {status.type === 'uploading' && (
          <div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
              <div className="bg-blue-500 h-2.5 rounded-full w-full animate-pulse"></div>
            </div>
            <p className="text-blue-600 font-medium">Processing your submission...</p>
          </div>
        )}

        {status.type === 'success' && (
          <div>
            <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
            <p className="text-green-600 font-medium">{status.message}</p>
            {imageUrl && (
              <div className="mt-4">
                <img src={imageUrl} alt="Generated Artwork" className="w-full rounded-lg shadow-md mb-4" />
                <button
                  onClick={() => downloadImage(imageUrl)}
                  className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors mx-auto"
                >
                  <Download className="w-4 h-4" />
                  Download Artwork
                </button>
              </div>
            )}
            <button
              onClick={resetForm}
              className="mt-4 bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Submit Another
            </button>
          </div>
        )}

        {status.type === 'error' && (
          <div>
            <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <p className="text-red-600 font-medium">{status.message}</p>
            <button
              onClick={resetForm}
              className="mt-4 bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}