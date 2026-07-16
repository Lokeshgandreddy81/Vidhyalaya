const fs = require('fs');

let code = fs.readFileSync('src/pages/CortexChat.tsx', 'utf8');

// 1. Remove onDetach at line 630
code = code.replace('onDetach={onDetach}', '');

// 2. Fix chatHistory.map loop
const badLoop = `
            chatHistory.map((msg, idx) => (
              <StandaloneSaraMessageBubble
                key={idx}
                msg={msg}
                onSelectArtifact={setWorkbenchArtifact}
                isZenMode={isZenMode}
                onFixCode={(code, error) => {
                  setInputMessage(\`Fix this error:\\n\\\`\\\`\\\`\\n\${error}\\n\\\`\\\`\\\`\\nIn this code:\\n\\\`\\\`\\\`\\n\${code}\\n\\\`\\\`\\\`\`);
                  handleSendMessage();
                }}
              />
            ))`;

const goodLoop = `
            chatHistory.map((msg, idx) => (
              <StandaloneSaraMessageBubble
                key={msg.id}
                message={msg}
                index={idx}
                chatHistory={chatHistory}
                isZenMode={isZenMode}
                onSendMessage={(text) => {
                    setInputMessage(text);
                    setTimeout(() => handleSendMessage(), 50);
                }}
                onRegenerate={() => handleRegenerate(msg.id)}
                setInputMessage={setInputMessage}
                chatInputRef={chatInputRef as any}
                getActiveModelName={getActiveModelName}
                ChatMarkdownComponents={[]}
                onEditMessage={(idx, text) => handleEditMessage(msg.id, text)}
                onSelectBranch={handleSelectBranch}
                onOpenWorkbench={(code, language, title) => setWorkbenchArtifact({ code, language, title, sourceMsgId: msg.id })}
                onTogglePin={(id) => {
                  setChatHistory(prev => prev.map(m => m.id === id ? { ...m, isPinned: !m.isPinned } : m));
                }}
              />
            ))`;

code = code.replace(badLoop, goodLoop);
fs.writeFileSync('src/pages/CortexChat.tsx', code);
