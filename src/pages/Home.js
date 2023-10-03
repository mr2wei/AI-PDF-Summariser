import React, { useState } from 'react';
import PDFViewer from '../components/PDFViewer.js';
import '../styles/Home.css';

export default function Home() {
  const [file, setFile] = useState(null);

  const handleFileChange = (event) => {
      const selectedFile = event.target.files[0];
      setFile(selectedFile);
  };

  return (
    <div id='content'>
        <h1>AI PDF summariser</h1>
        <div className='upload'>
            <h3>Upload PDF file</h3>
            <input type="file" onChange={handleFileChange} />
        </div>
        <div className='PDFViewer'>
            {file && <PDFViewer file={file} />}
        </div>
    </div>
  );
}