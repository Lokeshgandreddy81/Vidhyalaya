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
            if tool['name'] == 'multi_replace_file_content':
                args = tool.get('args', {})
                if 'CortexChat.tsx' in args.get('TargetFile', ''):
                    print("Found multi_replace_file_content!")
                    for chunk in args.get('ReplacementChunks', []):
                        print("TARGET:")
                        print(chunk.get('TargetContent', ''))
                        print("REPLACEMENT:")
                        print(chunk.get('ReplacementContent', ''))
