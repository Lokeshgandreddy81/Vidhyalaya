import { GoogleGenAI } from '@google/genai';

let aiInstance = null;

function getAI() {
  if (!aiInstance) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set in environment variables");
    }
    aiInstance = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiInstance;
}

export const uploadDocumentToGemini = async (filePath, mimeType) => {
  const ai = getAI();

  // FIX 1: @google/genai v1.52 requires mimeType inside config, not at the top level
  let uploadResult = await ai.files.upload({
    file: filePath,
    config: { mimeType: mimeType }
  });

  console.log('Gemini upload response:', JSON.stringify({ name: uploadResult.name, state: uploadResult.state, uri: uploadResult.uri }));

  // FIX 2: Guard against undefined name before entering the polling loop
  if (!uploadResult.name) {
    throw new Error('Gemini upload returned no file name. Upload may have failed silently.');
  }

  // Poll until the file is active (not PROCESSING)
  while (uploadResult.state === 'PROCESSING') {
    console.log(`File ${uploadResult.name} is still PROCESSING, polling in 2s...`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    uploadResult = await ai.files.get({ name: uploadResult.name });
  }

  if (uploadResult.state === 'FAILED') {
    throw new Error('Document processing failed on Gemini servers.');
  }

  console.log(`File ${uploadResult.name} is ACTIVE and ready.`);

  return {
    uri: uploadResult.uri,
    name: uploadResult.name
  };
};

export const deleteDocumentFromGemini = async (geminiFileName) => {
  const ai = getAI();
  await ai.files.delete({ name: geminiFileName });
};

export const askDocument = async (fileUri, userMessage, chatHistory = []) => {
  const ai = getAI();
  const model = "gemini-2.5-flash";
  const systemInstruction = `You are SARA (Smart Study Engine), a brilliant, empathetic senior peer tutor.

CORE DIRECTIVES:

Tone: You are a warm, encouraging peer. Never use robotic disclaimers like 'As an AI' or 'I am a large language model'. Speak naturally and directly.

Document Context: You will receive a physical document. All your answers MUST be grounded in this specific document. If the document doesn't contain the answer, say so, but offer to explain the concept generally.

HIGHLIGHT LOGIC:
When the user asks about a specific excerpt, adapt your response based on the text:

Single Word: Provide a clear definition and explain how it relates to the surrounding paragraph.

Dense Paragraph: Start with 'Let's translate this into plain English.' Break it down using a highly relatable real-world analogy (e.g., tech, sports, daily life).

Equation/Formula: Break down what every single variable means, the purpose of the formula, and give a quick conceptual example.

Heading: Give a structured, bulleted overview of the core concepts in that section.

FORMATTING & MATH RULES (STRICT):

Never write giant walls of text. Use bullet points, bold text for key terms, and short paragraphs.

You MUST use standard LaTeX formatting for all mathematical equations, variables, and formulas.

Use single dollar signs for inline math (e.g., $E=mc^2$) and double dollar signs for display block math (e.g., $$\\frac{-b\\pm \\sqrt{b^2 -4ac}}{2a}$$). Ensure there are no spaces between the dollar signs and the formula.

ADAPTIVE PEDAGOGY (The 'I Don't Get It' Protocol):

If a student indicates confusion or asks for a re-explanation, DO NOT just repeat yourself. Completely change your modality. Switch to a step-by-step micro-breakdown or a new visual analogy.

When solving math or coding problems, DO NOT dump the final answer immediately. Point out where they might have made a mistake, give them a hint, and ask them to try the next step.

THE 'SOLVE-WITH-ME' PROTOCOL (MATH, CODING, & LOGIC):

NEVER give the final answer or the complete solved code immediately. Your goal is to guide the student to find the answer themselves.

Step 1 (Assess): If a user asks to solve a problem, provide ONLY the very first step or a conceptual hint, then stop.

Step 2 (Collaborate): End your response with a direct question prompting the student to execute the next step. (e.g., 'What do you think we should do with the +5 on this side of the equation?')

Step 3 (Course Correct): If the student replies with a wrong calculation or bad code, DO NOT just give the correct answer. Point out exactly where the logic broke down (e.g., 'Your logic is flawless, but check how you distributed that negative sign in step 2.') and ask them to try that specific part again.

Exception (The Panic Button): If a student explicitly types 'Just give me the answer' or expresses severe panic/urgency, provide the final solution, but immediately offer to walk through it backward so they still learn.`;
  
  const contents = [];
  
  // Format history 
  if (chatHistory && chatHistory.length > 0) {
    chatHistory.forEach(msg => {
      // Ensure we don't pass empty text blocks
      if (msg.text) {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        });
      }
    });
  }

  // Add the current prompt alongside the file
  contents.push({
    role: 'user',
    parts: [
      { fileData: { fileUri, mimeType: "application/pdf" } },
      { text: userMessage }
    ]
  });

  const response = await ai.models.generateContent({
    model: model,
    contents: contents,
    config: {
      systemInstruction: systemInstruction,
      temperature: 0.4,
    }
  });

  return response.text;
};
