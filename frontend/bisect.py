import subprocess
import os

with open('src/pages/CortexChat.tsx') as f:
    lines = f.readlines()

# The error is in 1423-1671. Let's delete smaller chunks and compile
for end in range(1671, 1423, -20):
    test_lines = lines[:1423] + lines[end:]
    with open('CortexChat_test2.tsx', 'w') as f:
        f.writelines(test_lines)
    
    res = subprocess.run(['npx', 'tsc', 'CortexChat_test2.tsx', '--noEmit', '--jsx', 'react-jsx'], capture_output=True, text=True)
    if 'CortexChat_test2.tsx' not in res.stdout:
        print(f"Compiles successfully when deleting 1423 to {end}")
        break
