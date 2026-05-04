import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import {
  BookOpen, CheckCircle2, Copy, AlertCircle, Play, Anchor,
  Terminal, GitBranch, ShieldCheck, AlertTriangle,
  Box, Layers, Sparkles, ChevronRight, BrainCircuit, ChevronDown, Loader2
} from 'lucide-react';
import { useAppStore } from '../context/Store';
import { GeometryAnchor, ContentCitation } from '../types';

interface ContentRendererProps {
  content: string | null;
  isLoading: boolean;
  moduleTitle?: string;
  phaseName?: string;
  isCompleted?: boolean;
  onComplete?: () => void;
  onListen?: () => void;
  audioState?: 'idle' | 'loading' | 'playing' | 'paused';
  scrollRef?: React.RefObject<HTMLDivElement>;
  scrollProgress?: number;
  onRetry?: () => void;
  videoTimeline?: any[];
  activeSegmentId?: string | null;
  onTopicClick?: (topicLabel: string) => void;
  focusMode?: 'content' | 'video' | 'split';
  onToggleNeuralMap?: () => void;
  leftPanelMode?: 'content' | 'visualizer';
  nextActionLabel?: string;
  nextActionTitle?: string;
  nextActionMeta?: string;
  onNextAction?: () => void;
  citations?: ContentCitation[];
  onCitationClick?: (idx: number) => void;
}

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="flex items-center gap-1.5 text-white/40 hover:text-white/75 transition-all text-[11px] uppercase tracking-wider font-bold">
      {copied ? <CheckCircle2 size={12} className="text-emerald-400" /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
};

type GeometryShapeKind =
  | 'ENTRY_HOOK'
  | 'MINIMAL_ANCHOR'
  | 'HIERARCHY_MAP'
  | 'LIVE_TERMINAL'
  | 'GOLDEN_RULE'
  | 'DEFINITION_BOX'
  | 'WARNING_CARD'
  | 'PROCESS_FLOW'
  | 'STANDARD_VS_PRO'
  | 'COMPLEXITY_LADDER'
  | 'ARCHITECTURE_TREE'
  | 'QUICK_REVIEW_FLOW'
  | 'NEXT_CONFUSION'
  | 'GEOMETRY_CARD';

interface TreeNode {
  id: string;
  label: string;
  children: TreeNode[];
}

interface GeometryInteractionProps {
  moduleTitle?: string;
  onAnchorShape: (kind: GeometryAnchor['kind'], label: string, detail: string) => void;
  onJumpToTimeline?: (text: string) => void;
  resolveTimestamp?: (text: string) => number | undefined;
}

const SHAPE_LIBRARY: Record<GeometryShapeKind, { label: string; accent: string; bg: string; Icon: any }> = {
  ENTRY_HOOK: { label: 'Entry Hook', accent: 'text-indigo-600', bg: 'from-slate-50 to-white', Icon: Sparkles },
  MINIMAL_ANCHOR: { label: 'Minimal Anchor', accent: 'text-[#000666]', bg: 'from-slate-50 to-white', Icon: Anchor },
  HIERARCHY_MAP: { label: 'Hierarchy Map', accent: 'text-slate-600', bg: 'from-slate-50 to-white', Icon: Layers },
  LIVE_TERMINAL: { label: 'Terminal Reference', accent: 'text-slate-900', bg: 'from-slate-50 to-white', Icon: Terminal },
  GOLDEN_RULE: { label: 'Golden Rule', accent: 'text-emerald-700', bg: 'from-emerald-50/30 to-white', Icon: ShieldCheck },
  DEFINITION_BOX: { label: 'Definition', accent: 'text-[#000666]', bg: 'from-slate-50 to-white', Icon: BookOpen },
  WARNING_CARD: { label: 'Warning', accent: 'text-amber-700', bg: 'from-amber-50/30 to-white', Icon: AlertTriangle },
  PROCESS_FLOW: { label: 'Process Flow', accent: 'text-[#000666]', bg: 'from-slate-50 to-white', Icon: GitBranch },
  STANDARD_VS_PRO: { label: 'Standard vs Pro', accent: 'text-indigo-600', bg: 'from-slate-50 to-white', Icon: Box },
  COMPLEXITY_LADDER: { label: 'Complexity Ladder', accent: 'text-indigo-700', bg: 'from-slate-50 to-white', Icon: Layers },
  ARCHITECTURE_TREE: { label: 'Architecture Tree', accent: 'text-slate-700', bg: 'from-slate-50 to-white', Icon: GitBranch },
  QUICK_REVIEW_FLOW: { label: 'Mastery Checkpoint', accent: 'text-[#000666]', bg: 'from-slate-50 to-white', Icon: CheckCircle2 },
  NEXT_CONFUSION: { label: 'Next Confusion', accent: 'text-slate-400', bg: 'from-slate-50 to-white', Icon: AlertCircle },
  GEOMETRY_CARD: { label: 'Geometry Card', accent: 'text-slate-600', bg: 'from-slate-50 to-white', Icon: Box },
};

const normalizeText = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const parseStepHeading = (value: string) => {
  const match = value.match(/^Step\s+(\d+(?:\.\d+)?)\s*[—-]\s*(.+)$/i);
  if (!match) return { index: '', title: value };
  return { index: match[1], title: match[2].trim() };
};

