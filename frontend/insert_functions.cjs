const fs = require('fs');

let code = fs.readFileSync('src/pages/CortexChat.tsx', 'utf8');

const replacement = `
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = (file: File) => {
    setPendingFiles(prev => [...prev, file]);
  };
  
  const clearChatHistory = () => {
    setChatHistory([]);
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim() && pendingFiles.length === 0) return;
    
    const newUserMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      text: inputMessage,
      timestamp: Date.now()
    };
    
    setChatHistory(prev => [...prev, newUserMsg]);
    setInputMessage("");
    setPendingFiles([]);
    setIsTyping(true);
    
    // mock response
    setTimeout(() => {
      setIsTyping(false);
      setChatHistory(prev => [...prev, {
        id: uuidv4(),
        role: 'model',
        text: "I am Cortex, how can I help you?",
        timestamp: Date.now()
      }]);
    }, 1000);
  };

  const handleModelSelectChange = (modelId: string) => {
    console.log("Model selected:", modelId);
  };

  const toggleSpeechToText = () => {
    setIsRecording(!isRecording);
  };

  const handleCancelSara = () => {
    setIsTyping(false);
  };

  const handleExecutionOutput = (msgId: string, output: any) => {
    setExecutionFeedbackMap(prev => ({ ...prev, [msgId]: output }));
  };

  const handleEditMessage = (id: string, newText: string) => {
    setChatHistory(prev => prev.map(m => m.id === id ? { ...m, text: newText } : m));
  };

  const handleSelectBranch = (parentId: string, branchId: string) => {
    console.log("Branch selected", parentId, branchId);
  };

  const handleRegenerate = (id: string) => {
    console.log("Regenerate", id);
  };

  const getActiveModelName = () => "Gemini 1.5 Flash";
`;

code = code.replace('// ... (existing functions)', replacement);
fs.writeFileSync('src/pages/CortexChat.tsx', code);
