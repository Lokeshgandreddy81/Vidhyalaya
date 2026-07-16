import json

log_file = '/Users/lokeshgandreddy/.gemini/antigravity/brain/afdf008d-bff6-439b-b55f-f1bbb7e8de1d/.system_generated/logs/transcript_full.jsonl'
with open(log_file, 'r') as f:
    lines = f.readlines()

view_response = None
for i in range(len(lines)-1, -1, -1):
    line = lines[i]
    if not line.strip(): continue
    try:
        data = json.loads(line)
    except:
        continue
    
    if data.get('type') == 'PLANNER_RESPONSE' and 'tool_calls' in data:
        for tool in data['tool_calls']:
            if tool['name'] == 'view_file' or tool['name'] == 'default_api:view_file':
                args = tool.get('args', {})
                if 'CortexChat.tsx' in args.get('AbsolutePath', ''):
                    # The next step should be the response
                    resp_line = lines[i+1]
                    resp_data = json.loads(resp_line)
                    if resp_data.get('type') == 'TOOL_RESPONSE':
                        content = resp_data.get('content', '')
                        if 'CortexChat' in content:
                            view_response = content
                            print("Found view_file response!")
                            break
        if view_response:
            break

if view_response:
    with open('CortexChat_recovered.txt', 'w') as out:
        out.write(view_response)
