import React from 'react';
import FileUpload from './components/FileUpload';
import { Music } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col items-center py-12 px-4">
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Music className="w-8 h-8 text-blue-500" />
          <h1 className="text-3xl font-bold text-gray-800">MP3 to Artwork Generator</h1>
        </div>
        <p className="text-gray-600 max-w-md mx-auto">
          Upload your MP3 file and we'll generate unique artwork using AI, transcribe the lyrics, and store everything safely.
        </p>
      </div>
      
      <FileUpload />
      
      <footer className="mt-auto text-center text-gray-500 text-sm">
        <p>Powered by OpenAI Whisper & DALL·E</p>
      </footer>
    </div>
  );
}

export default App;