import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Undo2, Redo2, Trash2, Save, Sparkles, Eraser, Check, Volume2,
  PenTool, Highlighter, Type, Square, Circle, ArrowRight, Minus, Grid,
  MousePointer, ChevronDown, X, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

export interface StrokePoint {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  type: 'select' | 'pencil' | 'highlighter' | 'line' | 'arrow' | 'rect' | 'circle' | 'text' | 'eraser';
  points: StrokePoint[];
  color: string;
  width: number;
  opacity?: number;
  text?: string;
  fontStyle?: 'sans' | 'serif' | 'mono';
  isBold?: boolean;
  isItalic?: boolean;
  hasBackground?: boolean;
  isDashed?: boolean;
  isFilled?: boolean;
}

interface InteractiveWhiteboardProps {
  moduleId: string;
  isZenMode?: boolean;
  onSaveToVault?: (imageDataUrl: string) => void;
  onScanSketch?: (imageDataUrl: string) => void;
  onListen?: () => void;
  audioState?: 'idle' | 'loading' | 'playing' | 'paused';
}

const PRESETS = {
  colors: [
    { value: '#4e5bff', label: 'Indigo' },
    { value: '#06b6d4', label: 'Cyan' },
    { value: '#10b981', label: 'Mint' },
    { value: '#f59e0b', label: 'Amber' },
    { value: '#ef4444', label: 'Coral' },
    { value: '#8b5cf6', label: 'Violet' },
    { value: 'DYNAMIC', label: 'Theme Contrast' }
  ],
  widths: [
    { value: 2, label: 'Fine' },
    { value: 5, label: 'Medium' },
    { value: 12, label: 'Bold' }
  ]
};

// Cursor map per tool
const TOOL_CURSORS: Record<string, string> = {
  select: 'cursor-default',
  pencil: 'cursor-crosshair',
  highlighter: 'cursor-crosshair',
  eraser: 'cursor-cell',
  line: 'cursor-crosshair',
  arrow: 'cursor-crosshair',
  rect: 'cursor-crosshair',
  circle: 'cursor-crosshair',
  text: 'cursor-text',
};

// ── Glassmorphic Confirm Modal ──
const ConfirmModal: React.FC<{
  isZenMode: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ isZenMode, message, onConfirm, onCancel }) => (
  <AnimatePresence>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.45)' }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 12 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        onClick={e => e.stopPropagation()}
        className={`w-80 rounded-2xl border shadow-2xl p-6 flex flex-col gap-4 ${
          isZenMode
            ? 'bg-[#0c0e14]/95 border-white/10 shadow-black/60'
            : 'bg-white/95 border-slate-200/60 shadow-slate-200/40'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isZenMode ? 'bg-red-500/10' : 'bg-red-50'}`}>
            <AlertTriangle size={18} className="text-red-500" />
          </div>
          <div>
            <h3 className={`text-sm font-black ${isZenMode ? 'text-white' : 'text-slate-800'}`}>
              Clear Whiteboard
            </h3>
            <p className={`text-[11px] mt-0.5 ${isZenMode ? 'text-slate-400' : 'text-slate-500'}`}>
              This cannot be undone
            </p>
          </div>
        </div>
        <p className={`text-[12px] leading-relaxed ${isZenMode ? 'text-slate-300' : 'text-slate-600'}`}>
          {message}
        </p>
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={onCancel}
            className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
              isZenMode
                ? 'border-white/10 text-slate-400 hover:bg-white/5'
                : 'border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl text-[11px] font-black text-white bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-md shadow-red-500/20 transition-all cursor-pointer"
          >
            Clear Board
          </button>
        </div>
      </motion.div>
    </motion.div>
  </AnimatePresence>
);

