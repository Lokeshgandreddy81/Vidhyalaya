with open('src/utils/chatUtils.tsx') as f:
    text = f.read()

idx = 2377
print(text[max(0, idx-100):min(len(text), idx+100)])
