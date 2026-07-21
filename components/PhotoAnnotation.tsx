'use client';

import React, { useRef, useState, useEffect } from 'react';
import { 
  ArrowUpRight, Square, Circle, Edit3, Type, Hash, 
  RotateCcw, RotateCw, Save, X, Trash2, Maximize2, Move
} from 'lucide-react';
import { logger } from '@/utils/logger';

interface PhotoAnnotationProps {
  originalUrl: string;
  initialAnnotationsJson?: string;
  onSave: (annotatedUrl: string, annotationsJson: string) => void;
  onCancel: () => void;
}

type Tool = 'free' | 'arrow' | 'rect' | 'circle' | 'highlight' | 'text' | 'number' | 'eraser' | 'pan';

interface Point {
  x: number;
  y: number;
}

interface Shape {
  id: string;
  type: Tool;
  color: string;
  points?: Point[]; // for freehand/highlight
  x1?: number; // for arrow/rect/circle/text/number
  y1?: number;
  x2?: number;
  y2?: number;
  text?: string;
  number?: number;
}

export default function PhotoAnnotation({ 
  originalUrl, 
  initialAnnotationsJson, 
  onSave, 
  onCancel 
}: PhotoAnnotationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);

  // Drawing state
  const [tool, setTool] = useState<Tool>('free');
  const [color, setColor] = useState<string>('#ef4444'); // Default red
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [undoStack, setUndoStack] = useState<Shape[][]>([]);
  const [redoStack, setRedoStack] = useState<Shape[][]>([]);
  
  // Navigation (Pan & Zoom)
  const [scale, setScale] = useState<number>(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentShape, setCurrentShape] = useState<Shape | null>(null);
  const [numberCount, setNumberCount] = useState<number>(1);

  // Pan dragging state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });

  // Text dialog state
  const [showTextInput, setShowTextInput] = useState(false);
  const [textPos, setTextPos] = useState<Point>({ x: 0, y: 0 });
  const [tempText, setTempText] = useState('');

  // Pre-load image and initial shapes
  useEffect(() => {
    const image = new Image();
    image.src = originalUrl;
    image.onload = () => {
      setImg(image);
      // Auto-fit image to container
      if (containerRef.current) {
        const cWidth = containerRef.current.clientWidth;
        const cHeight = containerRef.current.clientHeight;
        const scaleX = cWidth / image.width;
        const scaleY = cHeight / image.height;
        const initialScale = Math.min(scaleX, scaleY, 1);
        setScale(initialScale);
        setOffset({
          x: (cWidth - image.width * initialScale) / 2,
          y: (cHeight - image.height * initialScale) / 2
        });
      }
    };

    if (initialAnnotationsJson) {
      try {
        const loaded = JSON.parse(initialAnnotationsJson) as { shapes: Shape[], numberCount?: number };
        if (loaded.shapes) setShapes(loaded.shapes);
        if (loaded.numberCount) setNumberCount(loaded.numberCount);
      } catch (e) {
        logger.error('Failed to parse initial annotations', e);
      }
    }
  }, [originalUrl, initialAnnotationsJson]);

  // Handle canvas drawing updates
  useEffect(() => {
    drawCanvas();
  }, [img, shapes, currentShape, scale, offset]);

  // Clear Canvas and Redraw all elements
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset canvas dimensions to container size
    if (containerRef.current) {
      canvas.width = containerRef.current.clientWidth;
      canvas.height = containerRef.current.clientHeight;
    }

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Apply Pan and Zoom offsets
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    // Draw background image
    ctx.drawImage(img, 0, 0);

    // Draw saved shapes
    shapes.forEach(shape => drawShape(ctx, shape));

    // Draw current active drawing shape
    if (currentShape) {
      drawShape(ctx, currentShape);
    }

    ctx.restore();
  };

  // Helper to draw single shape
  const drawShape = (ctx: CanvasRenderingContext2D, shape: Shape) => {
    ctx.strokeStyle = shape.color;
    ctx.fillStyle = shape.color;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (shape.type) {
      case 'free':
        if (shape.points && shape.points.length > 0) {
          ctx.beginPath();
          ctx.moveTo(shape.points[0].x, shape.points[0].y);
          for (let i = 1; i < shape.points.length; i++) {
            ctx.lineTo(shape.points[i].x, shape.points[i].y);
          }
          ctx.stroke();
        }
        break;
      case 'highlight':
        if (shape.points && shape.points.length > 0) {
          ctx.save();
          ctx.strokeStyle = shape.color + '66'; // semi-transparent
          ctx.lineWidth = 20;
          ctx.beginPath();
          ctx.moveTo(shape.points[0].x, shape.points[0].y);
          for (let i = 1; i < shape.points.length; i++) {
            ctx.lineTo(shape.points[i].x, shape.points[i].y);
          }
          ctx.stroke();
          ctx.restore();
        }
        break;
      case 'arrow':
        if (shape.x1 !== undefined && shape.y1 !== undefined && shape.x2 !== undefined && shape.y2 !== undefined) {
          drawArrow(ctx, shape.x1, shape.y1, shape.x2, shape.y2, shape.color);
        }
        break;
      case 'rect':
        if (shape.x1 !== undefined && shape.y1 !== undefined && shape.x2 !== undefined && shape.y2 !== undefined) {
          ctx.beginPath();
          ctx.rect(shape.x1, shape.y1, shape.x2 - shape.x1, shape.y2 - shape.y1);
          ctx.stroke();
        }
        break;
      case 'circle':
        if (shape.x1 !== undefined && shape.y1 !== undefined && shape.x2 !== undefined && shape.y2 !== undefined) {
          const r = Math.sqrt(Math.pow(shape.x2 - shape.x1, 2) + Math.pow(shape.y2 - shape.y1, 2));
          ctx.beginPath();
          ctx.arc(shape.x1, shape.y1, r, 0, 2 * Math.PI);
          ctx.stroke();
        }
        break;
      case 'text':
        if (shape.x1 !== undefined && shape.y1 !== undefined && shape.text) {
          ctx.font = 'bold 20px Inter, sans-serif';
          ctx.fillStyle = shape.color;
          ctx.fillText(shape.text, shape.x1, shape.y1);
        }
        break;
      case 'number':
        if (shape.x1 !== undefined && shape.y1 !== undefined && shape.number) {
          // Circle background
          ctx.beginPath();
          ctx.arc(shape.x1, shape.y1, 16, 0, 2 * Math.PI);
          ctx.fillStyle = shape.color;
          ctx.fill();
          // Number label
          ctx.font = 'bold 16px Inter, sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(shape.number.toString(), shape.x1, shape.y1);
        }
        break;
    }
  };

  // Helper to draw Arrow
  const drawArrow = (ctx: CanvasRenderingContext2D, fromx: number, fromy: number, tox: number, toy: number, color: string) => {
    const headlen = 15; // length of head in pixels
    const dx = tox - fromx;
    const dy = toy - fromy;
    const angle = Math.atan2(dy, dx);

    ctx.beginPath();
    ctx.moveTo(fromx, fromy);
    ctx.lineTo(tox, toy);
    ctx.stroke();

    // Draw arrow head
    ctx.beginPath();
    ctx.moveTo(tox, toy);
    ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };

  // Map client mouse/touch point to image relative coordinate space
  const getCanvasCoords = (clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left - offset.x) / scale;
    const y = (clientY - rect.top - offset.y) / scale;
    return { x, y };
  };

  // Start Drawing or Panning
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const coords = getCanvasCoords(e.clientX, e.clientY);

    if (tool === 'pan') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
      return;
    }

    setIsDrawing(true);
    // Push undo state
    setUndoStack([...undoStack, shapes]);
    setRedoStack([]); // Clear redo on action

    if (tool === 'free' || tool === 'highlight') {
      setCurrentShape({
        id: `shape-${Date.now()}`,
        type: tool,
        color,
        points: [coords]
      });
    } else if (tool === 'text') {
      setTextPos(coords);
      setShowTextInput(true);
      setTempText('');
      setIsDrawing(false);
    } else if (tool === 'number') {
      const newShape: Shape = {
        id: `shape-${Date.now()}`,
        type: 'number',
        color,
        x1: coords.x,
        y1: coords.y,
        number: numberCount
      };
      setShapes([...shapes, newShape]);
      setNumberCount(prev => prev + 1);
      setIsDrawing(false);
    } else {
      // arrow, rect, circle
      setCurrentShape({
        id: `shape-${Date.now()}`,
        type: tool,
        color,
        x1: coords.x,
        y1: coords.y,
        x2: coords.x,
        y2: coords.y
      });
    }
  };

  // Drawing in progress
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    if (!isDrawing || !currentShape) return;
    const coords = getCanvasCoords(e.clientX, e.clientY);

    if (tool === 'free' || tool === 'highlight') {
      const points = currentShape.points ? [...currentShape.points, coords] : [coords];
      setCurrentShape({ ...currentShape, points });
    } else {
      setCurrentShape({
        ...currentShape,
        x2: coords.x,
        y2: coords.y
      });
    }
  };

  // Stop Drawing
  const handlePointerUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentShape) {
      setShapes([...shapes, currentShape]);
      setCurrentShape(null);
    }
  };

  // Apply text shape
  const handleApplyText = () => {
    if (tempText.trim() === '') {
      setShowTextInput(false);
      return;
    }
    const newShape: Shape = {
      id: `shape-${Date.now()}`,
      type: 'text',
      color,
      x1: textPos.x,
      y1: textPos.y,
      text: tempText
    };
    setShapes([...shapes, newShape]);
    setShowTextInput(false);
    setTempText('');
  };

  // Undo/Redo operations
  const handleUndo = () => {
    if (shapes.length === 0) return;
    const previous = undoStack[undoStack.length - 1] || [];
    setUndoStack(undoStack.slice(0, -1));
    setRedoStack([...redoStack, shapes]);
    setShapes(previous);

    // If the undone shape was a number marker, decrement the counter
    const lastShape = shapes[shapes.length - 1];
    if (lastShape && lastShape.type === 'number') {
      setNumberCount(prev => Math.max(1, prev - 1));
    }
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(redoStack.slice(0, -1));
    setUndoStack([...undoStack, shapes]);
    setShapes(next);

    const nextShape = next[next.length - 1];
    if (nextShape && nextShape.type === 'number') {
      setNumberCount(prev => prev + 1);
    }
  };

  // Reset/Clear Annotations
  const handleClearAll = () => {
    if (confirm('Are you sure you want to discard all annotations?')) {
      setUndoStack([...undoStack, shapes]);
      setShapes([]);
      setNumberCount(1);
    }
  };

  // Zoom controls
  const handleZoomIn = () => setScale(prev => Math.min(prev * 1.2, 5));
  const handleZoomOut = () => setScale(prev => Math.max(prev / 1.2, 0.5));

  // Render & Export final images
  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;

    // Create a temporary high-quality canvas matching original image dimensions
    const saveCanvas = document.createElement('canvas');
    saveCanvas.width = img.width;
    saveCanvas.height = img.height;
    const saveCtx = saveCanvas.getContext('2d');
    if (!saveCtx) return;

    // Draw background image
    saveCtx.drawImage(img, 0, 0);

    // Render all shapes at scale 1:1 on original image size
    shapes.forEach(shape => {
      drawShape(saveCtx, shape);
    });

    const annotatedUrl = saveCanvas.toDataURL('image/jpeg', 0.85);
    const annotationsJson = JSON.stringify({ shapes, numberCount });

    onSave(annotatedUrl, annotationsJson);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white">
      {/* Top action bar */}
      <header className="flex h-14 items-center justify-between border-b border-slate-800 px-4 bg-slate-900">
        <button 
          onClick={onCancel} 
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-slate-800"
        >
          <X className="h-6 w-6 text-slate-400" />
        </button>
        <span className="font-medium text-sm">Annotate Photo</span>
        <button 
          onClick={handleSave} 
          className="flex h-9 items-center gap-2 rounded-full bg-gradient-to-r from-gradient-from to-gradient-to px-4 text-sm font-semibold text-white shadow hover:bg-accent ripple"
        >
          <Save className="h-4 w-4" /> Save
        </button>
      </header>

      {/* Editor Workspace */}
      <div 
        ref={containerRef} 
        className="relative flex-1 overflow-hidden bg-slate-950 select-none"
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="absolute inset-0 cursor-crosshair touch-none"
        />

        {/* Text Input Dialog Overlay */}
        {showTextInput && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 px-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 p-4 border border-slate-800">
              <h3 className="mb-2 text-sm font-semibold text-slate-300">Enter Text Label</h3>
              <input
                type="text"
                autoFocus
                value={tempText}
                onChange={(e) => setTempText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyText()}
                placeholder="Type something..."
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-accent focus:outline-none"
              />
              <div className="mt-4 flex justify-end gap-2 text-xs font-medium">
                <button
                  onClick={() => setShowTextInput(false)}
                  className="rounded-lg px-3 py-2 hover:bg-slate-800 text-slate-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyText}
                  className="rounded-lg bg-gradient-to-r from-gradient-from to-gradient-to px-3 py-2 text-white hover:bg-accent"
                >
                  Add Label
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Float Controls: Zoom/Pan/Undo/Redo */}
        <div className="absolute right-4 top-4 flex flex-col gap-2 rounded-2xl bg-slate-900/95 p-1.5 border border-slate-800/80 shadow-lg">
          <button 
            onClick={handleUndo} 
            disabled={shapes.length === 0}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-300 disabled:opacity-30 hover:bg-slate-800"
            title="Undo"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
          <button 
            onClick={handleRedo} 
            disabled={redoStack.length === 0}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-300 disabled:opacity-30 hover:bg-slate-800"
            title="Redo"
          >
            <RotateCw className="h-5 w-5" />
          </button>
          <div className="h-px bg-slate-800 my-1 mx-2" />
          <button 
            onClick={handleZoomIn} 
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-300 hover:bg-slate-800"
            title="Zoom In"
          >
            <Maximize2 className="h-5 w-5" />
          </button>
          <button 
            onClick={handleZoomOut} 
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-300 hover:bg-slate-800"
            title="Zoom Out"
          >
            <span className="text-xs font-bold font-mono">50%</span>
          </button>
          <button 
            onClick={handleClearAll}
            disabled={shapes.length === 0}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-rose-400 disabled:opacity-30 hover:bg-slate-800"
            title="Clear All"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Colors and Palette selection */}
      <div className="flex h-14 items-center justify-center gap-3 bg-slate-900 px-4 border-t border-slate-800">
        {['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ffffff'].map(c => (
          <button
            key={c}
            onClick={() => setColor(c)}
            style={{ backgroundColor: c }}
            className={`h-7 w-7 rounded-full border-2 transition-all ${color === c ? 'scale-125 border-accent shadow-md' : 'border-slate-700'}`}
          />
        ))}
      </div>

      {/* Bottom Tool Bar */}
      <footer className="flex h-20 items-center justify-around border-t border-slate-800 bg-slate-900 pb-safe">
        {[
          { id: 'free', icon: Edit3, label: 'Free' },
          { id: 'arrow', icon: ArrowUpRight, label: 'Arrow' },
          { id: 'rect', icon: Square, label: 'Box' },
          { id: 'circle', icon: Circle, label: 'Circle' },
          { id: 'highlight', icon: Edit3, label: 'Highlight', extraClass: 'stroke-amber-400 opacity-80' },
          { id: 'text', icon: Type, label: 'Text' },
          { id: 'number', icon: Hash, label: 'Marker' },
          { id: 'pan', icon: Move, label: 'Pan' }
        ].map(item => {
          const Icon = item.icon;
          const isActive = tool === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTool(item.id as Tool)}
              className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all ${isActive ? 'bg-gradient-to-r from-gradient-from to-gradient-to/30 text-accent scale-105 border border-accent/35' : 'text-slate-400'}`}
            >
              <Icon className={`h-5 w-5 ${item.extraClass || ''}`} />
              <span className="mt-1 text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </footer>
    </div>
  );
}
