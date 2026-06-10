import fs from 'fs';
import path from 'path';

// Parse .env manually
const envPath = path.resolve('../backend/.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const geminiLine = envContent.split('\n').find(line => line.startsWith('GEMINI_API_KEY='));
const apiKey = geminiLine ? geminiLine.split('=')[1].trim() : '';

console.log('Using API key starting with:', apiKey ? apiKey.substring(0, 15) : 'undefined');

async function testGemini() {
  const model = 'models/gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`;
  
  const requestBody = {
    contents: [{ role: 'user', parts: [{ text: 'Respond with the word: HELLO' }] }]
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    console.log('Response status:', res.status);
    const text = await res.text();
    console.log('Response body:', text);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

testGemini();