export const InteractiveWhiteboard: React.FC<InteractiveWhiteboardProps> = ({
  moduleId,
  isZenMode = false,
  onSaveToVault,
  onScanSketch,
  onListen,
  audioState
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const lastSizeRef = useRef<{ width: number; height: number } | null>(null);
  const lastCursorPosRef = useRef<{ x: number; y: number } | null>(null);
  const [editingTextStroke, setEditingTextStroke] = useState<Stroke | null>(null);

  // Vector stroke histories
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStrokes, setRedoStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);

  // Basic settings
  const [activeTool, setActiveTool] = useState<Stroke['type']>('pencil');
  const [strokeColor, setStrokeColor] = useState<string>('#4e5bff');
  const [strokeWidth, setStrokeWidth] = useState<number>(5);
  const [strokeOpacity, setStrokeOpacity] = useState<number>(1);
  const [gridType, setGridType] = useState<'none' | 'dots' | 'lines'>('dots');

  // Vector Selection State
  const [selectedStrokeId, setSelectedStrokeId] = useState<string | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragOriginalPointsRef = useRef<StrokePoint[]>([]);
  const isDraggingRef = useRef(false);

  // Advanced Vector Customization Options
  const [fontStyle, setFontStyle] = useState<'sans' | 'serif' | 'mono'>('sans');
  const [isBold, setIsBold] = useState<boolean>(false);
  const [isItalic, setIsItalic] = useState<boolean>(false);
  const [hasBackground, setHasBackground] = useState<boolean>(false);
  const [isDashed, setIsDashed] = useState<boolean>(false);
  const [isFilled, setIsFilled] = useState<boolean>(false);

  // Formatting popover state
  const [showFormattingPopover, setShowFormattingPopover] = useState(false);
  const formattingBtnRef = useRef<HTMLButtonElement>(null);

  // Placer Text absolute overlay input coordinates
  const [textInput, setTextInput] = useState<{ x: number; y: number; val: string } | null>(null);

  // Clear confirm modal
  const [showClearModal, setShowClearModal] = useState(false);

  // Persist drawings to localStorage
  const saveStrokes = useCallback((updated: Stroke[]) => {
    try {
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const payload = {
          strokes: updated,
          width: rect.width,
          height: rect.height
        };
        localStorage.setItem(`vidyal_whiteboard_${moduleId}`, JSON.stringify(payload));
      } else {
        localStorage.setItem(`vidyal_whiteboard_${moduleId}`, JSON.stringify({ strokes: updated }));
      }
    } catch (e) {
      console.error('[Whiteboard] Failed to save strokes:', e);
    }
  }, [moduleId]);

  // Helper to update properties on selected stroke dynamically
  const updateSelectedStroke = useCallback((properties: Partial<Stroke>) => {
    if (!selectedStrokeId) return;
    setStrokes(prev => {
      const updated = prev.map(s => {
        if (s.id === selectedStrokeId) {
          return { ...s, ...properties };
        }
        return s;
      });
      saveStrokes(updated);
      return updated;
    });
  }, [selectedStrokeId, saveStrokes]);

  // Synchronize formatting states when a stroke is selected
  useEffect(() => {
    if (selectedStrokeId) {
      const selected = strokes.find(s => s.id === selectedStrokeId);
      if (selected) {
        setStrokeColor(selected.color);
        setStrokeWidth(selected.width);
        setStrokeOpacity(selected.opacity ?? 1);
        if (selected.isDashed !== undefined) setIsDashed(selected.isDashed);
        if (selected.isFilled !== undefined) setIsFilled(selected.isFilled);
        if (selected.fontStyle !== undefined) setFontStyle(selected.fontStyle);
        if (selected.isBold !== undefined) setIsBold(selected.isBold);
        if (selected.isItalic !== undefined) setIsItalic(selected.isItalic);
        if (selected.hasBackground !== undefined) setHasBackground(selected.hasBackground);
      }
    }
  }, [selectedStrokeId]); // Run only when selected ID changes

  // Custom setters that update both current tool state and selected stroke
  const updateStrokeColor = (color: string) => {
    setStrokeColor(color);
    if (selectedStrokeId) {
      updateSelectedStroke({ color });
    }
  };

  const updateStrokeWidth = (width: number) => {
    setStrokeWidth(width);
    if (selectedStrokeId) {
      updateSelectedStroke({ width });
    }
  };

  const updateStrokeOpacity = (opacity: number) => {
    setStrokeOpacity(opacity);
    if (selectedStrokeId) {
      updateSelectedStroke({ opacity });
    }
  };

  const updateIsDashed = (val: boolean) => {
    setIsDashed(val);
    if (selectedStrokeId) {
      updateSelectedStroke({ isDashed: val });
    }
  };

  const updateIsFilled = (val: boolean) => {
    setIsFilled(val);
    if (selectedStrokeId) {
      updateSelectedStroke({ isFilled: val });
    }
  };

  const updateFontStyle = (val: 'sans' | 'serif' | 'mono') => {
    setFontStyle(val);
    if (selectedStrokeId) {
      updateSelectedStroke({ fontStyle: val });
    }
  };

  const updateIsBold = (val: boolean) => {
    setIsBold(val);
    if (selectedStrokeId) {
      updateSelectedStroke({ isBold: val });
    }
  };

  const updateIsItalic = (val: boolean) => {
    setIsItalic(val);
    if (selectedStrokeId) {
      updateSelectedStroke({ isItalic: val });
    }
  };

  const updateHasBackground = (val: boolean) => {
    setHasBackground(val);
    if (selectedStrokeId) {
      updateSelectedStroke({ hasBackground: val });
    }
  };

  // Load sketches from localStorage per module
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`vidyal_whiteboard_${moduleId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        let loadedStrokes: Stroke[] = [];
        if (Array.isArray(parsed)) {
          loadedStrokes = parsed;
        } else if (parsed && Array.isArray(parsed.strokes)) {
          loadedStrokes = parsed.strokes;
          const container = containerRef.current;
          if (container && parsed.width && parsed.height) {
            const rect = container.getBoundingClientRect();
            const scaleX = rect.width / parsed.width;
            const scaleY = rect.height / parsed.height;
            const scale = Math.min(scaleX, scaleY);
            if (scale > 0 && scale !== 1 && !isNaN(scale) && isFinite(scale)) {
              loadedStrokes = loadedStrokes.map((s: Stroke) => ({
                ...s,
                width: s.width * scale,
                points: s.points.map(p => ({
                  x: p.x * scale,
                  y: p.y * scale
                }))
              }));
            }
          }
        }
        setStrokes(loadedStrokes);
        setRedoStrokes([]);
        setSelectedStrokeId(null);
      } else {
        setStrokes([]);
        setRedoStrokes([]);
        setSelectedStrokeId(null);
      }
    } catch (e) {
      console.error('[Whiteboard] Failed to restore strokes:', e);
    }
  }, [moduleId]);



  const getResolvedColor = useCallback((color: string) => {
    if (color === 'DYNAMIC') {
      return isZenMode ? '#fafbfc' : '#0f172a';
    }
    return color;
  }, [isZenMode]);

  // Find vector stroke nearest to coordinates (Hit Testing)
  const findStrokeAt = useCallback((x: number, y: number): Stroke | null => {
    for (let i = strokes.length - 1; i >= 0; i--) {
      const stroke = strokes[i];
      if (stroke.points.length === 0) continue;

      const p0 = stroke.points[0];

      if (stroke.type === 'text' && stroke.text) {
        // Use canvas measureText for accurate text bounding box
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        const size = stroke.width * 2 + 12;
        let fontFamily = 'Inter, system-ui, sans-serif';
        if (stroke.fontStyle === 'serif') fontFamily = 'Georgia, serif';
        if (stroke.fontStyle === 'mono') fontFamily = 'ui-monospace, monospace';
        let stylePrefix = '';
        if (stroke.isItalic) stylePrefix += 'italic ';
        if (stroke.isBold) stylePrefix += 'bold ';
        if (ctx) {
          ctx.font = `${stylePrefix}${size}px ${fontFamily}`;
          const measured = ctx.measureText(stroke.text).width;
          if (x >= p0.x - 8 && x <= p0.x + measured + 8 && y >= p0.y - 6 && y <= p0.y + size + 6) {
            return stroke;
          }
        } else {
          const charWidth = size * 0.6;
          const w = stroke.text.length * charWidth;
          if (x >= p0.x - 8 && x <= p0.x + w + 8 && y >= p0.y - 6 && y <= p0.y + size + 6) {
            return stroke;
          }
        }
      } else if (stroke.type === 'rect' && stroke.points.length > 1) {
        const pEnd = stroke.points[stroke.points.length - 1];
        const minX = Math.min(p0.x, pEnd.x);
        const maxX = Math.max(p0.x, pEnd.x);
        const minY = Math.min(p0.y, pEnd.y);
        const maxY = Math.max(p0.y, pEnd.y);
        if (stroke.isFilled) {
          if (x >= minX - 8 && x <= maxX + 8 && y >= minY - 8 && y <= maxY + 8) {
            return stroke;
          }
        } else {
          // Check if near any of the 4 borders (tolerance 8px)
          const nearLeft = Math.abs(x - minX) <= 8 && y >= minY - 8 && y <= maxY + 8;
          const nearRight = Math.abs(x - maxX) <= 8 && y >= minY - 8 && y <= maxY + 8;
          const nearTop = Math.abs(y - minY) <= 8 && x >= minX - 8 && x <= maxX + 8;
          const nearBottom = Math.abs(y - maxY) <= 8 && x >= minX - 8 && x <= maxX + 8;
          if (nearLeft || nearRight || nearTop || nearBottom) {
            return stroke;
          }
        }
      } else if (stroke.type === 'circle' && stroke.points.length > 1) {
        const pEnd = stroke.points[stroke.points.length - 1];
        const radius = Math.sqrt(Math.pow(pEnd.x - p0.x, 2) + Math.pow(pEnd.y - p0.y, 2));
        const dist = Math.sqrt(Math.pow(x - p0.x, 2) + Math.pow(y - p0.y, 2));
        if (stroke.isFilled && dist <= radius + 5) return stroke;
        else if (Math.abs(dist - radius) <= 12) return stroke;
      } else {
        for (const p of stroke.points) {
          const dist = Math.sqrt(Math.pow(x - p.x, 2) + Math.pow(y - p.y, 2));
          if (dist <= Math.max(12, stroke.width + 6)) return stroke;
        }
      }
    }
    return null;
  }, [strokes]);

  // Main Vector Redrawing Canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx, canvas.width, canvas.height);

    // Branded watermark when empty
    if (strokes.length === 0 && !currentStroke) {
      ctx.save();
      ctx.globalAlpha = isZenMode ? 0.018 : 0.04;
      ctx.font = 'bold 13px Inter, system-ui, sans-serif';
      ctx.fillStyle = isZenMode ? '#ffffff' : '#4e5bff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const cx = canvas.width / 2 / (window.devicePixelRatio || 1);
      const cy = canvas.height / 2 / (window.devicePixelRatio || 1);
      ctx.fillText('VIDYAL.AI', cx, cy - 14);
      ctx.font = '10px Inter, system-ui, sans-serif';
      ctx.fillText('Interactive Canvas', cx, cy + 4);
      ctx.restore();
    }

    const drawStroke = (stroke: Stroke) => {
      if (stroke.points.length === 0) return;
      ctx.save();
      ctx.beginPath();

      const resolvedColor = getResolvedColor(stroke.color);
      const opacity = stroke.opacity ?? 1;
      ctx.strokeStyle = resolvedColor;
      ctx.fillStyle = resolvedColor;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = opacity;

      if (stroke.isDashed) {
        ctx.setLineDash([stroke.width * 2, stroke.width * 2]);
      } else {
        ctx.setLineDash([]);
      }

      if (stroke.type === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = stroke.width * 2.5;
        ctx.globalAlpha = 1;
      } else if (stroke.type === 'highlighter') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.35 * opacity;
        ctx.strokeStyle = resolvedColor;
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }

      const p0 = stroke.points[0];

      if (stroke.type === 'pencil' || stroke.type === 'eraser' || stroke.type === 'highlighter') {
        if (stroke.points.length === 1) {
          ctx.arc(p0.x, p0.y, stroke.width / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.moveTo(p0.x, p0.y);
          for (let i = 1; i < stroke.points.length; i++) {
            const p = stroke.points[i];
            ctx.lineTo(p.x, p.y);
          }
          ctx.stroke();
        }
      } else if (stroke.type === 'line' && stroke.points.length > 1) {
        const pEnd = stroke.points[stroke.points.length - 1];
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(pEnd.x, pEnd.y);
        ctx.stroke();
      } else if (stroke.type === 'arrow' && stroke.points.length > 1) {
        const pEnd = stroke.points[stroke.points.length - 1];
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(pEnd.x, pEnd.y);
        ctx.stroke();

        const angle = Math.atan2(pEnd.y - p0.y, pEnd.x - p0.x);
        const headLength = Math.max(12, stroke.width * 2.5);
        ctx.beginPath();
        ctx.setLineDash([]);
        ctx.moveTo(pEnd.x, pEnd.y);
        ctx.lineTo(
          pEnd.x - headLength * Math.cos(angle - Math.PI / 6),
          pEnd.y - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(pEnd.x, pEnd.y);
        ctx.lineTo(
          pEnd.x - headLength * Math.cos(angle + Math.PI / 6),
          pEnd.y - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
      } else if (stroke.type === 'rect' && stroke.points.length > 1) {
        const pEnd = stroke.points[stroke.points.length - 1];
        const w = pEnd.x - p0.x;
        const h = pEnd.y - p0.y;
        if (stroke.isFilled) {
          ctx.fillStyle = `${resolvedColor}20`;
          ctx.fillRect(p0.x, p0.y, w, h);
        }
        ctx.strokeRect(p0.x, p0.y, w, h);
      } else if (stroke.type === 'circle' && stroke.points.length > 1) {
        const pEnd = stroke.points[stroke.points.length - 1];
        const radius = Math.sqrt(Math.pow(pEnd.x - p0.x, 2) + Math.pow(pEnd.y - p0.y, 2));
        ctx.arc(p0.x, p0.y, radius, 0, Math.PI * 2);
        if (stroke.isFilled) {
          ctx.fillStyle = `${resolvedColor}20`;
          ctx.fill();
        }
        ctx.stroke();
      } else if (stroke.type === 'text' && stroke.text) {
        ctx.globalCompositeOperation = 'source-over';
        let stylePrefix = '';
        if (stroke.isItalic) stylePrefix += 'italic ';
        if (stroke.isBold) stylePrefix += 'bold ';
        let fontFamily = 'Inter, system-ui, sans-serif';
        if (stroke.fontStyle === 'serif') fontFamily = 'Georgia, serif';
        if (stroke.fontStyle === 'mono') fontFamily = 'ui-monospace, monospace';
        const fontSize = stroke.width * 2 + 12;
        ctx.font = `${stylePrefix}${fontSize}px ${fontFamily}`;
        ctx.textBaseline = 'top';
        const textWidth = ctx.measureText(stroke.text).width;
        const textHeight = fontSize;
        const padX = 8;
        const padY = 5;
        if (stroke.hasBackground) {
          ctx.fillStyle = isZenMode ? 'rgba(12, 14, 20, 0.88)' : 'rgba(255, 255, 255, 0.9)';
          ctx.strokeStyle = `${resolvedColor}33`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(p0.x - padX, p0.y - padY, textWidth + padX * 2, textHeight + padY * 2, 8);
          ctx.fill();
          ctx.stroke();
        }
        ctx.fillStyle = resolvedColor;
        ctx.fillText(stroke.text, p0.x, p0.y);
      }
      ctx.restore();
    };

    // First pass: Draw highlighters
    strokes.filter(s => s.type === 'highlighter').forEach(drawStroke);
    if (currentStroke && currentStroke.type === 'highlighter') drawStroke(currentStroke);

    // Second pass: Draw other strokes (pencil, lines, shapes, text, eraser)
    strokes.filter(s => s.type !== 'highlighter').forEach(drawStroke);
    if (currentStroke && currentStroke.type !== 'highlighter') drawStroke(currentStroke);

    // Figma-grade selection overlay — circular corner handles + glowing border
    if (activeTool === 'select' && selectedStrokeId) {
      const selected = strokes.find(s => s.id === selectedStrokeId);
      if (selected && selected.points.length > 0) {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        
        if (selected.type === 'circle' && selected.points.length > 1) {
          const p0 = selected.points[0];
          const pEnd = selected.points[selected.points.length - 1];
          const radius = Math.sqrt(Math.pow(pEnd.x - p0.x, 2) + Math.pow(pEnd.y - p0.y, 2));
          minX = p0.x - radius;
          maxX = p0.x + radius;
          minY = p0.y - radius;
          maxY = p0.y + radius;
        } else {
          selected.points.forEach(p => {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
          });
        }
        
        minX -= 10; maxX += 10; minY -= 10; maxY += 10;

        ctx.save();
        // Glow shadow behind dashed box
        ctx.shadowColor = '#4e5bff';
        ctx.shadowBlur = 6;
        ctx.strokeStyle = '#4e5bff';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.roundRect(minX, minY, maxX - minX, maxY - minY, 8);
        ctx.stroke();

        // Circular premium handles
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#4e5bff';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);

        const corners = [
          [minX, minY], [maxX, minY], [minX, maxY], [maxX, maxY]
        ];
        for (const [hx, hy] of corners) {
          ctx.beginPath();
          ctx.arc(hx, hy, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  }, [strokes, currentStroke, selectedStrokeId, activeTool, isZenMode, getResolvedColor]); // eslint-disable-line react-hooks/exhaustive-deps

  const drawGrid = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    if (gridType === 'none') return;
    ctx.save();
    ctx.strokeStyle = isZenMode ? 'rgba(255,255,255,0.03)' : 'rgba(78,91,255,0.05)';
    ctx.fillStyle = isZenMode ? 'rgba(255,255,255,0.04)' : 'rgba(78,91,255,0.07)';
    ctx.lineWidth = 0.8;
    const size = 30;
    if (gridType === 'dots') {
      for (let x = size; x < w; x += size) {
        for (let y = size; y < h; y += size) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (gridType === 'lines') {
      ctx.beginPath();
      for (let x = size; x < w; x += size) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = size; y < h; y += size) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  };

  const syncCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    const newWidth = rect.width;
    const newHeight = rect.height;

    if (lastSizeRef.current && (lastSizeRef.current.width !== newWidth || lastSizeRef.current.height !== newHeight) && lastSizeRef.current.width > 0 && lastSizeRef.current.height > 0) {
      const scaleX = newWidth / lastSizeRef.current.width;
      const scaleY = newHeight / lastSizeRef.current.height;
      const scale = Math.min(scaleX, scaleY);

      if (scale > 0 && scale !== 1 && !isNaN(scale) && isFinite(scale)) {
        setStrokes(prev => {
          const updated = prev.map(s => ({
            ...s,
            width: s.width * scale,
            points: s.points.map(p => ({
              x: p.x * scale,
              y: p.y * scale
            }))
          }));

          try {
            const payload = {
              strokes: updated,
              width: newWidth,
              height: newHeight
            };
            localStorage.setItem(`vidyal_whiteboard_${moduleId}`, JSON.stringify(payload));
          } catch (e) {}

          return updated;
        });
      }
    }

    lastSizeRef.current = { width: newWidth, height: newHeight };

    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.resetTransform();
      ctx.scale(dpr, dpr);
    }
    redrawCanvas();
  }, [redrawCanvas, moduleId]);

  useEffect(() => {
    syncCanvasSize();
    const timeout = setTimeout(syncCanvasSize, 50);
    window.addEventListener('resize', syncCanvasSize);
    return () => {
      window.removeEventListener('resize', syncCanvasSize);
      clearTimeout(timeout);
    };
  }, [syncCanvasSize]);

  // ── KEYBOARD SHORTCUTS ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't fire when typing in text input or other inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      const isMeta = e.metaKey || e.ctrlKey;

      // Tool selection shortcuts (when not using cmd/ctrl)
      if (!isMeta && !e.altKey) {
        const key = e.key.toLowerCase();
        const toolMap: Record<string, { id: Stroke['type']; name: string }> = {
          s: { id: 'select', name: 'Select' },
          p: { id: 'pencil', name: 'Pencil' },
          h: { id: 'highlighter', name: 'Highlighter' },
          e: { id: 'eraser', name: 'Eraser' },
          l: { id: 'line', name: 'Line' },
          a: { id: 'arrow', name: 'Arrow' },
          r: { id: 'rect', name: 'Rectangle' },
          c: { id: 'circle', name: 'Circle' },
          t: { id: 'text', name: 'Text' }
        };
        if (toolMap[key]) {
          e.preventDefault();
          const tool = toolMap[key];
          setActiveTool(tool.id);
          setTextInput(null);
          if (tool.id !== 'select') setSelectedStrokeId(null);
          toast.info(`${tool.name} tool active`);
          return;
        }
      }

      // Escape — deselect / cancel text
      if (e.key === 'Escape') {
        setSelectedStrokeId(null);
        setTextInput(null);
        return;
      }

      // Cmd+Z — undo
      if (isMeta && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        setStrokes(prev => {
          if (prev.length === 0) return prev;
          const next = [...prev];
          const undone = next.pop()!;
          setRedoStrokes(r => [undone, ...r]);
          setSelectedStrokeId(null);
          saveStrokes(next);
          return next;
        });
        return;
      }

      // Cmd+Shift+Z — redo
      if (isMeta && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        setRedoStrokes(prev => {
          if (prev.length === 0) return prev;
          const next = [...prev];
          const redone = next.shift()!;
          setStrokes(s => {
            const updated = [...s, redone];
            saveStrokes(updated);
            return updated;
          });
          return next;
        });
        return;
      }

      // Delete / Backspace — delete selected stroke
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedStrokeId) {
        e.preventDefault();
        setStrokes(prev => {
          const updated = prev.filter(s => s.id !== selectedStrokeId);
          saveStrokes(updated);
          return updated;
        });
        setSelectedStrokeId(null);
        toast.success('Element deleted');
        return;
      }

      // Nudge selected stroke with Arrow keys
      if (selectedStrokeId && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const amount = e.shiftKey ? 10 : 1;
        let dx = 0;
        let dy = 0;
        if (e.key === 'ArrowUp') dy = -amount;
        if (e.key === 'ArrowDown') dy = amount;
        if (e.key === 'ArrowLeft') dx = -amount;
        if (e.key === 'ArrowRight') dx = amount;

        setStrokes(prev => {
          const updated = prev.map(s => {
            if (s.id === selectedStrokeId) {
              return {
                ...s,
                points: s.points.map(p => ({ x: p.x + dx, y: p.y + dy }))
              };
            }
            return s;
          });
          saveStrokes(updated);
          return updated;
        });
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedStrokeId, saveStrokes]);

  const handleHoverMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cursorRef.current || !containerRef.current) return;
    const isCustomCursorTool = ['pencil', 'highlighter', 'eraser'].includes(activeTool);
    if (!isCustomCursorTool) {
      cursorRef.current.style.display = 'none';
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);

    // Stop continuous micro-layout reflows & flickering when pointer is stationary
    if (lastCursorPosRef.current && lastCursorPosRef.current.x === x && lastCursorPosRef.current.y === y) {
      return;
    }
    lastCursorPosRef.current = { x, y };

    cursorRef.current.style.left = `${x}px`;
    cursorRef.current.style.top = `${y}px`;
    cursorRef.current.style.display = 'block';
  };

  const handleHoverMouseLeave = () => {
    if (cursorRef.current) {
      cursorRef.current.style.display = 'none';
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== 'select') return;
    const pos = getCanvasCoords(e);
    const hit = findStrokeAt(pos.x, pos.y);
    if (hit && hit.type === 'text') {
      setSelectedStrokeId(null);
      setEditingTextStroke(hit);
      setTextInput({
        x: hit.points[0].x,
        y: hit.points[0].y,
        val: hit.text || ''
      });
      setStrokes(prev => prev.filter(s => s.id !== hit.id));
    }
  };

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent): StrokePoint => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;
    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const handleStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (textInput) {
      commitTextInput();
      return;
    }

    const pos = getCanvasCoords(e);

    if (activeTool === 'select') {
      e.preventDefault();
      const hit = findStrokeAt(pos.x, pos.y);
      if (hit) {
        setSelectedStrokeId(hit.id);
        dragStartRef.current = pos;
        dragOriginalPointsRef.current = hit.points.map(p => ({ ...p }));
        isDraggingRef.current = false;
        if (containerRef.current) {
          containerRef.current.classList.remove('cursor-grab', 'cursor-default');
          containerRef.current.classList.add('cursor-grabbing');
        }
      } else {
        setSelectedStrokeId(null);
      }
      return;
    }

    if (activeTool === 'text') {
      e.preventDefault();
      setTextInput({ x: pos.x, y: pos.y, val: '' });
      return;
    }

    e.preventDefault();
    const strokeId = `stroke-${Date.now()}-${Math.random()}`;
    const newStroke: Stroke = {
      id: strokeId,
      type: activeTool,
      points: [pos],
      color: activeTool === 'eraser' ? 'DYNAMIC' : strokeColor,
      width: strokeWidth,
      opacity: strokeOpacity,
      isDashed,
      isFilled
    };
    setCurrentStroke(newStroke);
    setRedoStrokes([]);
  };

  const handleMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    // Skip entirely if nothing active
    if (activeTool === 'select' && !selectedStrokeId && !dragStartRef.current) return;
    if (activeTool !== 'select' && !currentStroke) return;

    e.preventDefault();
    const pos = getCanvasCoords(e);

    if (activeTool === 'select' && selectedStrokeId && dragStartRef.current) {
      if (!isDraggingRef.current) {
        isDraggingRef.current = true;
        if (containerRef.current) {
          containerRef.current.classList.remove('cursor-grab', 'cursor-default');
          containerRef.current.classList.add('cursor-grabbing');
        }
      }
      const dx = pos.x - dragStartRef.current.x;
      const dy = pos.y - dragStartRef.current.y;
      setStrokes(prev => prev.map(s => {
        if (s.id === selectedStrokeId) {
          return {
            ...s,
            points: dragOriginalPointsRef.current.map(p => ({ x: p.x + dx, y: p.y + dy }))
          };
        }
        return s;
      }));
      return;
    }

    if (!currentStroke) return;

    if (
      currentStroke.type === 'pencil' ||
      currentStroke.type === 'eraser' ||
      currentStroke.type === 'highlighter'
    ) {
      setCurrentStroke(prev => prev ? { ...prev, points: [...prev.points, pos] } : null);
    } else {
      setCurrentStroke(prev => prev ? { ...prev, points: [prev.points[0], pos] } : null);
    }
  };

  const handleEnd = () => {
    if (activeTool === 'select') {
      if (isDraggingRef.current) {
        saveStrokes(strokes);
      }
      dragStartRef.current = null;
      dragOriginalPointsRef.current = [];
      isDraggingRef.current = false;
      if (containerRef.current) {
        containerRef.current.classList.remove('cursor-grabbing');
        if (selectedStrokeId) {
          containerRef.current.classList.add('cursor-grab');
        } else {
          containerRef.current.classList.add('cursor-default');
        }
      }
      return;
    }

    if (!currentStroke) return;
    if (
      ['pencil', 'eraser', 'highlighter'].includes(currentStroke.type) &&
      currentStroke.points.length < 2
    ) {
      setCurrentStroke(null);
      return;
    }

    const updated = [...strokes, currentStroke];
    setStrokes(updated);
    saveStrokes(updated);
    setCurrentStroke(null);
  };

  const commitTextInput = () => {
    if (!textInput) return;

    if (!textInput.val.trim()) {
      setTextInput(null);
      setEditingTextStroke(null);
      return;
    }
    const newStroke: Stroke = {
      id: editingTextStroke ? editingTextStroke.id : `stroke-text-${Date.now()}`,
      type: 'text',
      points: [{ x: textInput.x, y: textInput.y }],
      color: strokeColor,
      width: strokeWidth,
      opacity: strokeOpacity,
      text: textInput.val.trim(),
      fontStyle,
      isBold,
      isItalic,
      hasBackground
    };
    const updated = [...strokes, newStroke];
    setStrokes(updated);
    saveStrokes(updated);
    setTextInput(null);
    setEditingTextStroke(null);
  };

  const handleUndo = () => {
    if (strokes.length === 0) return;
    const activeHistory = [...strokes];
    const undone = activeHistory.pop();
    if (undone) {
      setStrokes(activeHistory);
      saveStrokes(activeHistory);
      setRedoStrokes(prev => [undone, ...prev]);
      setSelectedStrokeId(null);
    }
  };

  const handleRedo = () => {
    if (redoStrokes.length === 0) return;
    const activeRedo = [...redoStrokes];
    const redone = activeRedo.shift();
    if (redone) {
      const updated = [...strokes, redone];
      setStrokes(updated);
      saveStrokes(updated);
      setRedoStrokes(activeRedo);
    }
  };

  const handleClear = () => {
    if (strokes.length === 0) return;
    setShowClearModal(true);
  };

  const confirmClear = () => {
    setStrokes([]);
    saveStrokes([]);
    setRedoStrokes([]);
    setSelectedStrokeId(null);
    setShowClearModal(false);
    toast.success('Whiteboard cleared!');
  };

  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas || strokes.length === 0) {
      toast.warning('Canvas is empty. Draw some ideas first.');
      return;
    }
    try {
      const dataUrl = canvas.toDataURL('image/png');
      if (onSaveToVault) {
        onSaveToVault(dataUrl);
      } else {
        const link = document.createElement('a');
        link.download = `vidyal_sketch_${moduleId}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Drawing exported as PNG!');
      }
    } catch (e) {
      toast.error('Failed to compile drawing asset.');
    }
  };

  const handleAIScan = () => {
    const canvas = canvasRef.current;
    if (!canvas || strokes.length === 0) {
      toast.warning('Canvas is empty. Draw a conceptual sketch or formula first.');
      return;
    }
    try {
      const dataUrl = canvas.toDataURL('image/png');
      if (onScanSketch) {
        onScanSketch(dataUrl);
      } else {
        toast.info('🧠 Diagram submitted to SARA for analysis.');
      }
    } catch (e) {
      toast.error('AI Scan interrupted.');
    }
  };

  const compileInputStyles = (): React.CSSProperties => {
    if (!textInput) return {};
    let styles: React.CSSProperties = { fontFamily: 'Inter, system-ui, sans-serif' };
    if (fontStyle === 'serif') styles.fontFamily = 'Georgia, serif';
    if (fontStyle === 'mono') styles.fontFamily = 'ui-monospace, monospace';
    if (isBold) styles.fontWeight = 'bold';
    if (isItalic) styles.fontStyle = 'italic';
    const size = strokeWidth * 2 + 12;
    styles.fontSize = `${size}px`;
    styles.color = getResolvedColor(strokeColor);
    return styles;
  };

  const resolvedActiveColor = getResolvedColor(strokeColor);

  // Dynamic cursor for canvas
  const activeCursor = activeTool === 'select' && selectedStrokeId
    ? 'cursor-grab'
    : TOOL_CURSORS[activeTool] || 'cursor-crosshair';
  const isDrawingOrDragging = !!currentStroke || isDraggingRef.current;
  const selectedStroke = selectedStrokeId ? strokes.find(s => s.id === selectedStrokeId) : null;

  return (
    <div className="flex flex-col w-full h-full relative select-none overflow-hidden">
      {/* ── CANVAS DRAWING VIEWPORT ── */}
      <div
        ref={containerRef}
        className={`flex-1 w-full h-full relative z-10 overflow-hidden bg-transparent ${activeCursor}`}
        onClick={() => {
          if (showFormattingPopover) setShowFormattingPopover(false);
        }}
        onMouseMove={handleHoverMouseMove}
        onMouseLeave={handleHoverMouseLeave}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onDoubleClick={handleDoubleClick}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
          className="absolute inset-0 block bg-transparent"
        />

        {/* Floating Custom Circle Brush Cursor */}
        <div
          ref={cursorRef}
          className="pointer-events-none absolute z-[9999] rounded-full border border-white/40 -translate-x-1/2 -translate-y-1/2 shadow-[0_0_8px_rgba(0,0,0,0.15)] hidden"
          style={{
            width: activeTool === 'eraser' ? `${strokeWidth * 2.5 * 2}px` : `${strokeWidth}px`,
            height: activeTool === 'eraser' ? `${strokeWidth * 2.5 * 2}px` : `${strokeWidth}px`,
            backgroundColor: activeTool === 'eraser' 
              ? 'transparent' 
              : activeTool === 'highlighter' 
                ? `${resolvedActiveColor}55` 
                : resolvedActiveColor,
            borderStyle: activeTool === 'eraser' ? 'dashed' : 'solid',
            borderColor: activeTool === 'eraser' ? (isZenMode ? '#ffffff' : '#000000') : 'rgba(255,255,255,0.4)',
          }}
        />

        {/* ── Contextual Left Properties Panel ── */}
        {activeTool !== 'eraser' && (
          <div
            onMouseDown={e => e.stopPropagation()}
            onTouchStart={e => e.stopPropagation()}
            className={`absolute top-4 left-4 z-20 flex flex-col gap-3.5 p-4 w-60 rounded-2xl border backdrop-blur-xl shadow-xl transition-all duration-300 ${
              isDrawingOrDragging ? 'opacity-10 pointer-events-none hover:opacity-100 hover:pointer-events-auto' : 'opacity-100'
            } ${
              isZenMode
                ? 'bg-[#0c0e14]/80 border-white/10 text-slate-300'
                : 'bg-white/75 border-slate-200/65 text-slate-600 shadow-slate-200/30'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-2 border-slate-200/30 dark:border-white/5">
              <span className={`text-[10px] font-black uppercase tracking-widest ${isZenMode ? 'text-indigo-400' : 'text-[#4e5bff]'}`}>
                {selectedStroke ? 'Element Customizer' : `${activeTool.toUpperCase()} Tool`}
              </span>
              {selectedStroke && (
                <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-bold uppercase">
                  {selectedStroke.type}
                </span>
              )}
            </div>

            {/* Color section (relevant for everything except eraser/select without selection) */}
            {(selectedStroke || (activeTool !== 'select')) && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Swatches</span>
                  <div
                    className="w-2.5 h-2.5 rounded-full shadow-inner border border-white/20"
                    style={{ backgroundColor: resolvedActiveColor }}
                  />
                </div>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {PRESETS.colors.map(c => {
                    const active = strokeColor === c.value;
                    const isDynamic = c.value === 'DYNAMIC';
                    const resolvedBg = isDynamic ? (isZenMode ? '#fafbfc' : '#0f172a') : c.value;
                    return (
                      <button
                        key={c.value}
                        onClick={() => setStrokeColor(c.value)}
                        title={c.label}
                        className={`w-5 h-5 rounded-full border transition-all active:scale-90 cursor-pointer flex items-center justify-center ${
                          active
                            ? 'ring-2 ring-[#4e5bff] ring-offset-1 scale-110 border-transparent'
                            : isZenMode
                              ? 'border-white/10 hover:scale-105 hover:border-white/30'
                              : 'border-slate-200 hover:scale-105 hover:border-slate-350'
                        }`}
                        style={{ backgroundColor: resolvedBg }}
                      >
                        {isDynamic && (
                          <div className={`w-1 h-1 rounded-full ${isZenMode ? 'bg-[#0f172a]' : 'bg-white'}`} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Width section */}
            {(selectedStroke || (activeTool !== 'select')) && (
              <div className="flex flex-col gap-1.5 border-t pt-2.5 border-slate-200/30 dark:border-white/5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Thickness</span>
                <div className="flex gap-1">
                  {PRESETS.widths.map(w => (
                    <button
                      key={w.value}
                      onClick={() => setStrokeWidth(w.value)}
                      className={`flex-1 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer border ${
                        strokeWidth === w.value
                          ? 'bg-[#4e5bff]/10 border-indigo-500/30 text-[#4e5bff]'
                          : isZenMode
                            ? 'text-slate-400 border-white/5 hover:border-white/10 bg-white/[0.02]'
                            : 'text-slate-400 border-slate-200/50 hover:border-slate-250 bg-slate-50/50'
                      }`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Opacity slider */}
            {(selectedStroke || (activeTool !== 'select')) && (
              <div className="flex flex-col gap-1.5 border-t pt-2.5 border-slate-200/30 dark:border-white/5">
                <div className="flex items-center justify-between text-[9px] font-bold text-slate-400">
                  <span className="uppercase tracking-wider">Opacity</span>
                  <span className="font-mono">{Math.round(strokeOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={Math.round(strokeOpacity * 100)}
                  onChange={e => setStrokeOpacity(Number(e.target.value) / 100)}
                  className="w-full h-1 rounded-full cursor-pointer accent-[#4e5bff] bg-slate-200 dark:bg-white/10"
                />
              </div>
            )}

            {/* Text options */}
            {((selectedStroke && selectedStroke.type === 'text') || activeTool === 'text') && (
              <div className="flex flex-col gap-2 border-t pt-2.5 border-slate-200/30 dark:border-white/5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Typography</span>
                
                {/* Font Family */}
                <div className="flex items-center justify-between text-[8.5px]">
                  <span className="font-bold text-slate-400">Font</span>
                  <div className={`flex p-0.5 rounded-lg border ${isZenMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200/40'}`}>
                    {(['sans', 'serif', 'mono'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setFontStyle(f)}
                        className={`px-1.5 py-0.5 rounded text-[8px] font-bold cursor-pointer transition-all ${
                          fontStyle === f
                            ? 'bg-[#4e5bff] text-white shadow-sm'
                            : isZenMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Styles (Bold, Italic) */}
                <div className="flex items-center justify-between text-[8.5px]">
                  <span className="font-bold text-slate-400">Weight / Style</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setIsBold(!isBold)}
                      className={`w-6 py-0.5 rounded border text-[8px] font-black cursor-pointer transition-all ${
                        isBold
                          ? 'bg-[#4e5bff] border-[#4e5bff] text-white shadow-sm'
                          : isZenMode ? 'border-white/10 text-slate-400 hover:text-slate-200' : 'border-slate-200 text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      B
                    </button>
                    <button
                      onClick={() => setIsItalic(!isItalic)}
                      className={`w-6 py-0.5 rounded border text-[8px] font-black italic cursor-pointer transition-all ${
                        isItalic
                          ? 'bg-[#4e5bff] border-[#4e5bff] text-white shadow-sm'
                          : isZenMode ? 'border-white/10 text-slate-400 hover:text-slate-200' : 'border-slate-200 text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      I
                    </button>
                  </div>
                </div>

                {/* Background capsule card */}
                <div className="flex items-center justify-between text-[8.5px]">
                  <span className="font-bold text-slate-400">Capsule Card</span>
                  <button
                    onClick={() => setHasBackground(!hasBackground)}
                    className={`px-2 py-0.5 rounded-lg border text-[8px] font-black transition-all cursor-pointer ${
                      hasBackground
                        ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-500'
                        : isZenMode
                          ? 'border-white/10 text-slate-400 hover:border-white/20'
                          : 'border-slate-200 text-slate-400 hover:border-slate-350'
                    }`}
                  >
                    {hasBackground ? 'Active' : 'None'}
                  </button>
                </div>
              </div>
            )}

            {/* Shape options (dashed, filled) */}
            {((selectedStroke && ['rect', 'circle', 'line', 'arrow'].includes(selectedStroke.type)) || ['rect', 'circle', 'line', 'arrow'].includes(activeTool)) && (
              <div className="flex flex-col gap-2 border-t pt-2.5 border-slate-200/30 dark:border-white/5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Stroke & Fill</span>
                
                {/* Dashed line */}
                <div className="flex items-center justify-between text-[8.5px]">
                  <span className="font-bold text-slate-400">Stroke style</span>
                  <div className={`flex p-0.5 rounded-lg border ${isZenMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200/40'}`}>
                    <button
                      onClick={() => setIsDashed(false)}
                      className={`px-2 py-0.5 rounded text-[8px] font-bold cursor-pointer transition-all ${
                        !isDashed
                          ? 'bg-[#4e5bff] text-white shadow-sm'
                          : isZenMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Solid
                    </button>
                    <button
                      onClick={() => setIsDashed(true)}
                      className={`px-2 py-0.5 rounded text-[8px] font-bold cursor-pointer transition-all ${
                        isDashed
                          ? 'bg-[#4e5bff] text-white shadow-sm'
                          : isZenMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Dashed
                    </button>
                  </div>
                </div>

                {/* Translucent Fill (Only Rect or Circle) */}
                {((selectedStroke && ['rect', 'circle'].includes(selectedStroke.type)) || ['rect', 'circle'].includes(activeTool)) && (
                  <div className="flex items-center justify-between text-[8.5px]">
                    <span className="font-bold text-slate-400">Fill Shape</span>
                    <button
                      onClick={() => setIsFilled(!isFilled)}
                      className={`px-2 py-0.5 rounded-lg border text-[8px] font-black transition-all cursor-pointer ${
                        isFilled
                          ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-500'
                          : isZenMode
                            ? 'border-white/10 text-slate-400 hover:border-white/20'
                            : 'border-slate-200 text-slate-400 hover:border-slate-355'
                      }`}
                    >
                      {isFilled ? 'Translucent' : 'Empty'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Selection delete button inside panel */}
            {selectedStroke && (
              <button
                onClick={() => {
                  setStrokes(prev => prev.filter(s => s.id !== selectedStrokeId));
                  saveStrokes(strokes.filter(s => s.id !== selectedStrokeId));
                  setSelectedStrokeId(null);
                  toast.success('Element deleted');
                }}
                className="w-full mt-1.5 py-1.5 rounded-xl text-[8.5px] font-black uppercase tracking-wider text-rose-500 bg-rose-500/5 hover:bg-rose-500/15 border border-rose-500/20 active:scale-95 transition-all cursor-pointer text-center"
              >
                Delete Element
              </button>
            )}

            {/* General Canvas view settings when active tool is select and nothing selected */}
            {activeTool === 'select' && !selectedStrokeId && (
              <div className="flex flex-col gap-2.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Grid Overlay</span>
                <div className="grid grid-cols-3 gap-1">
                  {(['none', 'dots', 'lines'] as const).map(g => (
                    <button
                      key={g}
                      onClick={() => setGridType(g)}
                      className={`py-1 rounded-lg text-[8px] font-bold capitalize transition-all cursor-pointer border ${
                        gridType === g
                          ? 'bg-[#4e5bff]/10 border-indigo-500/30 text-[#4e5bff]'
                          : isZenMode
                            ? 'border-white/5 text-slate-400 hover:border-white/15 bg-white/[0.01]'
                            : 'border-slate-200/50 text-slate-400 hover:border-slate-250 bg-slate-50/50'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Floating Action Dock (Top-Right Action Deck) ── */}
        <div
          onMouseDown={e => e.stopPropagation()}
          onTouchStart={e => e.stopPropagation()}
          className={`absolute top-4 right-4 z-20 flex items-center gap-1.5 p-1.5 rounded-xl border backdrop-blur-xl shadow-xl transition-all duration-300 ${
            isDrawingOrDragging ? 'opacity-10 pointer-events-none hover:opacity-100 hover:pointer-events-auto' : 'opacity-100'
          } ${
            isZenMode
              ? 'bg-[#0c0e14]/80 border-white/10 shadow-black/40 text-slate-300'
              : 'bg-white/75 border-slate-200/65 shadow-slate-200/30 text-slate-600'
          }`}
        >
          {/* Voice Mode Listen */}
          {onListen && (
            <button
              onClick={onListen}
              title={audioState === 'playing' ? 'Pause audio lecture' : 'Read curriculum out loud'}
              className={`p-2 rounded-lg border transition-all active:scale-95 cursor-pointer flex items-center justify-center ${
                audioState === 'playing'
                  ? 'bg-rose-500/10 border-rose-500/35 text-rose-500 animate-pulse'
                  : audioState === 'paused'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                    : isZenMode
                      ? 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
                      : 'border-transparent text-slate-400 hover:text-slate-700 hover:bg-slate-100/70'
              }`}
            >
              <Volume2 size={13} className={audioState === 'playing' ? 'scale-110 text-rose-500' : ''} />
            </button>
          )}

          {onListen && <div className={`h-4 w-px ${isZenMode ? 'bg-white/10' : 'bg-slate-200/65'}`} />}

          {/* Undo */}
          <button
            onClick={handleUndo}
            disabled={strokes.length === 0}
            title="Undo (⌘Z)"
            className={`p-2 rounded-lg transition-all cursor-pointer disabled:opacity-25 disabled:pointer-events-none ${
              isZenMode ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5' : 'text-slate-450 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Undo2 size={13} />
          </button>

          {/* Redo */}
          <button
            onClick={handleRedo}
            disabled={redoStrokes.length === 0}
            title="Redo (⌘⇧Z)"
            className={`p-2 rounded-lg transition-all cursor-pointer disabled:opacity-25 disabled:pointer-events-none ${
              isZenMode ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5' : 'text-slate-455 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Redo2 size={13} />
          </button>

          {/* Clear */}
          <button
            onClick={handleClear}
            disabled={strokes.length === 0}
            title="Clear Board"
            className={`p-2 rounded-lg transition-all cursor-pointer disabled:opacity-25 disabled:pointer-events-none ${
              isZenMode ? 'text-slate-400 hover:text-rose-400 hover:bg-white/5' : 'text-slate-450 hover:text-rose-600 hover:bg-rose-50'
            }`}
          >
            <Trash2 size={13} />
          </button>

          <div className={`h-4 w-px ${isZenMode ? 'bg-white/10' : 'bg-slate-200/65'}`} />

          {/* Export PNG */}
          <button
            onClick={handleExportPNG}
            disabled={strokes.length === 0}
            title="Save sketch as PNG"
            className={`p-2 rounded-lg border transition-all active:scale-95 disabled:opacity-25 disabled:pointer-events-none flex items-center justify-center cursor-pointer ${
              isZenMode
                ? 'border-white/10 bg-white/5 text-slate-400 hover:text-[#4e5bff] hover:bg-white/10'
                : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-[#4e5bff] hover:bg-indigo-50'
            }`}
          >
            <Save size={13} />
          </button>

          {/* SARA Brain AI Scanning */}
          <button
            onClick={handleAIScan}
            disabled={strokes.length === 0}
            title="Ask SARA to read your diagram"
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#4e5bff] to-[#8b5cf6] text-white text-[8.5px] font-black uppercase tracking-wider shadow-sm hover:shadow active:scale-[0.97] disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1 cursor-pointer"
          >
            <Sparkles size={10} className="animate-pulse" /> SARA Scan
          </button>
        </div>

        {/* ── Floating Bottom Dock (Tool Selection) ── */}
        <div
          onMouseDown={e => e.stopPropagation()}
          onTouchStart={e => e.stopPropagation()}
          className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 p-1.5 rounded-2xl border backdrop-blur-xl shadow-2xl transition-all duration-300 ${
            isDrawingOrDragging ? 'opacity-10 pointer-events-none hover:opacity-100 hover:pointer-events-auto' : 'opacity-100'
          } ${
            isZenMode
              ? 'bg-[#0c0e14]/80 border-white/10 shadow-black/40 text-slate-300'
              : 'bg-white/75 border-slate-200/65 shadow-slate-200/30 text-slate-600'
          }`}
        >
          {[
            { id: 'select' as const, label: 'Select (S)', Icon: MousePointer, key: 'S' },
            { id: 'pencil' as const, label: 'Pencil (P)', Icon: PenTool, key: 'P' },
            { id: 'highlighter' as const, label: 'Highlighter (H)', Icon: Highlighter, key: 'H' },
            { id: 'eraser' as const, label: 'Eraser (E)', Icon: Eraser, key: 'E' },
            { id: 'line' as const, label: 'Line (L)', Icon: Minus, key: 'L' },
            { id: 'arrow' as const, label: 'Arrow (A)', Icon: ArrowRight, key: 'A' },
            { id: 'rect' as const, label: 'Rectangle (R)', Icon: Square, key: 'R' },
            { id: 'circle' as const, label: 'Circle (C)', Icon: Circle, key: 'C' },
            { id: 'text' as const, label: 'Text (T)', Icon: Type, key: 'T' }
          ].map(tool => (
            <button
              key={tool.id}
              onClick={() => {
                setActiveTool(tool.id);
                setTextInput(null);
                if (tool.id !== 'select') setSelectedStrokeId(null);
              }}
              title={tool.label}
              className={`relative p-2.5 rounded-xl transition-all active:scale-95 cursor-pointer flex flex-col items-center justify-center ${
                activeTool === tool.id
                  ? 'bg-[#4e5bff] text-white shadow-md shadow-indigo-500/30'
                  : isZenMode
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100/70'
              }`}
            >
              <tool.Icon size={14} />
              <span className={`absolute bottom-0.5 text-[6.5px] font-mono tracking-tight font-black transition-all ${
                activeTool === tool.id ? 'text-white/80' : 'text-slate-400/60'
              }`}>
                {tool.key}
              </span>
            </button>
          ))}
        </div>

        {/* Absolute positioned WYSIWYG text input overlay */}
        <AnimatePresence>
          {textInput && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                position: 'absolute',
                left: textInput.x,
                top: textInput.y,
                transform: 'translate(0, -50%)',
                zIndex: 50
              }}
              className={`flex items-center gap-1.5 p-1.5 rounded-xl shadow-2xl border ${
                isZenMode
                  ? 'bg-[#0c0e14]/95 border-white/10'
                  : 'bg-white border-slate-200'
              }`}
            >
              <input
                autoFocus
                type="text"
                placeholder="Type text here…"
                value={textInput.val}
                style={{ ...compileInputStyles(), minWidth: '120px', width: `${Math.max(120, textInput.val.length * 10)}px`, maxWidth: '480px' }}
                onChange={e => setTextInput(prev => prev ? { ...prev, val: e.target.value } : null)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    commitTextInput();
                  } else if (e.key === 'Escape') {
                    if (editingTextStroke) {
                      setStrokes(prev => {
                        const updated = [...prev, editingTextStroke];
                        saveStrokes(updated);
                        return updated;
                      });
                    }
                    setTextInput(null);
                    setEditingTextStroke(null);
                  }
                }}
                className="px-2.5 py-1 text-[13px] font-semibold outline-none bg-transparent border-none transition-all"
              />
              <button
                onClick={e => { e.stopPropagation(); commitTextInput(); }}
                title="Commit Text (Enter)"
                className="p-1.5 rounded-lg bg-[#4e5bff] hover:bg-[#3d46cc] text-white transition-all cursor-pointer shrink-0 flex items-center justify-center shadow-md shadow-indigo-500/20"
              >
                <Check size={11} strokeWidth={3} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Keyboard shortcut hint bar — visible when a stroke is selected */}
        <AnimatePresence>
          {activeTool === 'select' && selectedStrokeId && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className={`absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full border text-[9px] font-bold uppercase tracking-wider shadow-xl backdrop-blur-md pointer-events-none ${
                isZenMode
                  ? 'bg-[#0c0e14]/90 border-white/10 text-slate-400'
                  : 'bg-white/90 border-slate-200/60 text-slate-500'
              }`}
            >
              <span className={`px-1.5 py-0.5 rounded text-[7.5px] font-mono ${isZenMode ? 'bg-white/5' : 'bg-slate-100'}`}>⌫ Delete</span>
              <span>remove element</span>
              <span className={`w-px h-3 ${isZenMode ? 'bg-white/10' : 'bg-slate-200'}`} />
              <span className={`px-1.5 py-0.5 rounded text-[7.5px] font-mono ${isZenMode ? 'bg-white/5' : 'bg-slate-100'}`}>Esc</span>
              <span>deselect</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pristine canvas overlay empty guide */}
        {strokes.length === 0 && !currentStroke && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-center p-6 select-none animate-in fade-in zoom-in-95 duration-700">
            <div className={`max-w-xs p-6 rounded-2xl border backdrop-blur-md flex flex-col items-center justify-center shadow-2xl relative overflow-hidden ${
              isZenMode
                ? 'border-white/10 bg-[#0c0e14]/40 shadow-black/40 text-slate-400'
                : 'border-slate-200/80 bg-white/45 shadow-slate-200/20 text-slate-500'
            }`}>
              {/* Glowing decorative background elements */}
              <div className="absolute -top-12 -left-12 w-24 h-24 rounded-full bg-indigo-500/10 blur-xl pointer-events-none" />
              <div className="absolute -bottom-12 -right-12 w-24 h-24 rounded-full bg-purple-500/10 blur-xl pointer-events-none" />

              <div className={`p-4 rounded-xl mb-3 flex items-center justify-center ${
                isZenMode ? 'bg-indigo-500/5 text-indigo-400 border border-white/5' : 'bg-indigo-50 text-indigo-500 border border-indigo-100'
              }`}>
                <Sparkles size={24} className="animate-pulse" />
              </div>
              <h4 className={`text-[11px] font-black uppercase tracking-wider mb-1 ${isZenMode ? 'text-white' : 'text-slate-800'}`}>
                Vidyal.ai Spatial Sandbox
              </h4>
              <p className={`text-[9.5px] leading-relaxed mb-4 ${isZenMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Pick a brush from the dock below to begin diagramming. Use <strong className="text-indigo-400 font-bold">SARA Scan</strong> to request AI analysis.
              </p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[8px] font-mono font-bold text-slate-400 dark:text-slate-500 border-t pt-3 border-slate-200/40 dark:border-white/5 w-full">
                <span className="text-left flex items-center gap-1">
                  <span className="px-1 py-0.5 rounded bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-[7px]">S</span> Select
                </span>
                <span className="text-left flex items-center gap-1">
                  <span className="px-1 py-0.5 rounded bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-[7px]">P</span> Pencil
                </span>
                <span className="text-left flex items-center gap-1">
                  <span className="px-1 py-0.5 rounded bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-[7px]">T</span> Text
                </span>
                <span className="text-left flex items-center gap-1">
                  <span className="px-1 py-0.5 rounded bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-[7px]">⌘Z</span> Undo
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Glassmorphic Confirm Clear Modal */}
      {showClearModal && (
        <ConfirmModal
          isZenMode={isZenMode}
          message="Are you sure you want to wipe the entire whiteboard? All strokes will be permanently erased."
          onConfirm={confirmClear}
          onCancel={() => setShowClearModal(false)}
        />
      )}
    </div>
  );
};
