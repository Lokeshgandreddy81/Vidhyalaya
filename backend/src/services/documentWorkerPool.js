import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function queueDocumentForProcessing(documentId, filePath, userApiKey, embedProvider = 'gemini', universityId = 'system', isSmartStudy = false) {
  return new Promise((resolve, reject) => {
    // Resolve path to backend/src/workers/docProcessor.js
    const workerPath = path.resolve(__dirname, '../workers/docProcessor.js');
    
    console.log(`[WorkerPool] Spinning up worker thread at ${workerPath} for doc ${documentId}`);
    
    const worker = new Worker(workerPath, {
      workerData: { documentId, filePath, userApiKey, embedProvider, universityId, isSmartStudy }
    });

    worker.on('message', (msg) => {
      if (msg.status === 'completed') resolve(msg.data);
      if (msg.status === 'failed') reject(new Error(msg.error));
    });

    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Worker stopped operating with exit code: ${code}`));
    });
  });
}