const makeAnchorId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `anchor-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const sentenceChunks = (value: string) => {
  const chunks = value.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [value];
  return chunks.map(chunk => chunk.trim()).filter(Boolean);
};

const stripAsciiFrame = (line: string) => line
  .replace(/[╔╗╚╝║│┌┐└┘═─]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const detectShapeKind = (raw: string, language = ''): GeometryShapeKind => {
  const upper = `${language}\n${raw}`.toUpperCase();
  const explicit = upper.match(/SHAPE:\s*([A-Z_ ]+)/)?.[1]?.trim().replace(/\s+/g, '_');
  if (explicit && explicit in SHAPE_LIBRARY) return explicit as GeometryShapeKind;
  if (/TERMINAL|^\s*\$/m.test(raw) || ['terminal', 'bash', 'shell', 'zsh'].includes(language)) return 'LIVE_TERMINAL';
  if (/[├└]──/.test(raw)) return 'HIERARCHY_MAP';
  if (/GOLDEN RULE|CORE LAW|MUST/.test(upper)) return 'GOLDEN_RULE';
  if (/DEFINITION|ANCHOR/.test(upper)) return 'DEFINITION_BOX';
  if (/WARNING|PITFALL|TRAP|AVOID/.test(upper)) return 'WARNING_CARD';
  if (/LEVEL\s*[34]|COMPLEXITY|ARCHITECT/.test(upper)) return 'COMPLEXITY_LADDER';
  if (/STANDARD\s+VS\.?\s+PRO|PRO\s+VS/.test(upper)) return 'STANDARD_VS_PRO';
  if (/NEXT CONFUSION|CONFUSION PREDICTOR/.test(upper)) return 'NEXT_CONFUSION';
  if (/──>|->|STEP\s*\d/i.test(raw)) return 'PROCESS_FLOW';
  if (/╔|┌/.test(raw)) return 'GEOMETRY_CARD';
  return 'GEOMETRY_CARD';
};

const parseGeometryLines = (raw: string) => raw
  .split('\n')
  .map(line => stripAsciiFrame(line))
  .filter(line => line && !/^SHAPE:/i.test(line) && !/^(?:╔|┌).*SHAPE:/i.test(line));

const stripGeometryScaffold = (raw: string) => raw
  .split('\n')
  .map(line => {
    const trimmed = line.trim();
    if (/^[╔┌].*SHAPE:/i.test(trimmed)) return '';
    if (/^SHAPE:\s*/i.test(trimmed)) return '';
    if (/^[╔╗╚╝┌┐└┘╠╟╞╡╢╣╤╧╪═─\s]+$/.test(trimmed)) return '';
    return line
      .replace(/^\s*[║│]\s?/, '')
      .replace(/\s?[║│]\s*$/, '');
  })
  .join('\n')
  .replace(/\n{3,}/g, '\n\n');

const extractFlowSteps = (raw: string) => {
  const candidate = raw
    .split('\n')
    .map(line => line.trim())
    .find(line => /──>|->|→/.test(line))
    || parseGeometryLines(raw).find(line => /->|→/.test(line))
    || '';

  return candidate
    .split(/──>|->|→/)
    .map(step => stripAsciiFrame(step).replace(/^\s*(?:\d+[\).\s-]*)?/, '').trim())
    .filter(step => step && !/^why it matters|shape:/i.test(step))
    .slice(0, 7);
};

const InlineProcessFlow: React.FC<{
  title: string;
  steps: string[];
  subtitle?: string;
}> = ({ title, steps, subtitle }) => {
  if (steps.length === 0) return null;
  const displayTitle = normalizeText(title) === 'process flow' ? 'Ordered Steps' : title;

  return (
    <div
      data-geometry-shape="PROCESS_FLOW"
      className="my-6 border-l-2 border-[#000666]/25 bg-slate-50/60 px-4 py-3"
      style={{ breakInside: 'avoid', columnSpan: 'all' } as React.CSSProperties}
    >
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">Sequence</div>
          <h4 className="mt-0.5 text-[14px] font-black tracking-tight text-[#000666]">{displayTitle}</h4>
        </div>
        {subtitle && <div className="text-[10px] font-semibold text-slate-400">{subtitle}</div>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {steps.map((step, idx) => (
          <React.Fragment key={`${step}-${idx}`}>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-bold leading-snug text-slate-700">
              <span className="font-mono text-[10px] font-black text-[#000666]/60">{idx + 1}</span>
              {step}
            </span>
            {idx < steps.length - 1 && <span className="text-[12px] font-black text-slate-300">→</span>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

const MasteryCheckpoint: React.FC<{ moduleTitle?: string; topics?: string[] }> = ({ moduleTitle, topics = [] }) => {
  const [revealedIdx, setRevealedIdx] = useState<number | null>(null);
  const focus = topics.find(Boolean) || moduleTitle || 'this idea';
  const checks = [
    {
      label: 'Explain',
      text: `Say ${focus} in one plain sentence without using the lesson wording.`,
      insight: 'Mastery is the ability to simplify, not complicate.'
    },
    {
      label: 'Apply',
      text: 'Point to one real example where this concept changes what you would do.',
      insight: 'Knowledge is only power if it alters a decision.'
    },
    {
      label: 'Catch',
      text: 'Name the trap you are most likely to fall into, then name the recovery move.',
      insight: 'Self-correction is the highest form of expertise.'
    },
  ];

  return (
    <section
      data-learning-checkpoint="mastery"
      className="my-10 relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-8 shadow-sm"
      style={{ breakInside: 'avoid', columnSpan: 'all' } as React.CSSProperties}
    >
      <div className="absolute top-0 right-0 p-4 opacity-[0.02] text-slate-900 pointer-events-none">
        <CheckCircle2 size={120} />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between relative z-10 mb-8">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#000666] text-white shadow-lg">
            <Sparkles size={24} />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Knowledge Verify</div>
            <h4 className="mt-1 text-[20px] font-black tracking-tight text-[#000666]">Mastery Checkpoint</h4>
          </div>
        </div>
        <div className="rounded-full bg-slate-50 border border-slate-100 px-4 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
          60-second self test
        </div>
      </div>

      <div className="space-y-4 relative z-10">
        {checks.map((check, idx) => (
          <div 
            key={check.label} 
            className={`group/mastery relative rounded-2xl border transition-all duration-500 cursor-pointer ${
              revealedIdx === idx ? 'border-emerald-200 bg-white p-6 shadow-sm' : 'border-slate-100 bg-slate-50/30 p-5 hover:border-emerald-200 hover:bg-white'
            }`}
            onClick={() => setRevealedIdx(revealedIdx === idx ? null : idx)}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-black text-slate-400 group-hover/mastery:bg-emerald-500 group-hover/mastery:text-white transition-colors">
                  {idx + 1}
                </span>
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#000666]/70 group-hover/mastery:text-emerald-700">
                  {check.label}
                </span>
              </div>
              <ChevronDown 
                size={14} 
                className={`text-slate-300 transition-transform duration-500 ${revealedIdx === idx ? 'rotate-180 text-emerald-500' : ''}`} 
              />
            </div>
            
            <p className={`mt-3 m-0 text-[15px] font-medium leading-relaxed text-slate-700 transition-opacity ${revealedIdx === idx ? 'opacity-100' : 'opacity-80'}`}>
              {check.text}
            </p>

            <div className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${revealedIdx === idx ? 'max-h-24 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
              <div className="flex items-start gap-3 rounded-xl bg-emerald-50/50 p-3 border border-emerald-100/50">
                <BrainCircuit size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                <p className="text-[12px] italic text-emerald-800 font-semibold leading-snug">
                  {check.insight}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const parseTree = (raw: string): TreeNode => {
  const lines = raw.split('\n').map(line => line.replace(/\t/g, '    ')).filter(line => line.trim());
  const rootLabel = lines.find(line => !/[├└]──/.test(line))?.trim() || 'Architecture';
  const root: TreeNode = { id: 'root', label: stripAsciiFrame(rootLabel), children: [] };
  const stack: Array<{ depth: number; node: TreeNode }> = [{ depth: 0, node: root }];

  lines.forEach((line, index) => {
    if (!/[├└]──/.test(line)) return;
    const markerIndex = line.search(/[├└]──/);
    const depth = Math.floor(markerIndex / 4) + 1;
    const label = line.replace(/^.*?[├└]──\s*/, '').trim();
    const node: TreeNode = { id: `tree-${index}`, label: label || `Node ${index}`, children: [] };
    while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop();
    const parent = stack[stack.length - 1]?.node || root;
    parent.children.push(node);
    stack.push({ depth, node });
  });

  return root;
};

const ComparisonTable: React.FC<{ raw: string }> = ({ raw }) => {
  const rows = React.useMemo(() => {
    return raw.split('\n')
      .map(line => line.split('|').map(s => s.trim()))
      .filter(parts => parts.length >= 2 && parts.some(p => p.length > 0))
      .filter(parts => !parts.some(p => p.includes('----')))
      .map(parts => ({
        feature: parts[0],
        standard: parts[1] || '',
        pro: parts[2] || ''
      }));
  }, [raw]);

  if (rows.length === 0) return null;

  return (
    <div className="my-10 space-y-8">
      {rows.slice(1).map((row, i) => (
        <div key={i} className="flex flex-col md:flex-row gap-4 md:gap-12 border-b border-slate-50 pb-6 last:border-0">
          <div className="md:w-1/4">
            <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">
              {row.feature}
            </h4>
          </div>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-300 mb-2">Standard</p>
              <p className="text-[14px] leading-relaxed text-slate-500 font-medium">
                {row.standard}
              </p>
            </div>
            <div className="border-l border-slate-100 pl-8">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-indigo-500 mb-2">Entrepreneurial (Pro)</p>
              <p className="text-[15px] leading-relaxed text-[#000666] font-black tracking-tight">
                {row.pro}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const ArchitectureTree: React.FC<{ raw: string; title?: string }> = ({ raw, title }) => {
  const root = React.useMemo(() => parseTree(raw), [raw]);
  const map = React.useMemo(() => {
    const firstChild = root.children[0];
    const primaryChildren = root.children.length === 1 && firstChild?.children.length
      ? firstChild.children
      : root.children;
    const branchSlots = [
      { x: 25, y: 35 },
      { x: 75, y: 35 },
      { x: 25, y: 65 },
      { x: 75, y: 65 },
      { x: 25, y: 95 },
      { x: 75, y: 95 },
    ];
    const childSlots = [
      [{ x: 25, y: 50 }],
      [{ x: 75, y: 50 }],
      [{ x: 25, y: 80 }],
      [{ x: 75, y: 80 }],
      [{ x: 50, y: 95 }],
      [],
    ];
    const nodes: Array<{ id: string; label: string; x: number; y: number; root?: boolean; muted?: boolean }> = [
      { id: root.id, label: root.label, x: 50, y: 11, root: true },
    ];
    const edges: Array<{ from: string; to: string }> = [];

    primaryChildren.slice(0, 6).forEach((node, idx) => {
      const slot = branchSlots[idx] || { x: 50, y: 42 + idx * 8 };
      nodes.push({ id: node.id, label: node.label, x: slot.x, y: slot.y, muted: idx > 3 });
      edges.push({ from: root.id, to: node.id });
      node.children.slice(0, childSlots[idx]?.length || 0).forEach((child, childIdx) => {
        const childSlot = childSlots[idx][childIdx];
        nodes.push({ id: child.id, label: child.label, x: childSlot.x, y: childSlot.y, muted: idx > 2 || childIdx > 0 });
        edges.push({ from: node.id, to: child.id });
      });
    });

    return { nodes, edges };
  }, [root]);

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-[#fbfcff]" style={{ breakInside: 'avoid', columnSpan: 'all' } as React.CSSProperties}>
      <div className="relative min-h-[560px] overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(#e9edf5 1px, transparent 1px), linear-gradient(90deg, #e9edf5 1px, transparent 1px)',
            backgroundSize: '128px 128px',
          }}
        />
        <div className="absolute left-6 top-6 text-[9px] font-black uppercase tracking-[0.3em] text-slate-300">
          Neural Nodes {Math.max(map.nodes.length - 1, 0)} / Depth {Math.max(1, map.edges.length)}
        </div>
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-20deg] select-none text-[84px] font-black uppercase tracking-[0.15em] text-slate-400/[0.04]">
          Vidyalaya
        </div>

        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {map.edges.map((edge, idx) => {
            const from = map.nodes.find(node => node.id === edge.from);
            const to = map.nodes.find(node => node.id === edge.to);
            if (!from || !to) return null;
            const midY = (from.y + to.y) / 2;
            return (
              <path
                key={`${edge.from}-${edge.to}-${idx}`}
                d={`M ${from.x} ${from.y + 4} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y - 4}`}
                fill="none"
                stroke="#cbd5e1"
                strokeWidth="0.35"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>

        {map.nodes.map(node => (
          <div
            key={node.id}
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-[20px] border text-center font-black uppercase shadow-sm flex items-center justify-center transition-all ${
              node.root
                ? 'min-w-[280px] max-w-[400px] border-[#000666] bg-[#000666] px-6 py-4 text-[15px] tracking-tight text-white shadow-[0_20px_50px_-24px_rgba(0,6,102,0.6)] ring-4 ring-[#000666]/5'
                : node.muted
                  ? 'min-w-[180px] max-w-[280px] border-slate-200 bg-white/70 px-4 py-2.5 text-[10px] tracking-wide text-slate-400'
                  : 'min-w-[200px] max-w-[300px] border-slate-300 bg-white/95 px-4 py-3 text-[11px] tracking-wide text-slate-700'
            }`}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
          >
            <span className="leading-[1.1] break-words">{node.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const TerminalReferenceBlock: React.FC<{ raw: string }> = ({ raw }) => {
  const commands = React.useMemo(() => {
    const blocks: Array<{ command: string; output: string[] }> = [];
    let current: { command: string; output: string[] } | null = null;

    raw.split('\n').forEach(line => {
      const commandMatch = line.match(/^\s*\$\s*(.+)$/);
      if (commandMatch) {
        if (current) blocks.push(current);
        current = { command: commandMatch[1], output: [] };
      } else if (current) {
        current.output.push(line.replace(/^Output:\s*/i, ''));
      }
    });

    if (current) blocks.push(current);
    return blocks.length ? blocks : [{ command: '', output: raw.split('\n').filter(Boolean) }];
  }, [raw]);

  return (
    <div className="my-7 overflow-hidden rounded-2xl border border-slate-200 bg-[#0b1020]" style={{ breakInside: 'avoid', columnSpan: 'all' } as React.CSSProperties}>
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/35">Reference</div>
          <div className="mt-0.5 text-[12px] font-black uppercase tracking-wider text-white">Command + Expected Output</div>
        </div>
        <CopyButton text={raw} />
      </div>
      <div className="p-4 font-mono text-[12px] leading-relaxed break-words whitespace-pre-wrap custom-scrollbar">
        {commands.map((block, idx) => (
          <div key={`${block.command}-${idx}`} className="mb-5 last:mb-0">
            {block.command ? (
              <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/5 px-3 py-2 text-emerald-200">
                <span className="mr-2 text-emerald-400">$</span>
                {block.command}
              </div>
            ) : null}
            {block.output.filter(Boolean).length > 0 && (
              <div className={`${block.command ? 'mt-2' : ''} rounded-xl border border-white/10 bg-white/[0.04] p-3 text-slate-300`}>
                {block.output.filter(Boolean).map((line, lineIdx) => {
                  const notice = /^Notice:/i.test(line);
                  return (
                    <div key={lineIdx} className={notice ? 'mt-2 border-t border-white/10 pt-2 text-sky-200' : ''}>
                      {line}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const GeometryPanel: React.FC<{
  raw: string;
  language?: string;
  interactions: GeometryInteractionProps;
}> = ({ raw, language = '', interactions }) => {
  const kind = detectShapeKind(raw, language);
  const earlyTimestamp = interactions.resolveTimestamp?.(raw);
  if (kind === 'LIVE_TERMINAL') {
    return (
      <div data-geometry-shape="LIVE_TERMINAL" data-timestamp={earlyTimestamp}>
        <TerminalReferenceBlock raw={raw} />
      </div>
    );
  }
  if (kind === 'STANDARD_VS_PRO') {
    return (
      <div data-geometry-shape="STANDARD_VS_PRO" data-timestamp={earlyTimestamp}>
        <ComparisonTable raw={raw} />
      </div>
    );
  }
  if (kind === 'QUICK_REVIEW_FLOW') {
    return <MasteryCheckpoint moduleTitle={interactions.moduleTitle} />;
  }
  if (kind === 'ARCHITECTURE_TREE' || kind === 'HIERARCHY_MAP') {
    return (
      <div data-geometry-shape={kind} data-timestamp={earlyTimestamp}>
        <ArchitectureTree raw={raw} title={SHAPE_LIBRARY[kind].label} />
      </div>
    );
  }

  const visual = SHAPE_LIBRARY[kind] || SHAPE_LIBRARY.GEOMETRY_CARD;
  const Icon = visual.Icon;
  const lines = parseGeometryLines(raw);
  const explicitShape = Boolean(raw.match(/SHAPE:\s*([A-Z_ ]+)/i));
  const extractedTitle = stripAsciiFrame(raw.match(/SHAPE:\s*([A-Z_ ]+)/i)?.[1] || lines[0] || '').replace(/_/g, ' ');
  const title = extractedTitle || visual.label;
  
  const isTitleRedundant = normalizeText(title) === normalizeText(visual.label);

  const body = lines
    .filter(line => {
      const normalizedLine = normalizeText(line);
      return normalizedLine
        && normalizedLine !== normalizeText(title)
        && normalizedLine !== normalizeText(visual.label)
        && !/^(shape|definition box|golden rule|warning card|process flow|standard vs pro)$/i.test(normalizedLine);
    })
    .slice(0, 10);
  const timestamp = interactions.resolveTimestamp?.(`${title} ${body.join(' ')}`);
  const canAnchor = kind === 'GEOMETRY_CARD';
  const flowSteps = kind === 'PROCESS_FLOW' ? extractFlowSteps(raw) : [];

  if (kind === 'PROCESS_FLOW') {
    if (flowSteps.length > 1) return <InlineProcessFlow title={title} steps={flowSteps} />;
    return null;
  }

  if (kind === 'GOLDEN_RULE' || kind === 'DEFINITION_BOX' || kind === 'WARNING_CARD') {
    const calloutKind = kind === 'GOLDEN_RULE' ? 'golden-rule' : kind === 'DEFINITION_BOX' ? 'definition' : 'warning';
    return (
      <GeometryCallout
        kind={calloutKind}
        label={visual.label}
        text={body.join(' ') || title}
        timestamp={timestamp}
        onJump={timestamp !== undefined ? () => interactions.onJumpToTimeline?.(`${title} ${body.join(' ')}`) : undefined}
        onAnchor={() => interactions.onAnchorShape(calloutKind, explicitShape ? visual.label : title, body.join('\n'))}
      >
        {null}
      </GeometryCallout>
    );
  }

  return (
    <div
      data-geometry-shape={kind}
      data-timestamp={timestamp}
      className={`group/shape relative my-7 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br ${visual.bg} p-4 transition-colors duration-300`}
      style={{ breakInside: 'avoid', columnSpan: 'all' } as React.CSSProperties}
    >
      <div className="relative flex items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-slate-200 shadow-sm ${visual.accent}`}>
            <Icon size={17} />
          </div>
          <div>
            {!isTitleRedundant && <div className="text-[9px] font-black uppercase tracking-[0.24em] text-slate-400 mb-0.5">{visual.label}</div>}
            <h4 className={`text-[15px] font-black tracking-tight text-[#000666] ${isTitleRedundant ? 'mt-0' : ''}`}>{title}</h4>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {timestamp !== undefined && interactions.onJumpToTimeline && (
            <button onClick={(event) => { event.stopPropagation(); interactions.onJumpToTimeline?.(`${title} ${body.join(' ')}`); }} className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-orange-600 hover:bg-orange-100 transition-all">
              Sync {Math.floor(timestamp / 60)}:{Math.floor(timestamp % 60).toString().padStart(2, '0')}
            </button>
          )}
          {canAnchor && (
            <button onClick={(event) => {
              event.stopPropagation();
              interactions.onAnchorShape('shape', title, body.join('\n'));
            }} className="flex items-center gap-1.5 rounded-full border border-[#000666]/10 bg-white/80 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-[#000666] hover:bg-[#000666] hover:text-white transition-all">
              <Anchor size={12} />
              Anchor
            </button>
          )}
        </div>
      </div>
      <div className="relative mt-5">
        {body.length ? body.map((line, idx) => {
          return (
            <p key={`${line}-${idx}`} className="mb-2 last:mb-0 text-[14px] leading-[1.75] text-slate-700 font-medium">
              {line}
            </p>
          );
        }) : (
          <div className="rounded-xl bg-white/60 p-4 border border-white/40">
             <p className="text-[14px] leading-[1.75] text-slate-700 font-medium whitespace-pre-wrap">{raw.replace(/SHAPE:.*$/im, '').trim()}</p>
          </div>
        )}
      </div>
    </div>
  );
};

const GeometryCallout: React.FC<{
  kind: 'golden-rule' | 'definition' | 'warning' | 'insight';
  label: string;
  text: string;
  children: React.ReactNode;
  onAnchor?: () => void;
  timestamp?: number;
  onJump?: () => void;
}> = ({ kind, label, text, children, onAnchor, timestamp, onJump }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.45 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const styles = {
    'golden-rule': {
      rail: 'border-emerald-400',
      label: 'text-emerald-700',
      wash: 'bg-emerald-50/35',
    },
    definition: {
      rail: 'border-indigo-300',
      label: 'text-[#000666]',
      wash: 'bg-transparent',
    },
    warning: {
      rail: 'border-amber-400',
      label: 'text-amber-700',
      wash: 'bg-amber-50/45',
    },
    insight: {
      rail: 'border-sky-300',
      label: 'text-sky-700',
      wash: 'bg-transparent',
    },
  }[kind];

  const cleanText = text
    .replace(/^\s*(?:GOLDEN RULE|DEFINITION(?: BOX)?|WARNING(?: CARD)?|NEXT CONFUSION|MUST)\s*:?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  const sentences = sentenceChunks(cleanText);

  return (
    <div
      ref={ref}
      data-geometry-callout={kind}
      data-timestamp={timestamp}
      className={`group/callout my-6 border-l-2 py-1 pl-4 pr-1 transition-colors duration-500 ${styles.rail} ${styles.wash} ${inView && kind === 'warning' ? 'bg-amber-50/70' : ''}`}
      style={{ breakInside: 'avoid', columnSpan: 'all' } as React.CSSProperties}
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className={`min-w-0 text-[9px] font-black uppercase tracking-[0.24em] ${styles.label}`}>
          {label}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 opacity-0 transition-opacity duration-200 group-hover/callout:opacity-100">
          {timestamp !== undefined && onJump && (
            <button onClick={onJump} className="text-[8px] font-black uppercase tracking-widest text-orange-500 hover:text-orange-700 transition-all">
              Sync {Math.floor(timestamp / 60)}:{Math.floor(timestamp % 60).toString().padStart(2, '0')}
            </button>
          )}
          {onAnchor && (
            <button onClick={onAnchor} className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-[#000666]/60 hover:text-[#000666] transition-all">
              <Anchor size={12} />
              Anchor
            </button>
          )}
        </div>
      </div>
      <div className="mt-2 text-[15px] leading-[1.75] text-slate-700">
        {(sentences.length ? sentences : [cleanText]).slice(0, 3).join(' ')}
      </div>
    </div>
  );
};

export const ContentRenderer: React.FC<ContentRendererProps> = ({
  content,
  isLoading,
  moduleTitle,
  phaseName,
  scrollRef,
  scrollProgress: externalScrollProgress,
  onRetry,
  videoTimeline,
  activeSegmentId,
  onTopicClick,
  focusMode = 'split',
  onToggleNeuralMap,
  leftPanelMode = 'content',
  nextActionLabel = 'Continue Path',
  nextActionTitle,
  nextActionMeta,
  onNextAction,
  citations,
  onCitationClick,
}) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [hoveredCitation, setHoveredCitation] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [loadingLogs, setLoadingLogs] = useState<{id: number, msg: string, type: 'info'|'success'|'thinking'}[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const innerScrollRef = useRef<HTMLDivElement>(null);
  const { anchorGeometry } = useAppStore();

  const extractTextFromChildren = (children: any): string => {
    if (typeof children === 'string') return children;
    if (Array.isArray(children)) return children.map(extractTextFromChildren).join(' ');
    if (children?.props?.children) return extractTextFromChildren(children.props.children);
    return '';
  };

  const removeDuplicateTreeBlocks = (value: string) => {
    let treeCount = 0;
    return value.replace(/```tree[\s\S]*?```/gi, block => {
      treeCount += 1;
      return treeCount === 1 ? block : '';
    });
  };

  const cleanContent = (raw: string | null) => {
    if (!raw) return "";
    
    // Remove AI boilerplate and duplicate tree blocks
    let cleaned = removeDuplicateTreeBlocks(raw)
      .replace(/^[\s\S]*?(?=#\s)/, '') // Remove everything before the first # Heading
      .replace(/^(?:Vidyal\.ai|Architectural Intelligence Report|Subject:|Classification:|System:|v\d+\.\d+\.\d+).*$/gm, '')
      .replace(/^##\s*Step\s*9\.5\s*[—-]\s*Quick Review Flow[\s\S]*?(?=^##\s*Step\s*10\b)/gim, '## Step 9.5 — Mastery Checkpoint\n\n')
      .replace(/```geometry\s*[\s\S]*?SHAPE:\s*QUICK_REVIEW_FLOW[\s\S]*?```/gi, '');

    // Only apply geometry stripping to parts that actually look like leaked geometry (contain box drawing chars)
    // and avoid stripping parts that are already within code blocks.
    return cleaned.split(/(```[\s\S]*?```)/g)
      .map(part => {
        if (part.startsWith('```')) return part;
        // Detect if the prose part contains a significant number of box drawing characters
        const boxCharCount = (part.match(/[║│╔╗╚╝┌┐└┘╠╟╞╡╢╣╤╧╪═─]/g) || []).length;
        if (boxCharCount > 10) {
          return stripGeometryScaffold(part);
        }
        return part;
      })
      .join('')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  const processedContent = React.useMemo(() => cleanContent(content), [content]);

  const topics = React.useMemo(() => {
    return (processedContent.match(/^##\s+(.+)$/gm) || [])
      .map(t => t.replace(/^##\s+/, '').trim())
      .slice(0, 12);
  }, [processedContent]);

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showColumns, setShowColumns] = useState(false);

  useEffect(() => {
    setIsTransitioning(true);
    if (focusMode === 'content') {
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setShowColumns(false);
      }, 1050);
      return () => clearTimeout(timer);
    } else {
      setShowColumns(false);
      const timer = setTimeout(() => setIsTransitioning(false), 950);
      return () => clearTimeout(timer);
    }
  }, [focusMode]);

  useEffect(() => {
    if (isLoading) {
      setLoadingLogs([]);
      setElapsedTime(0);
      let isSubscribed = true;
      
      const timer = setInterval(() => {
        if (isSubscribed) setElapsedTime(prev => prev + 1);
      }, 1000);

      const coreMsgs = [
        "Initializing Cognitive Engine...",
        "Scanning target concepts...",
        "Structuring theoretical framework...",
        "Cross-referencing documentation...",
        "Synthesizing Markdown architecture...",
        "Finalizing content rendering..."
      ];

      const thinkingMsgs = [
        "Expanding research radius...",
        "Validating technical depth...",
        "Correlating semantic anchors...",
        "Refining architectural logic...",
        "Optimizing for learner retention...",
        "Deduplicating knowledge nodes..."
      ];

      const runSim = async () => {
        // Run core messages
        for (let i = 0; i < coreMsgs.length; i++) {
          if (!isSubscribed) break;
          await new Promise(r => setTimeout(r, 800 + Math.random() * 400));
          if (!isSubscribed) break;
          setLoadingLogs(prev => [{id: Date.now(), msg: coreMsgs[i], type: i === coreMsgs.length - 1 ? 'success' : 'info'}, ...prev]);
        }

        // Keep adding "thinking" messages while still loading
        let cycle = 0;
        while (isSubscribed) {
          await new Promise(r => setTimeout(r, 2500 + Math.random() * 1000));
          if (!isSubscribed) break;
          setLoadingLogs(prev => [{id: Date.now(), msg: thinkingMsgs[cycle % thinkingMsgs.length], type: 'thinking'}, ...prev]);
          cycle++;
        }
      };

      runSim();
      return () => { 
        isSubscribed = false; 
        clearInterval(timer);
      };
    }
  }, [isLoading]);

  // Sync the inner ref to the passed scrollRef so parent can use it
  useEffect(() => {
    if (scrollRef && innerScrollRef.current) {
      (scrollRef as any).current = innerScrollRef.current;
    }
  }, [scrollRef]);

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollRef?.current) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const maxScroll = scrollHeight - clientHeight;
      if (maxScroll <= 0) {
        setScrollProgress(100);
      } else {
        setScrollProgress((scrollTop / maxScroll) * 100);
      }
    };

    const ref = scrollRef?.current;
    if (ref) {
      ref.addEventListener('scroll', handleScroll);
      handleScroll();
    }
    return () => {
      if (ref) ref.removeEventListener('scroll', handleScroll);
    };
  }, [scrollRef, content]);

  // Intersection Observer for bi-directional scroll sync
  useEffect(() => {
    const scrollRoot = innerScrollRef.current;
    if (!scrollRoot || !videoTimeline || videoTimeline.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            const segmentId = entry.target.id.replace('segment-', '');
            const segment = videoTimeline.find(s => s.id === segmentId);
            if (segment && segment.id !== activeSegmentId) {
              onTopicClick?.(segment.label);
            }
          }
        });
      },
      { threshold: 0.5, root: scrollRoot, rootMargin: '-10% 0px -70% 0px' }
    );

    const headings = scrollRoot.querySelectorAll('[id^="segment-"]');
    headings.forEach(h => observer.observe(h));

    return () => observer.disconnect();
  }, [videoTimeline, content, onTopicClick, activeSegmentId]);

  // Auto-scroll to active segment (when triggered from video)
  useEffect(() => {
    const scrollRoot = scrollRef?.current;
    if (activeSegmentId && scrollRoot) {
      const el = [...scrollRoot.querySelectorAll<HTMLElement>('[id^="segment-"]')]
        .find(segment => segment.id === `segment-${activeSegmentId}`);
      if (el) {
        const containerRect = scrollRoot.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        // Only scroll if not already visible (to avoid fighting manual scroll)
        if (elRect.top < containerRect.top || elRect.bottom > containerRect.bottom) {
          const scrollTop = scrollRoot.scrollTop + (elRect.top - containerRect.top) - 100;
          scrollRoot.scrollTo({ top: scrollTop, behavior: 'smooth' });
        }
      }
    }
  }, [activeSegmentId, scrollRef]);

  const progress = externalScrollProgress ?? scrollProgress;
  const activeLabel = videoTimeline?.find(segment => segment.id === activeSegmentId)?.label ?? null;

  const findTimelineSegment = (text: string) => {
    const normalizedText = normalizeText(text);
    if (normalizedText.length < 3) return undefined;
    return videoTimeline?.find(segment => normalizeText(segment.label) === normalizedText)
      || videoTimeline?.find(segment => {
        const normalizedLabel = normalizeText(segment.label);
        return normalizedLabel.includes(normalizedText) || normalizedText.includes(normalizedLabel);
      });
  };

  const handleTimelineJump = (text: string) => {
    const segment = findTimelineSegment(text);
    if (segment) onTopicClick?.(segment.label);
  };

  const handleAnchorShape = (kind: GeometryAnchor['kind'], label: string, detail: string) => {
    anchorGeometry({
      id: makeAnchorId(),
      moduleTitle: moduleTitle || 'Current Module',
      label: label.replace(/\s+/g, ' ').trim().slice(0, 80) || 'Geometry Anchor',
      kind,
      detail: detail.replace(/\s+/g, ' ').trim().slice(0, 420),
      createdAt: Date.now(),
    });
    onToggleNeuralMap?.();
  };

  const geometryInteractions: GeometryInteractionProps = {
    moduleTitle,
    onAnchorShape: handleAnchorShape,
    onJumpToTimeline: handleTimelineJump,
    resolveTimestamp: (text) => findTimelineSegment(text)?.timestamp,
  };

  const MarkdownComponents: any = {
    h1: ({ children }: any) => (
      <div 
        className={`mb-6 border-b border-slate-100 pb-4 transition-all duration-800 ease-[cubic-bezier(0.23,1,0.32,1)] ${focusMode === 'content' ? 'pt-0 text-left' : ''}`}
        style={{ columnSpan: focusMode === 'content' ? 'all' : 'none' } as any}
      >
        <h1 className={`font-headline-lg font-black text-[#000666] tracking-tight leading-[1.02] transition-all duration-800 ease-[cubic-bezier(0.23,1,0.32,1)] ${focusMode === 'content' ? 'max-w-5xl text-[clamp(1.9rem,4vw,42px)]' : 'text-[clamp(1.55rem,4vw,30px)]'}`}>
          {children}
        </h1>
      </div>
    ),
    h2: ({ children }: any) => {
      const text = extractTextFromChildren(children);
      const matchingSegment = videoTimeline?.find(s => 
        text.toLowerCase().includes(s.label.toLowerCase()) || 
        s.label.toLowerCase().includes(text.toLowerCase())
      );

      const isStepMatch = activeLabel && (/step\s*\d+/i.test(text) && /step\s*\d+/i.test(activeLabel));
      const exactStepMatch = isStepMatch && text.toLowerCase().split('—')[0].trim() === activeLabel.toLowerCase().split('—')[0].trim();
      
      const isActive = matchingSegment?.id === activeSegmentId || 
                       (activeLabel && !isStepMatch && text.toLowerCase().includes(activeLabel.toLowerCase())) ||
                       exactStepMatch;
      const isMasteryCheckpoint = /mastery checkpoint/i.test(text);
      
      return (
        <>
          <div 
            id={matchingSegment ? `segment-${matchingSegment.id}` : undefined}
            className={`group/h2 relative mt-10 mb-5 scroll-mt-24 transition-all duration-700 ${
              isActive ? 'translate-x-2' : ''
            }`}
            style={{ breakInside: 'avoid' }}
          >
            {/* TEMPORAL SYNC MARKER (INDIGO) */}
            {isActive && (
              <div className="absolute -left-8 top-2 flex items-center gap-2 animate-in fade-in slide-in-from-left duration-700">
                <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.6)]" />
                <div className="h-px w-4 bg-indigo-500/30" />
              </div>
            )}

            <div className="flex items-center gap-4">
              <h2 className={`font-headline-md leading-tight font-bold tracking-tight m-0 transition-all duration-700 ${
                isActive ? 'text-black' : 'text-slate-800 opacity-90'
              } ${focusMode === 'content' ? 'text-[24px]' : 'text-[19px]'}`}>
                {children}
              </h2>
              
              {onTopicClick && !isMasteryCheckpoint && (
                <button 
                  onClick={() => onTopicClick(matchingSegment?.label ?? text)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${
                    isActive 
                      ? 'bg-[#000666] text-white border-[#000666] shadow-lg' 
                      : 'opacity-0 group-hover/h2:opacity-100 bg-white text-slate-400 border-slate-200 hover:border-[#000666] hover:text-[#000666]'
                  }`}
                >
                  <Play size={10} fill="currentColor" />
                  {isActive ? 'Live Topic' : 'Focus Video'}
                </button>
              )}
            </div>
          </div>
          {isMasteryCheckpoint && <MasteryCheckpoint moduleTitle={moduleTitle} topics={topics} />}
        </>
      );
    },
    h3: ({ children }: any) => (
      <div className="mt-8 mb-4 flex items-center gap-4">
        <h3 className={`font-bold uppercase tracking-widest text-on-surface-variant shrink-0 transition-all ${focusMode === 'content' ? 'text-[13px]' : 'text-[11px]'}`}>{children}</h3>
        <div className="flex-1 h-px bg-outline-variant opacity-50" />
      </div>
    ),
    p: ({ children }: any) => {
      const renderChildrenWithCitations = (child: any): any => {
        if (typeof child === 'string') {
          const parts = child.split(/(\[\d+\])/g);
          return parts.map((part, i) => {
            const match = part.match(/\[(\d+)\]/);
            if (match) {
              const num = parseInt(match[1]);
              return (
                <sup 
                  key={i}
                  className="mx-0.5 inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full bg-indigo-100 text-[8px] font-black text-[#000666] shadow-sm transition-all hover:scale-110 hover:bg-[#000666] hover:text-white"
                  onMouseEnter={(e) => {
                    setHoveredCitation(num);
                    setMousePos({ x: e.clientX, y: e.clientY });
                  }}
                  onMouseLeave={() => setHoveredCitation(null)}
                  onClick={() => onCitationClick?.(num)}
                >
                  {num}
                </sup>
              );
            }
            return part;
          });
        }
        if (React.isValidElement(child) && (child.props as any).children) {
          return React.cloneElement(child, {
            children: React.Children.map((child.props as any).children, renderChildrenWithCitations)
          } as any);
        }
        return child;
      };

      return (
        <div className={`mb-6 font-body-md leading-[1.85] text-slate-700/90 transition-all text-left ${focusMode === 'content' ? 'text-[17px]' : 'text-[15px]'}`}>
          {React.Children.map(children, renderChildrenWithCitations)}
        </div>
      );
    },
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : 'text';
      const codeString = String(children).replace(/\n$/, '');
      const spansMultipleLines = node?.position?.start?.line !== undefined
        && node?.position?.end?.line !== undefined
        && node.position.end.line > node.position.start.line;
      const isBlockCode = spansMultipleLines || codeString.includes('\n');

      if (isBlockCode) {
        const isGeometryCode = ['geometry', 'tree', 'terminal', 'bash', 'shell', 'zsh'].includes(language)
          || /[╔═╗║╚╝┌─┐│└├]|SHAPE:|^\s*\$/m.test(codeString);
        if (isGeometryCode) {
          return <GeometryPanel raw={codeString} language={language} interactions={geometryInteractions} />;
        }

        return (
          <div 
            className="relative my-8 overflow-hidden rounded-3xl bg-[#0a0a0f] shadow-2xl"
            style={{ breakInside: 'avoid' }}
          >
            <div className="flex justify-between items-center px-5 py-3.5 border-b border-white/10 bg-white/5">
              <div className="flex gap-2.5">
                <div className="w-3 h-3 rounded-full bg-[#FF5F57] shadow-sm" />
                <div className="w-3 h-3 rounded-full bg-[#FFBD2E] shadow-sm" />
                <div className="w-3 h-3 rounded-full bg-[#28C840] shadow-sm" />
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">{language}</span>
                <CopyButton text={codeString} />
              </div>
            </div>
            <div className="overflow-x-auto">
              <SyntaxHighlighter
                language={language}
                style={atomDark}
                customStyle={{
                  margin: 0,
                  padding: '16px 20px',
                  fontSize: '12px',
                  lineHeight: '1.6',
                  background: 'transparent',
                }}
                wrapLines={true}
                wrapLongLines={true}
                codeTagProps={{
                  style: { 
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }
                }}
              >
                {codeString}
              </SyntaxHighlighter>
            </div>
          </div>
        );
      }

      return (
        <code className="bg-surface-container text-primary font-mono text-[13px] px-1.5 py-0.5 rounded-md mx-1" {...props}>
          {children}
        </code>
      );
    },
    blockquote: ({ children }: any) => {
      const rawText = extractTextFromChildren(children);
      const text = rawText.toLowerCase().trim();
      const isWarning = /^(warning|trap|avoid|mistake|pitfall|never)\b|the trap:|why it fails:|you are in it when:/i.test(text);
      const isRule = /^(golden rule|rule|core law|must|always)\b|must:/i.test(text);
      const isDefinition = /^(definition|term|anchor)\b|means:/i.test(text);
      
      let label = 'KEY INSIGHT';
      let kind: 'golden-rule' | 'definition' | 'warning' | 'insight' = 'insight';

      if (isWarning) {
        label = 'WARNING';
        kind = 'warning';
      } else if (isRule) {
        label = 'GOLDEN RULE';
        kind = 'golden-rule';
      } else if (isDefinition) {
        label = 'DEFINITION';
        kind = 'definition';
      }

      if (kind === 'insight') {
        return (
          <blockquote className="my-6 border-l-2 border-slate-200 pl-4 text-[15px] leading-relaxed text-slate-600">
            {children}
          </blockquote>
        );
      }

      return (
        <GeometryCallout
          kind={kind}
          label={label}
          text={rawText}
          timestamp={findTimelineSegment(rawText)?.timestamp}
          onJump={() => handleTimelineJump(rawText)}
          onAnchor={kind === 'golden-rule' || kind === 'definition'
            ? () => handleAnchorShape(kind, label, rawText)
            : undefined}
        >
          {children}
        </GeometryCallout>
      );
    },
    ul: ({ children }: any) => {
      const items = React.Children.toArray(children).filter((c: any) => c !== '\n');
      let isTermList = true;
      const parsedItems: { term: string, description: string }[] = [];

      items.forEach((item: any) => {
        if (!item?.props?.children) {
          isTermList = false;
          return;
        }
        const itemChildren = React.Children.toArray(item.props.children);
        const boldNode: any = itemChildren.find((c: any) => c?.type === 'strong');
        if (boldNode) {
          const term = extractTextFromChildren(boldNode);
          const description = extractTextFromChildren(itemChildren.filter((c: any) => c !== boldNode));
          parsedItems.push({ term, description: description.replace(/^[:\s-]+/, '') });
        } else {
          isTermList = false;
        }
      });

      if (isTermList && parsedItems.length > 0) {
        if (parsedItems.length === 2) {
          return (
            <div className="my-6 grid gap-3" style={{ breakInside: 'avoid' }}>
              {parsedItems.map((pi, idx) => (
                <div key={idx} className="border-l-2 border-indigo-100 pl-4">
                  <div className="font-sans text-[13px] font-bold text-[#000666]">{pi.term}</div>
                  <div className="mt-1 font-sans text-[14px] leading-relaxed text-slate-600">{pi.description}</div>
                </div>
              ))}
            </div>
          );
        }
        
        return (
          <div className="my-6 grid gap-3" style={{ breakInside: 'avoid' }}>
            {parsedItems.map((pi, idx) => (
              <div key={idx} className="border-l-2 border-indigo-100 pl-4">
                <div className="font-sans text-[13px] font-semibold text-[#000666]">{pi.term}</div>
                <div className="mt-1 font-sans text-[13px] leading-relaxed text-slate-600">{pi.description}</div>
              </div>
            ))}
          </div>
        );
      }

      return (
        <ul className="my-6 space-y-3 pl-5 text-[15px] leading-relaxed text-slate-700 marker:text-[#000666]/45">
          {items.map((item: any, idx: number) => (
            <li key={idx}>{item.props?.children || item}</li>
          ))}
        </ul>
      );
    },
    ol: ({ children }: any) => {
      const items = React.Children.toArray(children).filter((c: any) => c !== '\n');
      return (
        <div className="my-7 relative">
          {items.map((item: any, idx: number) => (
            <div key={idx} className="group relative mb-5 flex gap-4" style={{ breakInside: 'avoid' }}>
              {idx !== items.length - 1 && (
                <div className="absolute left-[13px] top-[32px] bottom-[-32px] w-px bg-outline-variant opacity-30 group-hover:opacity-60 transition-opacity" />
              )}
              <div className="w-6 shrink-0 font-headline-md text-[20px] leading-none text-outline-variant font-bold opacity-60">
                {idx + 1}
              </div>
              <div className="flex-1 pt-0.5 font-body-md text-[15px] leading-relaxed text-on-surface">
                {item.props.children}
              </div>
            </div>
          ))}
        </div>
      );
    },
    li: ({ children }: any) => <li>{children}</li>, // Rendered manually in ul/ol if pattern matches, else fallback
    table: ({ children }: any) => {
      let tableType = "Reference";
      try {
        const thead = React.Children.toArray(children).find((c: any) => c.type === 'thead');
        if (thead) {
          const tr = React.Children.toArray((thead as any).props.children).find((c: any) => c.type === 'tr');
          if (tr) {
            const ths = React.Children.toArray((tr as any).props.children);
            if (ths.length >= 2) {
              const th1 = extractTextFromChildren(ths[0]);
              const th2 = extractTextFromChildren(ths[1]);
              if (th1.toLowerCase().includes('standard') || th2.toLowerCase().includes('pro')) {
                tableType = "Standard vs Pro";
              } else {
                tableType = `${th1} vs ${th2}`;
              }
            }
          }
        }
      } catch (e) {}
      
      return (
        <div 
          data-geometry-shape="TABLE"
          className="my-7 w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white"
          style={{ breakInside: 'avoid', columnSpan: 'all' } as React.CSSProperties}
        >
          <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
            <Box size={16} className="text-cyan-700" />
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.24em] text-slate-400">Compare</div>
              <div className="text-[12px] font-black uppercase tracking-wider text-[#000666]">{tableType}</div>
            </div>
          </div>
          <table className="w-full text-left border-collapse min-w-[500px]">
            {children}
          </table>
        </div>
      );
    },
    thead: ({ children }: any) => (
      <thead className="bg-surface-container text-on-surface-variant font-bold text-[11px] uppercase tracking-wider">
        {children}
      </thead>
    ),
    tr: ({ children }: any) => (
      <tr className="border-b border-outline-variant last:border-0 hover:bg-surface-container-low transition-colors even:bg-black/5">
        {children}
      </tr>
    ),
    td: ({ children }: any) => (
      <td className="p-3 px-4 font-body-md text-[14px] text-on-surface">
        {children}
      </td>
    ),
    th: ({ children }: any) => (
      <th className="p-3 px-4 font-body-md text-[11px] font-bold tracking-wider uppercase text-on-surface-variant">
        {children}
      </th>
    ),
  };

  return (
    <div className="relative w-full h-full bg-white overflow-hidden flex">
      {/* NEURAL TOPIC RAIL (Left Margin - Appears in Content Focus) */}
      {focusMode === 'content' && topics.length > 0 && (
        <aside className="group/blueprint relative shrink-0 z-[75] flex w-12 overflow-hidden border-r border-slate-100 bg-[#fcfcfd]/96 transition-[width] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] hover:w-80">
          <div className="absolute inset-y-0 left-0 flex w-12 flex-col items-center border-r border-slate-100 bg-white/80 pt-32">
            <div className="h-16 w-1 rounded-full bg-gradient-to-b from-teal-400 via-indigo-400 to-transparent opacity-80 transition-all group-hover/blueprint:opacity-100" />
            <div className="mt-5 select-none text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 transition-colors group-hover/blueprint:text-[#000666] [writing-mode:vertical-rl]">
              Blueprint
            </div>
          </div>
          <div className="flex h-full w-80 shrink-0 flex-col gap-6 p-10 pt-28 opacity-0 transition-opacity duration-300 group-hover/blueprint:opacity-100">
           <div className="flex items-center gap-2 mb-4">
             <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
             <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Module Blueprint</div>
           </div>
           
           <div className="space-y-5">
             {topics.map((t, idx) => (
               <button 
                 key={idx}
                 onClick={() => {
                   const el = [...(innerScrollRef.current?.querySelectorAll('h2') || [])].find(h => h.textContent?.includes(t));
                   if (el && scrollRef.current) {
                     const rect = el.getBoundingClientRect();
                     const top = scrollRef.current.scrollTop + rect.top - 120;
                     scrollRef.current.scrollTo({ top, behavior: 'smooth' });
                   }
                 }}
                 className="group flex flex-col items-start text-left w-full"
               >
                 <span className="text-[9px] font-black text-indigo-300 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">Section {idx + 1}</span>
                 <span className="text-[11px] font-bold text-slate-400 group-hover:text-[#000666] transition-all leading-tight uppercase tracking-widest border-l-2 border-transparent group-hover:border-indigo-500 group-hover:pl-3">
                   {t}
                 </span>
               </button>
             ))}
           </div>

           <div className="mt-auto pt-8 border-t border-slate-100">
             <button
               type="button"
               onClick={onNextAction}
               disabled={!onNextAction}
               className="group w-full rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#000666]/15 hover:shadow-lg disabled:cursor-default disabled:hover:translate-y-0 disabled:hover:border-slate-100 disabled:hover:shadow-sm"
             >
               <div className="mb-3 flex items-center justify-between gap-3">
                 <span className="text-[9px] font-black uppercase tracking-[0.24em] text-indigo-400">
                   {nextActionLabel}
                 </span>
                 <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-[#000666] transition-all group-hover:bg-[#000666] group-hover:text-white">
                   <ChevronRight size={15} strokeWidth={3} />
                 </span>
               </div>
               <p className="line-clamp-2 text-[13px] font-black leading-snug text-slate-800">
                 {nextActionTitle || 'Return to your learning path'}
               </p>
               {nextActionMeta && (
                 <p className="mt-2 text-[9px] font-black uppercase tracking-[0.18em] text-slate-300">
                   {nextActionMeta}
                 </p>
               )}
             </button>
           </div>
          </div>
        </aside>
      )}

      <div 
        ref={innerScrollRef}
        className={`relative h-full flex-1 overflow-y-auto py-5 pr-4 selection:bg-[#000666] selection:text-white sm:py-6 sm:pr-6 lg:py-8 lg:pr-8 xl:py-9 xl:pr-10 custom-scrollbar pl-4 sm:pl-8 lg:pl-10 xl:pl-12`}
      >
        {/* Ambient Decorative Accents for Focus Mode */}
        {focusMode === 'content' && (
          <>
            <div className="absolute top-0 left-0 w-80 h-80 bg-indigo-50/40 blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-slate-100/50 blur-[140px] pointer-events-none animate-pulse" style={{ animationDuration: '12s' }} />
          </>
        )}

        <div 
          className={`relative transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[width,opacity,transform] liquid-reveal ${isTransitioning ? 'opacity-0 scale-[0.995] blur-[2px]' : 'opacity-100 scale-100 blur-0'} ${focusMode === 'content' ? 'mr-auto ml-0 max-w-none px-4' : 'mx-auto max-w-[1400px]'}`}
          style={{ scrollbarGutter: 'stable', contain: 'layout' } as any}
        >
          {isLoading ? (
            <div className="flex flex-col h-[calc(100vh-200px)] items-center justify-center animate-in fade-in zoom-in duration-1000">
              <div className="w-full max-w-[1600px] mx-auto px-12">
                {/* Cinematic Synthesis Header */}
                <div className="flex flex-col items-center mb-16 text-center space-y-4">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-[28px] bg-white border border-slate-100 shadow-xl flex items-center justify-center relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-[#000666]/5 animate-pulse" />
                      <BrainCircuit size={36} className="text-[#000666] relative z-10 animate-float" />
                    </div>
                    <div className="absolute -inset-4 border-2 border-dashed border-indigo-100/50 rounded-full animate-[spin_30s_linear_infinite]" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-[#000666] animate-pulse">Neural Content Synthesis</h2>
                    <p className="text-[13px] font-medium text-slate-400 font-['Newsreader'] italic tracking-wide">
                      Compiling scholarly insights into a technical roadmap...
                    </p>
                  </div>
                </div>

                {/* Technical Log Console */}
                <div className="bg-white/40 backdrop-blur-sm rounded-[40px] border border-slate-200/60 p-1 shadow-[0_32px_64px_-16px_rgba(0,6,102,0.08)] overflow-hidden">
                  <div className="bg-white rounded-[39px] p-8">
                    <div className="flex items-center justify-between mb-8 px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse [animation-delay:0.2s]" />
                          <div className="w-1.5 h-1.5 rounded-full bg-[#000666] animate-pulse [animation-delay:0.4s]" />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Generator Log</span>
                      </div>
                      <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
                        <span className="text-[10px] font-mono font-bold text-[#000666]">CYCLE_{elapsedTime}S</span>
                        <div className="w-px h-3 bg-slate-200" />
                        <Loader2 size={14} className="text-indigo-400 animate-spin" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[320px] overflow-y-auto custom-scrollbar pr-2">
                      {loadingLogs.length > 0 ? (
                        loadingLogs.map((log, i) => (
                          <div 
                            key={log.id} 
                            className="bg-slate-50/50 border border-slate-100/80 p-5 rounded-[24px] flex gap-4 animate-in slide-in-from-bottom-4 duration-700"
                            style={{ animationDelay: `${i * 100}ms` }}
                          >
                            <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                              log.type === 'success' ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 'bg-indigo-400 animate-pulse'
                            }`} />
                            <div className="space-y-1">
                              <p className="text-[12px] font-bold text-slate-800 leading-relaxed italic font-serif">"{log.msg}"</p>
                              <div className="flex items-center gap-2">
                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{log.type === 'thinking' ? 'Cognitive Sweep' : 'Generator Agent'}</span>
                                <div className="w-1 h-1 rounded-full bg-slate-200" />
                                <span className="text-[8px] font-bold text-indigo-300 uppercase tracking-widest">OK</span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-full h-full flex flex-col items-center justify-center opacity-30">
                          <BrainCircuit size={48} className="text-[#000666] mb-4 animate-pulse" />
                          <span className="text-[9px] font-black text-[#000666] uppercase tracking-[0.5em]">Initializing Architecture</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : processedContent ? (
            <div className={`relative ${focusMode === 'content' ? 'book-spread-mode' : ''}`}>
              <div className={`prose-slate prose-lg max-w-none transition-all duration-800 ease-[cubic-bezier(0.23,1,0.32,1)] scholastic-justification ${showColumns ? 'lg:columns-2 lg:gap-32' : ''}`}>
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={MarkdownComponents}
                >
                  {processedContent}
                </ReactMarkdown>
              </div>

              {/* ── GROUNDED CITATIONS SECTION ── */}
              {citations && citations.length > 0 && (
                <div className="mt-20 pt-10 border-t border-slate-200/60 pb-16">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#000666]/5 border border-[#000666]/10 text-[#000666]">
                      <BookOpen size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-[#000666]">Grounded Sources</h3>
                      <p className="text-[12px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Verified Real-World Information</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {citations.map((c, i) => (
                      <a 
                        key={i} 
                        href={c.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={() => onCitationClick?.(i + 1)}
                        className="group flex flex-col p-6 rounded-[24px] border border-slate-200/60 bg-white/50 hover:bg-white hover:border-indigo-300 hover:shadow-[0_20px_50px_-20px_rgba(0,6,102,0.15)] hover:-translate-y-1 transition-all duration-500 text-left"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-[#000666] text-[10px] font-black group-hover:bg-[#000666] group-hover:text-white transition-colors">
                            {i + 1}
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-indigo-400">
                            {c.domain}
                          </span>
                        </div>
                        <h4 className="text-[14px] font-bold text-slate-800 mb-2 group-hover:text-[#000666] line-clamp-2 leading-snug">
                          {c.title}
                        </h4>
                        {c.snippet && (
                          <p className="text-[12px] text-slate-500 line-clamp-2 leading-relaxed">
                            "{c.snippet}"
                          </p>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-6">
                <AlertCircle size={32} className="text-slate-300" />
              </div>
              <h3 className="text-xl font-headline-md text-slate-800 mb-2">No Content Synthesized</h3>
              <p className="text-slate-500 max-w-md mx-auto mb-8">
                The research engine hasn't generated content for this module yet.
              </p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="px-8 py-3 bg-[#000666] text-white rounded-full font-bold hover:shadow-xl transition-all active:scale-95"
                >
                  Regenerate Technical Deep-Dive
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* ── FLOATING CITATION PREVIEW (TRUTH TO POWER) ── */}
        {hoveredCitation && citations?.[hoveredCitation - 1] && (
          <div 
            className="fixed z-[9999] w-80 animate-in fade-in zoom-in duration-300 pointer-events-none"
            style={{ 
              left: `${mousePos.x + 20}px`, 
              top: `${mousePos.y - 40}px`,
              transform: 'translate3d(0, 0, 0)'
            }}
          >
            <div className="rounded-2xl border border-indigo-200 bg-white/95 backdrop-blur-xl p-4 shadow-[0_20px_50px_-15px_rgba(0,6,102,0.2)]">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#000666] text-[9px] font-black text-white">
                  {hoveredCitation}
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">
                  {citations[hoveredCitation - 1].domain}
                </span>
              </div>
              <p className="text-[12px] font-bold text-[#000666] mb-2 line-clamp-2 leading-snug">
                {citations[hoveredCitation - 1].title}
              </p>
              {citations[hoveredCitation - 1].snippet && (
                <p className="text-[10px] text-slate-500 leading-relaxed italic border-l-2 border-slate-100 pl-3">
                  "{citations[hoveredCitation - 1].snippet}"
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentRenderer;
