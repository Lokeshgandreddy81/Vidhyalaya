import React from 'react';
import { transpileTypeScriptToJs } from './typescriptTranspiler';
import { Bot } from 'lucide-react';

export interface ParsedStream {
  reasoning: string;
  text: string;
  isThinking: boolean;
  activeAgents?: string[];
  completedAgents?: string[];
  payloadData?: any;
}

export interface SkillNode {
  label: string;
  children: SkillNode[];
}

export const cleanInnerCode = (code: string): string => {
  return code.replace(/^```\w*\n/, '').replace(/\n```$/, '').trim();
};

export const formatPinnedContextBlock = (history: any[]): string => {
  const pinned = history.filter(m => m.isPinned);
  if (pinned.length === 0) return '';
  return `[USER PINNED SYSTEM CONTEXT - PERMANENT ARCHITECTURAL ANCHORS]\n` +
    `The user has explicitly pinned the following ${pinned.length} critical constraints, schema rules, and notes as permanent memory anchors. You MUST adhere strictly to these rules regardless of conversation length:\n\n` +
    pinned.map((m, i) => `ANCHOR #${i + 1} [${m.role === 'user' ? 'USER REQUIREMENT' : 'SARA SOLUTION'}]:\n${m.text}`).join('\n\n');
};

export const parseMessageWithArtifacts = (text: string) => {
  if (!text) return [{ type: 'text', content: '' }];

  // Regex to match closed <VidhyalayaArtifact> OR closed ```mermaid ... ``` blocks
  const closedRegex = /(?:<VidhyalayaArtifact\s+type="([^"]+)"(?:\s+language="([^"]+)")?(?:\s+name="([^"]+)")?>([\s\S]*?)<\/VidhyalayaArtifact>)|(?:```mermaid\s*([\s\S]*?)```)/g;
  const blocks: any[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = closedRegex.exec(text)) !== null) {
    const startIndex = match.index;
    if (startIndex > lastIndex) {
      blocks.push({
        type: 'text',
        content: text.substring(lastIndex, startIndex),
      });
    }

    const isMermaidBlock = match[5] !== undefined;

    blocks.push({
      type: 'artifact',
      artifactType: isMermaidBlock ? 'mermaid' : match[1],
      language: isMermaidBlock ? 'mermaid' : (match[2] || 'javascript'),
      name: isMermaidBlock ? 'Mermaid Diagram' : (match[3] || ''),
      content: isMermaidBlock ? match[5].trim() : match[4],
      isStreaming: false,
    });

    lastIndex = closedRegex.lastIndex;
  }

  const remainder = text.substring(lastIndex);

  // Check if remainder has an unclosed streaming artifact tag or unclosed ```mermaid block
  if (remainder) {
    const openArtifactMatch = remainder.match(/<VidhyalayaArtifact\s+type="([^"]+)"(?:\s+language="([^"]+)")?(?:\s+name="([^"]+)")?>([\s\S]*)$/i);
    const openMermaidMatch = remainder.match(/```mermaid\s*([\s\S]*)$/i);

    if (openArtifactMatch) {
      const tagIndex = remainder.indexOf(openArtifactMatch[0]);
      if (tagIndex > 0) {
        blocks.push({ type: 'text', content: remainder.substring(0, tagIndex) });
      }
      blocks.push({
        type: 'artifact',
        artifactType: openArtifactMatch[1],
        language: openArtifactMatch[2] || 'javascript',
        name: openArtifactMatch[3] || 'Live Streaming Artifact',
        content: openArtifactMatch[4],
        isStreaming: true,
      });
    } else if (openMermaidMatch) {
      const tagIndex = remainder.indexOf(openMermaidMatch[0]);
      if (tagIndex > 0) {
        blocks.push({ type: 'text', content: remainder.substring(0, tagIndex) });
      }
      blocks.push({
        type: 'artifact',
        artifactType: 'mermaid',
        language: 'mermaid',
        name: 'Live Architecture Diagram',
        content: openMermaidMatch[1],
        isStreaming: true,
      });
    } else {
      blocks.push({ type: 'text', content: remainder });
    }
  }

  return blocks.length > 0 ? blocks : [{ type: 'text', content: text }];
};

export const parseStreamBuffer = (buffer: string): ParsedStream => {
  let temp = buffer;
  let reasoning = '';
  let text = '';
  let isThinking = false;
  let activeAgents: string[] | undefined;
  let completedAgents: string[] | undefined;
  let payloadData: any = null;

  // Extract swarm_manifest if present in the stream
  const manifestMatch = temp.match(/<swarm_manifest\s+agents=([^/>\s]+|\"[^\"]*\"|'[^']*')\s*\/?>/i);
  if (manifestMatch) {
    try {
      const rawAgents = manifestMatch[1].replace(/['"]/g, '');
      activeAgents = JSON.parse(rawAgents);
    } catch {
      // Fallback manual parse if JSON fails
      const cleanRaw = manifestMatch[1].replace(/['"\[\]]/g, '').trim();
      if (cleanRaw) {
        activeAgents = cleanRaw.split(',').map(s => s.trim());
      }
    }
    // Remove the manifest tag from the text processing
    temp = temp.replace(manifestMatch[0], '');
  }

  // Extract completed/active agents from <cortex_payload> if present in the stream
  const payloadRegex = /<cortex_payload>([\s\S]*?)(?:<\/cortex_payload>|$)/i;
  const payloadMatch = temp.match(payloadRegex);
  if (payloadMatch) {
    try {
      const parsed = JSON.parse(payloadMatch[1].trim());
      if (parsed.payloadData) {
        payloadData = parsed.payloadData;
      } else {
        payloadData = parsed;
      }
      if (parsed.activeAgents && !activeAgents) {
        activeAgents = parsed.activeAgents;
      }
      if (parsed.completedAgents) {
        completedAgents = parsed.completedAgents;
      }
    } catch (e) {
      // Ignore partial JSON parsing errors
    }
    // Remove the payload tag from the text processing
    temp = temp.replace(payloadRegex, '');
  }
  
  const thinkStartIdx = temp.indexOf('<think>');
  const thinkEndIdx = temp.indexOf('</think>');
  
  if (thinkStartIdx !== -1) {
    if (thinkEndIdx !== -1) {
      reasoning = temp.substring(thinkStartIdx + 7, thinkEndIdx).trim();
      const rawText = temp.substring(thinkEndIdx + 8);
      const metadataStart = rawText.indexOf('<sara_metadata>');
      if (metadataStart !== -1) {
        text = rawText.substring(0, metadataStart).trim();
      } else {
        text = rawText.trim();
      }
    } else {
      reasoning = temp.substring(thinkStartIdx + 7).trim();
      isThinking = true;
    }
  } else {
    const metadataStart = temp.indexOf('<sara_metadata>');
    if (metadataStart !== -1) {
      text = temp.substring(0, metadataStart).trim();
    } else {
      text = temp.trim();
    }
  }
  
  return { reasoning, text, isThinking, activeAgents, completedAgents, payloadData };
};

export const formatReasoningText = (
  text: string,
  isZenMode: boolean,
  onInquire: (tag: string, content: string) => void,
  onFixCode?: (code: string, error: string) => void,
  isModelThinking: boolean = false
): React.ReactNode => {
  if (!text) return null;

  // Helper function to validate JavaScript/TypeScript code snippets
  const validateCodeSnippet = (code: string, lang: string): { success: boolean; error?: string } => {
    try {
      let codeToRun = code;
      if (lang === 'typescript' || lang === 'ts') {
        codeToRun = transpileTypeScriptToJs(code);
      }
      // Attempt compilation/parsing
      new Function(codeToRun);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const lines = text.split('\n');
  const renderedElements: React.ReactNode[] = [];
  
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockBuffer: string[] = [];
  let currentParagraphLines: string[] = [];

  // Helper to render a semantic highlighted paragraph
  const renderParagraphNode = (pLines: string[], isLastNode: boolean, idx: number) => {
    if (pLines.length === 0) return null;
    let combinedText = pLines.join('\n').trim();
    if (!combinedText) return null;

    // Semantic Highlighting logic
    // 1. Highlight inline code `like this`
    // 2. Highlight quoted strings "like this"
    
    // We'll split the text into parts to safely apply React components
    const parts = combinedText.split(/(`[^`]+`|"[^"]+")/g);
    
    return (
      <div key={`thought-node-${idx}`} className="relative pb-4">
        {/* Node Circle */}
        <div 
          className={`absolute rounded-full border-2 transition-all ${isZenMode ? 'bg-[#05070a] border-indigo-400' : 'bg-[#F9F9FB] border-indigo-500'} shadow-[0_0_8px_rgba(99,102,241,0.5)]`}
          style={{
            left: '-16px',
            top: '6px',
            width: '10px',
            height: '10px',
          }}
        />
        
        <p className={`text-[12.5px] leading-relaxed tracking-wide ${isZenMode ? 'text-slate-400' : 'text-slate-600'} m-0 whitespace-pre-wrap`}>
          {parts.map((part, i) => {
            if (part.startsWith('`') && part.endsWith('`')) {
              return <span key={i} className="px-1 py-0.5 bg-indigo-500/10 text-indigo-400 dark:text-indigo-300 rounded font-mono text-[11px] font-bold mx-0.5">{part.slice(1, -1)}</span>;
            } else if (part.startsWith('"') && part.endsWith('"')) {
              return <span key={i} className="text-emerald-600 dark:text-emerald-400 font-medium italic">{part}</span>;
            }
            return part;
          })}
          {isLastNode && isModelThinking && (
            <span className="inline-block w-1.5 h-3.5 bg-indigo-500 ml-1 translate-y-[2px] animate-pulse rounded-sm" />
          )}
        </p>
      </div>
    );
  };

  const flushParagraph = (idx: number, isLast: boolean = false) => {
    const node = renderParagraphNode(currentParagraphLines, isLast, idx);
    if (node) renderedElements.push(node);
    currentParagraphLines = [];
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    
    // Detect markdown code blocks
    const codeBlockMatch = line.match(/^```(\w*)/);
    if (codeBlockMatch) {
      if (!inCodeBlock) {
        flushParagraph(idx); // flush before entering code block
        inCodeBlock = true;
        codeBlockLang = codeBlockMatch[1] || 'javascript';
        codeBlockBuffer = [];
      } else {
        // Code block completed! Validate and render
        inCodeBlock = false;
        const codeContent = codeBlockBuffer.join('\n');
        const lang = codeBlockLang.toLowerCase();
        
        if (['javascript', 'js', 'typescript', 'ts'].includes(lang)) {
          const validation = validateCodeSnippet(codeContent, lang);
          renderedElements.push(
            <div key={`code-sandbox-verify-${idx}`} className="relative pb-4">
              <div 
                className={`absolute rounded-full border-2 ${isZenMode ? 'bg-[#05070a] border-indigo-400' : 'bg-[#F9F9FB] border-indigo-500'}`}
                style={{
                  left: '-16px',
                  top: '6px',
                  width: '10px',
                  height: '10px',
                }}
              />
              <div className="border border-slate-200/20 dark:border-white/5 rounded-lg overflow-hidden bg-slate-950 p-3 font-mono text-[11px] select-text">
                <div className="flex items-center justify-between text-indigo-400 font-sans font-bold text-[9px] uppercase tracking-wider mb-2">
                  <span>Sandbox Compiler Verification ({codeBlockLang})</span>
                  <span className={validation.success ? 'text-emerald-400' : 'text-rose-450'}>
                    {validation.success ? '● Syntax Clean' : '● Syntax Error'}
                  </span>
                </div>
                <pre className="text-slate-100 select-all overflow-x-auto whitespace-pre">{codeContent}</pre>
                {!validation.success && (
                  <div className="mt-2 text-rose-400 font-sans text-[10px] leading-normal bg-rose-500/10 border border-rose-500/20 p-2 rounded flex flex-col gap-2">
                    <div>⚠️ Linter Error: {validation.error}</div>
                    {onFixCode && (
                      <button
                        onClick={() => onFixCode(codeContent, validation.error || '')}
                        className="self-start mt-1 px-2.5 py-1 bg-indigo-500 hover:bg-indigo-650 active:scale-95 text-white font-bold rounded text-[9.5px] cursor-pointer transition-all border-none flex items-center justify-center gap-1 shadow-sm outline-none"
                      >
                        Let Auditor fix it
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        } else {
          // Render other code blocks (like Python/Go/Rust) inside the thoughts normally
          renderedElements.push(
            <div key={`code-pre-${idx}`} className="relative pb-4">
              <div 
                className={`absolute rounded-full border-2 ${isZenMode ? 'bg-[#05070a] border-indigo-400' : 'bg-[#F9F9FB] border-indigo-500'}`}
                style={{
                  left: '-16px',
                  top: '6px',
                  width: '10px',
                  height: '10px',
                }}
              />
              <pre className="font-mono text-[11.5px] leading-normal text-slate-100 bg-slate-950 p-3 rounded-lg overflow-x-auto border border-slate-800 select-text">
                {codeContent}
              </pre>
            </div>
          );
        }
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(line);
      continue;
    }

    // Advanced Thought Step & Sub-Agent Tag Parser
    const stepMatch = line.match(/^(?:[\s\-\*]*)(?:\*\*)?\[?([A-Za-z0-9_\s&\/\-]{3,60})\]?(?:\*\*)?:?\s*(.*)$/);
    const rawLine = line.trim();

    if (stepMatch && stepMatch[1] && (rawLine.startsWith('-') || rawLine.startsWith('*') || rawLine.startsWith('[') || rawLine.includes(':'))) {
      const tagTitle = stepMatch[1].trim();
      const contentRemainder = stepMatch[2] ? stepMatch[2].trim() : '';

      // Check if tag is meaningful (e.g. DECONSTRUCT THE PROBLEM, SWARM CONSENSUS DEBATE, System Architect, Auditor)
      const isMeaningfulTag = /^[A-Z0-9\s_&/\-]{3,60}$/.test(tagTitle) || 
                              /Deconstruct|Consensus|Architect|Auditor|Persona|Alternative|Synthesis|Strategy|Step/i.test(tagTitle);

      if (isMeaningfulTag) {
        flushParagraph(idx); // flush existing before new tag
        renderedElements.push(
          <div key={`agent-tag-${idx}`} className="relative pb-4 mt-2">
            <div 
              className={`absolute rounded-full border-2 ${isZenMode ? 'bg-[#05070a] border-indigo-400' : 'bg-[#F9F9FB] border-indigo-500'} shadow-[0_0_8px_rgba(99,102,241,0.5)]`}
              style={{
                left: '-16px',
                top: '12px',
                width: '10px',
                height: '10px',
              }}
            />
            <div 
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md border text-[10px] font-mono font-bold uppercase tracking-wider mb-1.5 mt-1 cursor-default select-none ${
                isZenMode
                  ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
                  : 'bg-indigo-50/70 border-indigo-500/15 text-indigo-700'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isZenMode ? 'bg-indigo-400' : 'bg-indigo-500'} animate-pulse`} />
              <span className="leading-none">{tagTitle}</span>
            </div>
            {contentRemainder && (
              <p className={`text-[12.5px] mt-1 mb-0 leading-relaxed tracking-wide ${isZenMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {contentRemainder}
              </p>
            )}
          </div>
        );
        continue;
      }
    }

    // Regular line, add to current paragraph buffer
    // Start a new paragraph if empty line
    if (rawLine === '') {
      flushParagraph(idx);
    } else {
      currentParagraphLines.push(line);
    }
  }

  // Flush any remaining text
  flushParagraph(lines.length, true); // true for isLastNode to show the cursor

  return (
    <div className="flex flex-col relative pl-5">
      {/* Seamless absolute timeline track */}
      <div 
        className="absolute top-2 bottom-4 w-[2px] transition-colors duration-300"
        style={{
          left: '8px',
          backgroundColor: isZenMode ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.15)',
        }}
      />
      {renderedElements}
    </div>
  );
};

export const getStakesPriority = (text: string): string | null => {
  if (!text) return null;
  const match = text.match(/80% of your focus should be on\s+([A-Za-z0-9_'\s`\[\]\-\+\*\/\#\.&]+)/i);
  if (match) {
    return match[1].replace(/[\[\]`\.]/g, '').trim();
  }
  return null;
};

export const classifyIntentLocally = (_message: string): string[] => {
  return [];
};

export const sanitizeSaraMessage = (text: string): string => text;

export const parseAsciiTree = (text: string): SkillNode | null => {
  if (!text) return null;
  const normalizedText = text
    .replace(/(\S)\s*(├──|└──)/g, '$1\n$2')
    .replace(/(├──|└──)\s*([^\n├└]+)(?=\s*(?:├──|└──))/g, '$1 $2\n');

  const lines = normalizedText.split('\n').map(l => l.trimEnd()).filter(l => l.trim().length > 0);
  if (lines.length === 0) return null;

  let rootLabel = "Skill Landscape";
  let startIndex = 0;
  if (!lines[0].includes('├──') && !lines[0].includes('└──') && !lines[0].includes('│') && !lines[0].includes('|')) {
    rootLabel = lines[0].replace(/Skill Tree:?/gi, '').trim() || "Skill Landscape";
    startIndex = 1;
  }

  const root: SkillNode = { label: rootLabel, children: [] };
  const stack: { node: SkillNode; depth: number }[] = [{ node: root, depth: 0 }];

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^([│||\s]*)[├└]──\s*(.*)$/);
    if (!match) {
      const cleaned = line.replace(/[├└│|─\s]+/g, '').trim();
      if (cleaned) {
        root.children.push({ label: cleaned, children: [] });
      }
      continue;
    }

    const prefix = match[1];
    const label = match[2].trim();
    const depth = Math.floor(prefix.length / 4) + 1;

    const node: SkillNode = { label, children: [] };

    while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }

    if (stack.length > 0) {
      stack[stack.length - 1].node.children.push(node);
      stack.push({ node, depth });
    } else {
      root.children.push(node);
      stack.push({ node, depth: 1 });
    }
  }

  return root;
};

export const retrieveMemoryContext = (query: string, history: any[]): string => {
  if (!history || history.length < 4) return '';

  const stopWords = new Set([
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'arent', 'as', 'at',
    'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'cant', 'cannot', 'could',
    'did', 'didnt', 'do', 'does', 'doesnt', 'doing', 'dont', 'down', 'during', 'each', 'few', 'for', 'from', 'further',
    'had', 'hadnt', 'has', 'hasnt', 'have', 'havent', 'having', 'he', 'hed', 'hell', 'hes', 'her', 'here', 'heres',
    'hers', 'herself', 'him', 'himself', 'his', 'how', 'hows', 'i', 'id', 'ill', 'im', 'ive', 'if', 'in', 'into',
    'is', 'isnt', 'it', 'its', 'itself', 'lets', 'me', 'more', 'most', 'mustnt', 'my', 'myself', 'no', 'nor', 'not',
    'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
    'same', 'shant', 'she', 'shed', 'shell', 'shes', 'should', 'shouldnt', 'so', 'some', 'such', 'than', 'that',
    'thats', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'theres', 'these', 'they', 'theyd',
    'theyll', 'theyre', 'theyve', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was',
    'wasnt', 'we', 'wed', 'well', 'were', 'weve', 'werent', 'what', 'whats', 'when', 'whens', 'where', 'wheres',
    'which', 'while', 'who', 'whos', 'whom', 'why', 'whys', 'with', 'wont', 'would', 'wouldnt', 'you', 'youd',
    'youll', 'youre', 'youve', 'your', 'yours', 'yourself', 'yourselves'
  ]);

  // Extract query keywords (words >= 3 chars, not stop words)
  const keywords = query
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !stopWords.has(w));

  if (keywords.length === 0) return '';

  const matches: { index: number; score: number }[] = [];

  // Iterate over history (skip the last 2 messages as they represent the current exchange)
  for (let i = 0; i < history.length - 2; i += 2) {
    const userMsg = history[i];
    const modelMsg = history[i + 1];
    if (!userMsg || !modelMsg || userMsg.role !== 'user') continue;

    const corpus = `${userMsg.text} ${modelMsg.text}`.toLowerCase();
    
    // Calculate keyword matching score
    let score = 0;
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const count = (corpus.match(regex) || []).length;
      score += count;
    });

    if (score > 0) {
      matches.push({ index: i, score });
    }
  }

  // Sort matches by highest score
  matches.sort((a, b) => b.score - a.score);

  if (matches.length === 0) return '';

  // Get top 2 matching exchanges
  const topMatches = matches.slice(0, 2);
  let contextBlock = `\n[RETRIEVED CONTEXT FROM HISTORICAL CONVERSATION]\n`;
  
  topMatches.forEach((m, idx) => {
    const userText = history[m.index].text;
    const modelText = history[m.index + 1].text;
    contextBlock += `Exchange #${idx + 1} (Score: ${m.score}):\n- User: "${userText.substring(0, 300)}${userText.length > 300 ? '...' : ''}"\n- Cortex: "${modelText.substring(0, 400)}${modelText.length > 400 ? '...' : ''}"\n`;
  });

  return contextBlock;
};

// ── DAG Conversation Tree Navigation Helpers ──

export const normalizeChatTreeHistory = (history: any[]): any[] => {
  if (!history || !Array.isArray(history) || history.length === 0) return [];

  // Clone to avoid mutation
  const normalized = history.map(item => ({ ...item }));

  for (let i = 0; i < normalized.length; i++) {
    const current = normalized[i];
    if (current.parentId === undefined) {
      current.parentId = i === 0 ? null : normalized[i - 1].id;
    }
    if (!current.childrenIds) {
      current.childrenIds = [];
    }
  }

  // Populate childrenIds
  for (let i = 0; i < normalized.length; i++) {
    const parentId = normalized[i].parentId;
    if (parentId) {
      const parentNode = normalized.find(n => n.id === parentId);
      if (parentNode) {
        if (!parentNode.childrenIds) parentNode.childrenIds = [];
        if (!parentNode.childrenIds.includes(normalized[i].id)) {
          parentNode.childrenIds.push(normalized[i].id);
        }
      }
    }
  }

  return normalized;
};

export const getActiveThread = (
  allMessages: any[],
  selectedChildMap: Record<string, string> = {}
): any[] => {
  if (!allMessages || allMessages.length === 0) return [];
  const normalized = normalizeChatTreeHistory(allMessages);

  // Group by parentId
  const childrenByParent = new Map<string | null, any[]>();
  for (const m of normalized) {
    const parentKey = m.parentId ?? null;
    if (!childrenByParent.has(parentKey)) {
      childrenByParent.set(parentKey, []);
    }
    childrenByParent.get(parentKey)!.push(m);
  }

  const thread: any[] = [];
  let currentParentId: string | null = null;

  while (childrenByParent.has(currentParentId)) {
    const siblings = childrenByParent.get(currentParentId)!;
    if (siblings.length === 0) break;

    const parentLookupKey = currentParentId ?? 'root';
    const selectedId = selectedChildMap[parentLookupKey];
    const activeNode = siblings.find(s => s.id === selectedId) || siblings[siblings.length - 1];

    thread.push(activeNode);
    currentParentId = activeNode.id;
  }

  return thread;
};

export const getSiblings = (allMessages: any[], msg: any): any[] => {
  if (!allMessages || !msg) return [];
  const parentKey = msg.parentId ?? null;
  return allMessages.filter(m => (m.parentId ?? null) === parentKey);
};
