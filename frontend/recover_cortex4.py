import json

log_file = '/Users/lokeshgandreddy/.gemini/antigravity/brain/afdf008d-bff6-439b-b55f-f1bbb7e8de1d/.system_generated/logs/transcript_full.jsonl'
with open(log_file, 'r') as f:
    lines = f.readlines()

for line in lines:
    if not line.strip(): continue
    try:
        data = json.loads(line)
    except:
        continue
        
    if data.get('type') == 'PLANNER_RESPONSE' and 'tool_calls' in data:
        for tool in data['tool_calls']:
            if tool['name'] == 'multi_replace_file_content' or tool['name'] == 'replace_file_content':
                args = tool.get('args', {})
                if 'CortexChat.tsx' in args.get('TargetFile', ''):
                    print(f"--- {tool['name']} ---")
                    if 'ReplacementChunks' in args:
                        for chunk in args['ReplacementChunks']:
                            if 'return (' in chunk.get('TargetContent', ''):
                                print("TARGET HAS return!")
                                print(chunk.get('TargetContent', ''))
                    else:
                        if 'return (' in args.get('TargetContent', ''):
                            print("TARGET HAS return!")
                            print(args.get('TargetContent', ''))
