import json

log_file = '/Users/lokeshgandreddy/.gemini/antigravity/brain/afdf008d-bff6-439b-b55f-f1bbb7e8de1d/.system_generated/logs/transcript_full.jsonl'
with open(log_file, 'r') as f:
    lines = f.readlines()

for line in reversed(lines):
    if not line.strip(): continue
    try:
        data = json.loads(line)
    except:
        continue
        
    if data.get('source') == 'SYSTEM' and data.get('type') == 'TOOL_RESPONSE':
        content = data.get('content', '')
        if 'const CortexChat: React.FC = () => {' in content and 'return (' in content and 'chatHistory.map' in content:
            print(f"Found CortexChat source code in tool response at step {data.get('step_index')}")
            with open('CortexChat_recovered.tsx', 'w') as out:
                # the content might have extra things from tool output, let's just dump it
                out.write(content)
            break
