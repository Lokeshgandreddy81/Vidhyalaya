const fs = require('fs');
const path = './index.css';
let css = fs.readFileSync(path, 'utf8');

// The new theme variables to add to the @theme block
const newThemeVars = `
  --color-surface-dim: #dbdad6;
  --color-primary: #000666;
  --color-surface-container-high: #eae8e4;
  --color-primary-fixed: #e0e0ff;
  --color-error: #ba1a1a;
  --color-on-surface-variant: #454652;
  --color-on-tertiary-fixed: #1b1c1c;
  --color-tertiary-fixed-dim: #c8c6c6;
  --color-outline: #767683;
  --color-surface-bright: #fbf9f5;
  --color-surface-container-highest: #e4e2de;
  --color-secondary-fixed-dim: #accebb;
  --color-tertiary: #1b1b1b;
  --color-secondary-container: #c7ebd6;
  --color-inverse-on-surface: #f2f0ed;
  --color-on-primary-container: #8690ee;
  --color-tertiary-fixed: #e4e2e2;
  --color-on-error: #ffffff;
  --color-tertiary-container: #303030;
  --color-inverse-surface: #30312e;
  --color-on-tertiary-container: #999897;
  --color-on-background: #1b1c1a;
  --color-on-primary-fixed-variant: #343d96;
  --color-outline-variant: #c6c5d4;
  --color-on-secondary-fixed-variant: #2e4d3e;
  --color-inverse-primary: #bdc2ff;
  --color-on-secondary-container: #4b6b5b;
  --color-surface-container: #efeeea;
  --color-surface-container-lowest: #ffffff;
  --color-secondary: #456555;
  --color-error-container: #ffdad6;
  --color-on-secondary-fixed: #012114;
  --color-on-primary: #ffffff;
  --color-primary-fixed-dim: #bdc2ff;
  --color-surface-container-low: #f5f3ef;
  --color-on-tertiary: #ffffff;
  --color-on-error-container: #93000a;
  --color-secondary-fixed: #c7ebd6;
  --color-on-primary-fixed: #000767;
  --color-on-secondary: #ffffff;
  --color-surface: #fbf9f5;
  --color-surface-variant: #e4e2de;
  --color-on-tertiary-fixed-variant: #474747;
  --color-surface-tint: #4c56af;

  --font-body-md: "Inter";
  --font-headline-md: "Newsreader";
  --font-headline-sm: "Newsreader";
  --font-body-lg: "Inter";
  --font-headline-lg: "Newsreader";
  --font-label-sm: "Inter";

  --spacing-stack-lg: 6rem;
  --spacing-gutter-rule: 1.5rem;
  --spacing-unit-base: 0.5rem;
`;

// Insert the new variables into the @theme block
css = css.replace('@theme {', '@theme {' + newThemeVars);

// The new custom CSS classes
const newClasses = `
@layer utilities {
    .paper-grain {
        position: relative;
        background: linear-gradient(180deg, #fbf9f5 0%, #f7f4e9 100%);
        box-shadow: 
            0 25px 50px -12px rgba(0, 0, 0, 0.15),
            inset 0 0 100px rgba(186, 172, 115, 0.05);
    }
    .paper-grain::before {
        content: "";
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        opacity: 0.06;
        pointer-events: none;
        background-image: url(https://lh3.googleusercontent.com/aida-public/AB6AXuAZ2fg6bbk0yNemXS5u31keXuLORjYDO6FN6YUBRKoNprMYCb_gwtqo4LxVL9LqoxB486DkVsupt1ocF540ymHAdMLo_5gTGFVLso-PCxqpeKZ9WvqEBMRNIvmqRS5CjtVy85TIC7P_WBxbUjtoXeqR0UdvQ9ggWjAZLHWXMdV4QZLrq4JbadBNo8Mhiusjyylgvfx_AWBS1hheTG7a_FlYikM4d1JdC0BvqVfenC59KrLW4ftCLmF2WSNwc91EMKYQMZejbNi4kVSM);
    }
    .paper-grain::after {
        content: "Draft #4 - Synaptic Scaling Notes";
        position: absolute;
        bottom: 100px; right: 100px;
        font-family: 'Newsreader', serif;
        font-size: 80px;
        color: #000;
        opacity: 0.015;
        transform: rotate(-5deg);
        pointer-events: none;
        filter: blur(2px);
    }
    .paper-vignette {
        position: absolute;
        inset: 0;
        pointer-events: none;
        box-shadow: inset 0 0 120px rgba(139, 115, 85, 0.08);
        border-radius: 2px;
    }
    .organic-underline {
        position: relative;
        display: inline-block;
    }
    .organic-underline::after {
        content: "";
        position: absolute;
        left: -2px;
        right: -2px;
        bottom: 2px;
        height: 3px;
        background: url('data:image/svg+xml;utf8,<svg width="100%" height="3" viewBox="0 0 100 3" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><path d="M0,2 Q25,0 50,2 T100,1" stroke="rgba(69,70,82,0.4)" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-dasharray="100,5,30,2,10" /></svg>');
        background-size: 100% 100%;
        opacity: 0.7;
    }
    .tilt-03 { transform: rotate(0.15deg); }
    .tilt--03 { transform: rotate(-0.15deg); }
    
    .margin-note {
        position: absolute;
        left: -60px;
        font-family: 'Inter';
        font-size: 11px;
        color: #ba1a1a;
        opacity: 0.4;
        font-weight: 600;
        transform: rotate(-10deg);
    }
    .notebook-num {
        position: absolute;
        left: 40px;
        font-family: 'Newsreader';
        font-size: 12px;
        color: #999897;
        opacity: 0.3;
    }
    .material-symbols-outlined {
        font-variation-settings: "FILL" 0, "wght" 200, "GRAD" 0, "opsz" 20
    }
}
`;

fs.writeFileSync(path, css + '\n' + newClasses);
console.log('Updated index.css');
