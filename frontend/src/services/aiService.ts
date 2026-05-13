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
    if (errorMsg.includes('quota') || errorMsg.includes('429')) {
      return "I've reached my current thinking capacity (API Quota Exceeded). Please check your billing or try again later.";
    }
    
    return "I'm having trouble connecting to my neural network. Please check your API key or model settings.";
  }
};
