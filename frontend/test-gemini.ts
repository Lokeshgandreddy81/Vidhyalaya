import { chatWithTutor } from './src/services/geminiService';

async function test() {
  try {
    console.log('Testing chatWithTutor...');
    const result = await chatWithTutor([], 'hi', 'Test Context');
    console.log('Result:', result);
  } catch (err) {
    console.error('Error during chatWithTutor:', err.message);
  }
}
test();
