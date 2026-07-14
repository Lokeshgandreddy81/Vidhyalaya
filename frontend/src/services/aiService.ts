import { api } from './api';

export const generateChatResponse = async (history: any[], newMessage: string, documentId: string, highlightedText?: string) => {
  let fullMessage = newMessage;
  if (highlightedText) {
    fullMessage = `[Highlighted Context: "${highlightedText}"]\n\n${newMessage}`;
  }

  // Convert history array to the format expected by the backend
  const apiHistory = history.map((msg: any) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    text: msg.text
  }));

  try {
    const response = await api.chatWithSmartDocument(documentId, fullMessage, apiHistory);
    return response;
  } catch (error: any) {
    console.error("Backend API Error:", error);
    
    const errorMsg = error?.message?.toLowerCase() || '';
    if (errorMsg.includes('401') || errorMsg.includes('unauthorized')) {
      return "The university's API key is missing or invalid. Please contact the administrator.";
    }
    if (errorMsg.includes('quota') || errorMsg.includes('429')) {
      return "I've reached my current thinking capacity (API Quota Exceeded). Please check your billing or try again later.";
    }
    
    return "I'm having trouble connecting to my neural network. The university's API key may not be configured properly.";
  }
};

export interface LiveScreenContext {
  activeModuleTitle?: string | null;
  activeLanguage?: string;
  editorBuffer?: string; // Content of active SandboxEditor.tsx
  lastCompilationError?: string | null; // Content from ErrorCoach.tsx / SandboxOutput.tsx
  videoState?: {
    videoId: string;
    currentTime: number;
    activeChapterTitle: string;
  } | null;
}

export const sendCortexChatMessage = async (
  message: string, 
  history: { role: string; content: string }[],
  liveContext: LiveScreenContext
) => {
  const token = localStorage.getItem('vidyal_user_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'x-byok-mode': sessionStorage.getItem('vidyal_byok_mode') || 'auto',
  };

  try {
    const rawPref = localStorage.getItem('vidyal_user_preferences');
    if (rawPref) {
      const pref = JSON.parse(rawPref);
      if (pref.pedagogicalMode) headers['x-persona-mode'] = pref.pedagogicalMode;
      if (pref.cognitivePace) headers['x-persona-pace'] = pref.cognitivePace;
      if (pref.analogyDomain) headers['x-persona-analogy'] = pref.analogyDomain;
    }
  } catch {}

  const response = await fetch('/api/chat/general', {
    method: 'POST',
    headers,
    body: JSON.stringify({ message, history, liveContext }),
  });

  return response.body; // Stream reader output handle
};

