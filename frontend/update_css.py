import re

with open("/Users/lokeshgandreddy/Vidhyalaya/frontend/index.css", "r") as f:
    css = f.read()

new_aurora = """
.aurora-bg-container::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.4), transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(16, 185, 129, 0.35), transparent 50%),
              radial-gradient(circle at 20% 80%, rgba(236, 72, 153, 0.35), transparent 50%);
  animation: aurora-spin 4s linear infinite;
  z-index: 0;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.5s ease-in-out;
  filter: blur(20px);
}
"""

css = re.sub(r'\.aurora-bg-container::before\s*\{[^}]*\}', new_aurora.strip(), css)

with open("/Users/lokeshgandreddy/Vidhyalaya/frontend/index.css", "w") as f:
    f.write(css)

