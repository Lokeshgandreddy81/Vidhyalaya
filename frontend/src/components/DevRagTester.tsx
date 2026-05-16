import React, { useState } from 'react';

const DevRagTester: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>('');
  const [documentId] = useState<string>(`doc-${Date.now()}`);
  const [apiKey, setApiKey] = useState<string>('');
  
  const [query, setQuery] = useState<string>('');
  const [chatLog, setChatLog] = useState<{ role: string; text: string }[]>([]);

  // The backend was hardcoded to run on port 5001 previously
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  const handleUpload = async () => {
    if (!file) {
      setStatus('Please select a PDF file first.');
      return;
    }
    
    setStatus('Uploading and Parsing... (this might take a minute)');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentId', documentId);
    formData.append('universityId', 'test-uni');

    try {
      const res = await fetch(`${API_URL}/dev/upload-textbook`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setStatus(`✅ Saved to DB! (Chunks: ${data.chunksCount})`);
      } else {
        setStatus(`❌ Error: ${data.error}`);
      }
    } catch (err: any) {
      setStatus(`❌ Network Error: ${err.message}`);
    }
  };

  const handleChat = async () => {
    if (!query) return;
    if (!apiKey) {
      alert('Please enter your Gemini API Key for BYOK testing.');
      return;
    }

    const newLog = [...chatLog, { role: 'user', text: query }];
    setChatLog(newLog);
    setQuery('');

    try {
      const res = await fetch(`${API_URL}/dev/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          documentId,
          userApiKey: apiKey
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        setChatLog([...newLog, { role: 'sara', text: data.answer }]);
      } else {
        setChatLog([...newLog, { role: 'sara', text: `Error: ${data.error}` }]);
      }
    } catch (err: any) {
      setChatLog([...newLog, { role: 'sara', text: `Network Error: ${err.message}` }]);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto font-sans h-screen overflow-y-auto">
      <h1 className="text-3xl font-bold mb-6 text-indigo-700">RAG Engine Dev Tester</h1>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
        <h2 className="text-xl font-semibold mb-4">1. Ingestion Pipeline (Upload PDF)</h2>
        <div className="flex gap-4 items-center flex-wrap">
          <input 
            type="file" 
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />
          <button 
            onClick={handleUpload}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 whitespace-nowrap"
          >
            Process PDF
          </button>
        </div>
        {status && <p className="mt-4 font-mono text-sm text-slate-700 p-3 bg-slate-50 rounded-lg">{status}</p>}
        <p className="mt-2 text-xs text-slate-400">Target Document ID: {documentId}</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-semibold mb-4">2. Query Pipeline (Chat)</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">BYOK (Bring Your Own Key):</label>
          <input 
            type="password" 
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter Gemini API Key (Required for chat)"
            className="w-full p-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>

        <div className="bg-slate-50 h-80 overflow-y-auto p-4 rounded-lg border border-slate-200 mb-4 flex flex-col gap-3">
          {chatLog.length === 0 && <p className="text-slate-400 text-sm text-center italic mt-auto mb-auto">Ask a question based on the uploaded document...</p>}
          {chatLog.map((msg, i) => (
            <div key={i} className={`p-3 rounded-lg max-w-[85%] ${msg.role === 'user' ? 'bg-indigo-600 text-white self-end' : 'bg-white border border-slate-200 text-slate-800 self-start shadow-sm'}`}>
              <strong className="block text-xs opacity-75 mb-1">{msg.role === 'user' ? 'You' : 'SARA'}</strong>
              <div className="text-sm whitespace-pre-wrap">{msg.text}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input 
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleChat()}
            placeholder="Ask SARA about the document..."
            className="flex-1 p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button 
            onClick={handleChat}
            className="bg-slate-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-slate-800"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default DevRagTester;
