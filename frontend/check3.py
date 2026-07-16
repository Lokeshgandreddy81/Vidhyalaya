with open('src/pages/CortexChat.tsx') as f:
    lines = f.readlines()

for i, line in enumerate(lines[1660:1750]):
    print(f"{1661+i}: {line.rstrip()}")
