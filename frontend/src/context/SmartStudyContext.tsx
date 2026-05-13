import React, { createContext, useContext, useState, useEffect } from 'react';
import { get, set } from 'idb-keyval';
import { api } from '../services/api';
import { ChatMessage } from '../types';

export interface StudyDocument {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
  url?: string;             // For URL-based (mock) documents — no File object needed
  isUniversityDoc?: boolean; // Flags docs injected from the university curriculum
  uploadedAt: string;
}

// Only serializable metadata — File objects cannot be stored in IndexedDB
export interface StudyDocumentMeta {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  isUniversityDoc?: boolean;
  uploadedAt: string;
}

interface SmartStudyState {
  documents: StudyDocument[];
  activeDocumentId: string | null;
  chatHistory: Record<string, ChatMessage[]>;
  isAnalyzing: boolean;
  activeHighlightContext: string | null;
  addDocument: (file: File, databaseId: string) => Promise<string>;
  addMockDocument: (id: string, name: string, url: string) => void;
  setActiveDocument: (id: string) => void;
  addChatMessage: (docId: string, message: ChatMessage) => void;
  setAnalyzing: (status: boolean) => void;
  deleteDocument: (id: string) => void;
  removeDocument: (id: string) => Promise<void>;
  setActiveHighlightContext: (text: string | null) => void;
}

const SmartStudyContext = createContext<SmartStudyState | undefined>(undefined);

// Builds the university mock docs for a given semester from the curriculum dictionary.
// This is used both at startup (re-hydration) and when switching semesters.
export const buildUniversityDocs = (
  curriculum: Record<string, Array<{ id: string; title: string; pdfUrl: string }>>,
  semester: string
): StudyDocument[] => {
  const subjects = curriculum[semester] || [];
  return subjects.map(s => ({
    id: s.id,
    name: s.title,
    size: 0,
    type: 'application/pdf',
    file: undefined as unknown as File,
    url: s.pdfUrl,
    isUniversityDoc: true,
    uploadedAt: new Date().toISOString(),
  }));
};

export const SmartStudyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [documents, setDocuments] = useState<StudyDocument[]>([]);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<Record<string, ChatMessage[]>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeHighlightContext, setActiveHighlightContext] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from IndexedDB on mount
  useEffect(() => {
    const loadState = async () => {
      try {
        const storedMeta = await get<StudyDocumentMeta[]>('smart-study-docs-meta') || [];
        const storedChats = await get<Record<string, ChatMessage[]>>('smart-study-chats') || {};
        const storedActiveId = await get<string>('smart-study-active-id') || null;

        // Re-hydrate custom docs (metadata only — File objects don't survive IndexedDB)
        const rehydrated: StudyDocument[] = storedMeta
          .filter(m => !m.isUniversityDoc) // university docs are rebuilt from localStorage below
          .map(meta => ({
            ...meta,
            file: undefined as unknown as File,
          }));

        // Inject university docs from localStorage on refresh so activeDocumentId resolves
        const isSynced = localStorage.getItem('isUniversitySynced') === 'true';
        const savedSemester = localStorage.getItem('activeSemester') || '6';
        let universityDocs: StudyDocument[] = [];
        if (isSynced) {
          // Lazy import the curriculum dict via a dynamic import-like pattern:
          // We store the curriculum in localStorage as a simple JSON key so the context
          // stays decoupled from the SmartStudy.tsx component.
          const rawCurriculum = localStorage.getItem('mockCurriculumFlat');
          if (rawCurriculum) {
            try {
              const subjects: Array<{ id: string; title: string; pdfUrl: string }> = JSON.parse(rawCurriculum);
              universityDocs = subjects.map(s => ({
                id: s.id,
                name: s.title,
                size: 0,
                type: 'application/pdf',
                file: undefined as unknown as File,
                url: s.pdfUrl,
                isUniversityDoc: true,
                uploadedAt: new Date().toISOString(),
              }));
            } catch (_) { /* ignore parse errors */ }
          }
        }

        const allDocs = [...universityDocs, ...rehydrated];
        setDocuments(allDocs);
        setChatHistory(storedChats);

        // Validate the active ID against the fully hydrated list
        const validActiveId = allDocs.some(d => d.id === storedActiveId) ? storedActiveId : null;
        setActiveDocumentId(validActiveId);
      } catch (error) {
        console.error('Failed to load Smart Study state from IndexedDB:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadState();
  }, []);

  // Persist only custom-upload metadata to IndexedDB (never File objects, never university docs)
  useEffect(() => {
    if (!isLoaded) return;
    const metaOnly: StudyDocumentMeta[] = documents
      .filter(d => !d.isUniversityDoc)
      .map(({ id, name, size, type, uploadedAt }) => ({ id, name, size, type, uploadedAt }));
    set('smart-study-docs-meta', metaOnly).catch(console.error);
    set('smart-study-chats', chatHistory).catch(console.error);
    set('smart-study-active-id', activeDocumentId).catch(console.error);
  }, [documents, chatHistory, activeDocumentId, isLoaded]);

  const addDocument = async (file: File, databaseId: string) => {
    const newDoc: StudyDocument = {
      id: databaseId,
      name: file.name,
      size: file.size,
      type: file.type,
      file,
      uploadedAt: new Date().toISOString(),
    };
    setDocuments(prev => [newDoc, ...prev]);
    setActiveDocumentId(newDoc.id);
    return newDoc.id;
  };

  // Add or activate a URL-based university mock document
  const addMockDocument = (id: string, name: string, url: string) => {
    setDocuments(prev => {
      if (prev.find(d => d.id === id)) return prev;
      const mockDoc: StudyDocument = {
        id,
        name,
        size: 0,
        type: 'application/pdf',
        file: undefined as unknown as File,
        url,
        isUniversityDoc: true,
        uploadedAt: new Date().toISOString(),
      };
      return [mockDoc, ...prev];
    });
    setActiveDocumentId(id);
  };

  const addChatMessage = (docId: string, message: ChatMessage) => {
    setChatHistory(prev => ({
      ...prev,
      [docId]: [...(prev[docId] || []), message]
    }));
  };

  const deleteDocument = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
    if (activeDocumentId === id) setActiveDocumentId(null);
  };

  const removeDocument = async (id: string) => {
    await api.deleteSmartDocument(id);
    const nextDocs = documents.filter(doc => doc.id !== id);
    setDocuments(nextDocs);
    setChatHistory(prev => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
    if (activeDocumentId === id) {
      setActiveDocumentId(null);
      await set('smart-study-active-id', null);
    }
    await set('smart-study-docs-meta', nextDocs
      .filter(d => !d.isUniversityDoc)
      .map(({ id, name, size, type, uploadedAt }) => ({ id, name, size, type, uploadedAt })));
  };

  if (!isLoaded) return null;

  return (
    <SmartStudyContext.Provider value={{
      documents,
      activeDocumentId,
      chatHistory,
      isAnalyzing,
      activeHighlightContext,
      addDocument,
      addMockDocument,
      setActiveDocument: setActiveDocumentId,
      addChatMessage,
      setAnalyzing: setIsAnalyzing,
      deleteDocument,
      removeDocument,
      setActiveHighlightContext
    }}>
      {children}
    </SmartStudyContext.Provider>
  );
};

export const useSmartStudy = () => {
  const context = useContext(SmartStudyContext);
  if (!context) throw new Error("useSmartStudy must be used within SmartStudyProvider");
  return context;
};
