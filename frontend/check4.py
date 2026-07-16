with open('src/pages/CortexChat.tsx') as f:
    text = f.read()

def count_braces(text, open_char='{', close_char='}'):
    stack = []
    for i, c in enumerate(text):
        if c == open_char:
            stack.append((open_char, i))
        elif c == close_char:
            if stack:
                stack.pop()
            else:
                print(f"Extra {close_char} at line {text.count(chr(10), 0, i)+1}")
    print(f"Unclosed {open_char}: {len(stack)}")
    for _, i in stack:
        line_num = text.count(chr(10), 0, i) + 1
        print(f"  Line {line_num}: {text[i:i+50]}")

count_braces(text, '{', '}')
count_braces(text, '(', ')')
count_braces(text, '<', '>')
