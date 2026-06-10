import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../backend/.env'), override: true });

const secret = process.env.JWT_SECRET;
console.log('JWT_SECRET present:', !!secret);

if (!secret) {
  process.exit(1);
}

const token = jwt.sign({ id: 'sandbox-scholar', role: 'user' }, secret, { expiresIn: '15m', algorithm: 'HS256' });
console.log('Generated token:', token);

const res = await fetch('http://localhost:5001/api/auth/sandbox-key', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

console.log('Response status:', res.status);
const data = await res.json();
console.log('Response data:', data);
