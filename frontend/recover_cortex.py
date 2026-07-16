import json

log_file = '/Users/lokeshgandreddy/.gemini/antigravity/brain/afdf008d-bff6-439b-b55f-f1bbb7e8de1d/.system_generated/logs/transcript_full.jsonl'
with open(log_file, 'r') as f:
    lines = f.readlines()

for line in reversed(lines):
    data = json.loads(line)
    if 'tool_calls' in data:
        for tool_call in data['tool_calls']:
            if tool_call['name'] == 'default_api:view_file' or tool_call['name'] == 'view_file':
                args = tool_call.get('args', {})
                if 'CortexChat.tsx' in args.get('AbsolutePath', ''):
                    print("Found view_file call for CortexChat.tsx!")
            if tool_call['name'] == 'default_api:replace_file_content' or tool_call['name'] == 'replace_file_content':
                args = tool_call.get('args', {})
                if 'CortexChat.tsx' in args.get('TargetFile', ''):
                    print(f"Found replace_file_content call for CortexChat.tsx at step {data['step_index']}")
                    
            if tool_call['name'] == 'default_api:run_command' or tool_call['name'] == 'run_command':
                pass # ignore

    if data.get('source') == 'SYSTEM' and data.get('type') == 'TOOL_RESPONSE':
        content = data.get('content', '')
        if 'CortexChat: React.FC = () => {' in content:
            print(f"Found CortexChat source code in tool response at step {data['step_index']}")
            with open('CortexChat_recovered.tsx', 'w') as out:
                out.write(content)
            break
