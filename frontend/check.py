with open('src/utils/chatUtils.tsx') as f:
    text = f.read()

def count_braces(text):
    stack = []
    for i, c in enumerate(text):
        if c == '{':
            stack.append(('{', i))
        elif c == '}':
            if stack:
                stack.pop()
            else:
                print(f"Extra }} at {i}")
    print(f"Unclosed {{: {len(stack)}")
    for _, i in stack:
        print(f"  {i}: {text[i:i+50]}")

count_braces(text)
