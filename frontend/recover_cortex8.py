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
                    if 'ReplacementChunks' in args:
                        for chunk in args['ReplacementChunks']:
                            if 'existing functions' in chunk.get('ReplacementContent', ''):
                                print("FOUND IT! Length:", len(chunk.get('TargetContent', '')))
                                with open("CortexChat_missing_functions.txt", "w") as out:
                                    out.write(chunk.get('TargetContent', ''))
                    else:
                        if 'existing functions' in args.get('ReplacementContent', ''):
                            print("FOUND IT! Length:", len(args.get('TargetContent', '')))
                            with open("CortexChat_missing_functions.txt", "w") as out:
                                out.write(args.get('TargetContent', ''))
