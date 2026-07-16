const fs = require('fs');

const code = fs.readFileSync('src/pages/CortexChat.tsx', 'utf8');

const missingLoop = `
      <div className="flex-1 overflow-y-auto px-4 lg:px-8 py-6 pb-32 custom-scrollbar scroll-smooth relative">
        <div className="max-w-3xl mx-auto flex flex-col justify-end min-h-full">
          {chatHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full opacity-60 mt-20">
              <Sparkles size={32} className="text-indigo-400 mb-4" />
              <p className="text-lg font-medium text-slate-700 dark:text-zinc-300">How can I help you today?</p>
            </div>
          ) : (
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
            ))
          )}
          <div ref={chatEndRef} />
        </div>
      </div>
`;

// Find where to insert it
const targetString = "        </AnimatePresence>\n\n      {/* INPUT CONTAINER */}";
let newCode = code.replace(targetString, "        </AnimatePresence>\n" + missingLoop + "\n      {/* INPUT CONTAINER */}");

fs.writeFileSync('src/pages/CortexChat.tsx', newCode);
console.log("Success!");
