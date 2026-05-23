import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

async function run() {
  const form = new FormData();
  form.append('title', 'Test Document');
  form.append('courseName', 'Test Course');
  form.append('universityId', 'test-sys');
  form.append('file', fs.createReadStream('test.pdf'));

  try {
    const res = await fetch('http://localhost:5001/api/documents/upload', {
      method: 'POST',
      body: form
    });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
  } catch (e) {
    console.error("Request failed:", e);
  }
}

run();
