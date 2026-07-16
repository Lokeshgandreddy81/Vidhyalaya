import json

lines = open('/Users/lokeshgandreddy/.gemini/antigravity/brain/5b9dace2-804c-4302-a220-ab01931705a7/.system_generated/logs/transcript_full.jsonl').readlines()

for i, line in enumerate(reversed(lines)):
    line = line.strip()
    if not line: continue
    try:
        data = json.loads(line)
    except:
        continue
    if 'tool_calls' in data:
        for call in data['tool_calls']:
            if call['name'] == 'replace_file_content' or call['name'] == 'multi_replace_file_content' or call['name'] == 'write_to_file':
                args = call['args']
                if isinstance(args, str):
                    try:
                        args = json.loads(args)
                    except:
                        pass
                if isinstance(args, dict) and 'CortexChat.tsx' in args.get('TargetFile', ''):
                    if call['name'] == 'multi_replace_file_content':
                        for chunk in args.get('ReplacementChunks', []):
                            if '(existing functions)' in chunk.get('ReplacementContent', ''):
                                print(f"Found truncation in multi_replace at step {data.get('step_index')}!")
                                with open('target_content.txt', 'w') as f:
                                    f.write(chunk.get('TargetContent', ''))
                                exit(0)
                    elif '(existing functions)' in args.get('ReplacementContent', '') or '(existing functions)' in args.get('CodeContent', ''):
                        print(f"Found truncation at step {data.get('step_index')}!")
                        with open('target_content.txt', 'w') as f:
                            f.write(args.get('TargetContent', ''))
                        exit(0)
