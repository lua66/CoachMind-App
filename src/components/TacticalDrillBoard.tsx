import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import {
  MousePointer,
  RotateCcw,
  Trash2,
  MoveUpRight,
  Minus,
  TrendingUp,
  Ban,
  Target,
  Type,
  Maximize2,
  Minimize2,
  Info,
} from 'lucide-react';
import { TacticalDiagramElement } from '../types';

export interface TacticalDrillBoardRef {
  getSvgDataUrl: () => string;
  getElements: () => TacticalDiagramElement[];
  getCourtType: () => 'full' | 'half';
  clearBoard: () => void;
}

interface TacticalDrillBoardProps {
  initialCourtType?: 'full' | 'half';
  initialElements?: TacticalDiagramElement[];
  onChange?: (elements: TacticalDiagramElement[], courtType: 'full' | 'half') => void;
  readOnly?: boolean;
}

type ToolType =
  | 'select'
  | 'player_offense'
  | 'player_defense'
  | 'ball'
  | 'cone'
  | 'line_pass'
  | 'line_cut'
  | 'line_dribble'
  | 'line_screen'
  | 'line_shot'
  | 'text';

function getArrowHeadPoints(p1: { x: number; y: number }, p2: { x: number; y: number }, size: number = 3.2): string {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const angle = Math.atan2(dy, dx);
  const angle1 = angle + Math.PI - 0.45;
  const angle2 = angle + Math.PI + 0.45;

  const a1 = { x: p2.x + size * Math.cos(angle1), y: p2.y + size * Math.sin(angle1) };
  const a2 = { x: p2.x + size * Math.cos(angle2), y: p2.y + size * Math.sin(angle2) };
  return `${p2.x},${p2.y} ${a1.x},${a1.y} ${a2.x},${a2.y}`;
}

function getScreenBarCoords(p1: { x: number; y: number }, p2: { x: number; y: number }, barWidth: number = 4.5) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const angle = Math.atan2(dy, dx);
  const half = barWidth / 2;
  return {
    b1: { x: p2.x + half * Math.cos(angle + Math.PI / 2), y: p2.y + half * Math.sin(angle + Math.PI / 2) },
    b2: { x: p2.x + half * Math.cos(angle - Math.PI / 2), y: p2.y + half * Math.sin(angle - Math.PI / 2) },
  };
}

function generateZigzagPath(points: { x: number; y: number }[], amplitude: number = 1.5, wavelength: number = 3.5): string {
  if (points.length < 2) return '';
  const p1 = points[0];
  const p2 = points[points.length - 1];
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.8) return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;

  const numSteps = Math.max(3, Math.floor(len / wavelength));
  let pathD = `M ${p1.x} ${p1.y}`;
  const nx = -dy / len;
  const ny = dx / len;

  for (let i = 1; i < numSteps; i++) {
    const t = i / numSteps;
    const basePt = { x: p1.x + dx * t, y: p1.y + dy * t };
    const side = i % 2 === 1 ? 1 : -1;
    pathD += ` L ${basePt.x + nx * amplitude * side} ${basePt.y + ny * amplitude * side}`;
  }
  pathD += ` L ${p2.x} ${p2.y}`;
  return pathD;
}

export const TacticalDrillBoard = forwardRef<TacticalDrillBoardRef, TacticalDrillBoardProps>(
  ({ initialCourtType = 'half', initialElements = [], onChange, readOnly = false }, ref) => {
    const [courtType, setCourtType] = useState<'full' | 'half'>(initialCourtType);
    const [elements, setElements] = useState<TacticalDiagramElement[]>(initialElements);
    const [selectedTool, setSelectedTool] = useState<ToolType>('player_offense');
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [offenseNumber, setOffenseNumber] = useState<number>(1);
    const [defenseNumber, setDefenseNumber] = useState<number>(1);

    const svgRef = useRef<SVGSVGElement | null>(null);
    const [isDrawingLine, setIsDrawingLine] = useState(false);
    const [lineStartPoint, setLineStartPoint] = useState<{ x: number; y: number } | null>(null);
    const [currentMousePoint, setCurrentMousePoint] = useState<{ x: number; y: number } | null>(null);
    const [draggingElementId, setDraggingElementId] = useState<string | null>(null);
    const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);

    const onChangeRef = useRef(onChange);
    useEffect(() => {
      onChangeRef.current = onChange;
    });

    const updateElements = (updater: TacticalDiagramElement[] | ((prev: TacticalDiagramElement[]) => TacticalDiagramElement[])) => {
      setElements((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        onChangeRef.current?.(next, courtType);
        return next;
      });
    };

    const updateCourtType = (newCourtType: 'full' | 'half') => {
      setCourtType(newCourtType);
      onChangeRef.current?.(elements, newCourtType);
    };

    // Expose imperative methods for exporting SVG/DataURL and clearing
    useImperativeHandle(ref, () => ({
      getSvgDataUrl: () => {
        if (!svgRef.current) return '';
        const svgString = new XMLSerializer().serializeToString(svgRef.current);
        return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
      },
      getElements: () => elements,
      getCourtType: () => courtType,
      clearBoard: () => {
        setElements([]);
        setSelectedElementId(null);
        setOffenseNumber(1);
        setDefenseNumber(1);
        setLineStartPoint(null);
        setIsDrawingLine(false);
        onChangeRef.current?.([], courtType);
      },
    }));

    const getSvgCoords = (
      e: React.PointerEvent<SVGSVGElement | SVGGElement> | React.MouseEvent | React.TouchEvent
    ): { x: number; y: number } => {
      if (!svgRef.current) return { x: 50, y: 50 };
      const rect = svgRef.current.getBoundingClientRect();
      let clientX = 0;
      let clientY = 0;

      if ('clientX' in e && typeof e.clientX === 'number') {
        clientX = e.clientX;
        clientY = e.clientY;
      } else if ('touches' in e && (e as any).touches?.length > 0) {
        clientX = (e as any).touches[0].clientX;
        clientY = (e as any).touches[0].clientY;
      } else if ('changedTouches' in e && (e as any).changedTouches?.length > 0) {
        clientX = (e as any).changedTouches[0].clientX;
        clientY = (e as any).changedTouches[0].clientY;
      }

      const x = ((clientX - rect.left) / rect.width) * 100;
      const y = ((clientY - rect.top) / rect.height) * 100;
      return { x: Math.max(2, Math.min(98, x)), y: Math.max(2, Math.min(98, y)) };
    };

    const isLineTool = (tool: ToolType) => {
      return (
        tool === 'line_pass' ||
        tool === 'line_cut' ||
        tool === 'line_dribble' ||
        tool === 'line_screen' ||
        tool === 'line_shot'
      );
    };

    const createLine = (start: { x: number; y: number }, end: { x: number; y: number }, tool: ToolType) => {
      const dist = Math.hypot(end.x - start.x, end.y - start.y);
      if (dist < 2) return;

      let lineStyle: 'pass' | 'cut' | 'dribble' | 'screen' | 'shot' = 'cut';
      let color = '#F8FAFC'; // slate-50

      if (tool === 'line_pass') {
        lineStyle = 'pass';
        color = '#38BDF8'; // sky-400
      } else if (tool === 'line_dribble') {
        lineStyle = 'dribble';
        color = '#FBBF24'; // amber-400
      } else if (tool === 'line_screen') {
        lineStyle = 'screen';
        color = '#4ADE80'; // green-400
      } else if (tool === 'line_shot') {
        lineStyle = 'shot';
        color = '#F43F5E'; // rose-500
      }

      const newLine: TacticalDiagramElement = {
        id: `line-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        type: 'line',
        x: start.x,
        y: start.y,
        lineStyle,
        color,
        points: [start, end],
      };

      updateElements((prev) => [...prev, newLine]);
    };

    const handleCanvasPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
      if (readOnly) return;
      const pt = getSvgCoords(e);

      // 1. Line tools: support both Drag and Click-Click
      if (isLineTool(selectedTool)) {
        if (!lineStartPoint) {
          // First point clicked/pressed
          setLineStartPoint(pt);
          setCurrentMousePoint(pt);
          setIsDrawingLine(true);
        } else {
          // Second point clicked (Click-Click mode)
          createLine(lineStartPoint, pt, selectedTool);
          setLineStartPoint(null);
          setCurrentMousePoint(null);
          setIsDrawingLine(false);
        }
        return;
      }

      // 2. Token placement tools
      if (selectedTool === 'player_offense') {
        const newEl: TacticalDiagramElement = {
          id: `off-${Date.now()}`,
          type: 'player_offense',
          x: pt.x,
          y: pt.y,
          number: offenseNumber,
          color: '#EA580C',
        };
        updateElements((prev) => [...prev, newEl]);
        setOffenseNumber((prev) => (prev >= 5 ? 1 : prev + 1));
        return;
      }

      if (selectedTool === 'player_defense') {
        const newEl: TacticalDiagramElement = {
          id: `def-${Date.now()}`,
          type: 'player_defense',
          x: pt.x,
          y: pt.y,
          number: defenseNumber,
          color: '#2563EB',
        };
        updateElements((prev) => [...prev, newEl]);
        setDefenseNumber((prev) => (prev >= 5 ? 1 : prev + 1));
        return;
      }

      if (selectedTool === 'ball') {
        const newEl: TacticalDiagramElement = {
          id: `ball-${Date.now()}`,
          type: 'ball',
          x: pt.x,
          y: pt.y,
        };
        updateElements((prev) => [...prev, newEl]);
        return;
      }

      if (selectedTool === 'cone') {
        const newEl: TacticalDiagramElement = {
          id: `cone-${Date.now()}`,
          type: 'cone',
          x: pt.x,
          y: pt.y,
        };
        updateElements((prev) => [...prev, newEl]);
        return;
      }

      if (selectedTool === 'text') {
        const userText = prompt('Introduce el texto o indicación táctica:', 'Pase Mano a Mano');
        if (userText && userText.trim()) {
          const newEl: TacticalDiagramElement = {
            id: `text-${Date.now()}`,
            type: 'text',
            x: pt.x,
            y: pt.y,
            label: userText.trim(),
          };
          updateElements((prev) => [...prev, newEl]);
        }
        return;
      }

      // If clicked background with select tool, deselect
      if (selectedTool === 'select') {
        setSelectedElementId(null);
      }
    };

    const handleCanvasPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
      const pt = getSvgCoords(e);
      if (isDrawingLine || lineStartPoint) {
        setCurrentMousePoint(pt);
      } else if (draggingElementId) {
        updateElements((prev) =>
          prev.map((el) => (el.id === draggingElementId ? { ...el, x: pt.x, y: pt.y } : el))
        );
      }
    };

    const handleCanvasPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
      const pt = getSvgCoords(e);

      // If drawing line via drag (released far from start)
      if (isDrawingLine && lineStartPoint) {
        const dist = Math.hypot(pt.x - lineStartPoint.x, pt.y - lineStartPoint.y);
        if (dist > 3.5) {
          // Completed line via drag release
          createLine(lineStartPoint, pt, selectedTool);
          setLineStartPoint(null);
          setCurrentMousePoint(null);
          setIsDrawingLine(false);
        }
        // If dist <= 3.5, we keep lineStartPoint active so the user can click point B!
      }

      if (draggingElementId) {
        setDraggingElementId(null);
        setDragStartPos(null);
      }
    };

    const handleClearBoard = () => {
      updateElements([]);
      setSelectedElementId(null);
      setOffenseNumber(1);
      setDefenseNumber(1);
      setLineStartPoint(null);
      setIsDrawingLine(false);
    };

    const handleUndo = () => {
      updateElements((prev) => {
        if (prev.length === 0) return prev;
        const lastEl = prev[prev.length - 1];
        if (lastEl.type === 'player_offense' && typeof lastEl.number === 'number') {
          setOffenseNumber(lastEl.number);
        } else if (lastEl.type === 'player_defense' && typeof lastEl.number === 'number') {
          setDefenseNumber(lastEl.number);
        }
        return prev.slice(0, prev.length - 1);
      });
      setSelectedElementId(null);
      setLineStartPoint(null);
      setIsDrawingLine(false);
    };

    const handleDeleteSelected = () => {
      if (!selectedElementId) return;
      updateElements((prev) => prev.filter((el) => el.id !== selectedElementId));
      setSelectedElementId(null);
    };

    const getToolHelpText = (): string => {
      switch (selectedTool) {
        case 'player_offense':
          return `Toca en la cancha para colocar al Atacante #${offenseNumber}.`;
        case 'player_defense':
          return `Toca en la cancha para colocar al Defensor #${defenseNumber}.`;
        case 'ball':
          return 'Toca en la cancha para colocar el balón 🏀.';
        case 'cone':
          return 'Toca en la cancha para colocar un cono de entrenamiento 🔺.';
        case 'line_pass':
          return lineStartPoint
            ? 'Toca el punto de llegada del pase (o arrastra).'
            : 'Toca o arrastra para trazar un PASE (línea azul discontinua).';
        case 'line_cut':
          return lineStartPoint
            ? 'Toca el punto de llegada del corte (o arrastra).'
            : 'Toca o arrastra para trazar un CORTE / DESPLAZAMIENTO (línea continua).';
        case 'line_dribble':
          return lineStartPoint
            ? 'Toca el punto final del bote (o arrastra).'
            : 'Toca o arrastra para trazar un BOTE (línea en zigzag).';
        case 'line_screen':
          return lineStartPoint
            ? 'Toca la posición del bloqueo (o arrastra).'
            : 'Toca o arrastra para trazar un BLOQUEO (línea con tope en T).';
        case 'line_shot':
          return lineStartPoint
            ? 'Toca la canasta o punto de tiro (o arrastra).'
            : 'Toca o arrastra para trazar un TIRO A CANASTA (flecha roja).';
        case 'text':
          return 'Toca en la cancha para escribir una nota o indicación táctica.';
        case 'select':
          return 'Toca cualquier jugador o trazo para moverlo o borrarlo.';
        default:
          return 'Selecciona una herramienta y toca en la cancha.';
      }
    };

    return (
      <div className="space-y-3 select-none tactical-board" data-board="true" data-allow-action="true">
        {/* Top Control Bar */}
        {!readOnly && (
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-900 text-slate-200 rounded-xl border border-slate-800 shadow-sm text-xs">
            {/* Court Selector */}
            <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={() => updateCourtType('half')}
                className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1.5 text-xs ${
                  courtType === 'half'
                    ? 'bg-amber-500 text-slate-950 shadow-md ring-1 ring-amber-400'
                    : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Media Cancha</span>
              </button>
              <button
                type="button"
                onClick={() => updateCourtType('full')}
                className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1.5 text-xs ${
                  courtType === 'full'
                    ? 'bg-amber-500 text-slate-950 shadow-md ring-1 ring-amber-400'
                    : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Cancha Completa</span>
              </button>
            </div>

            {/* Actions: Undo, Delete, Clear */}
            <div className="flex items-center gap-1.5">
              {selectedElementId && (
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  className="px-2.5 py-1.5 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/40 flex items-center gap-1 font-semibold cursor-pointer text-xs"
                  title="Eliminar elemento seleccionado"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Borrar Seleccionado</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleUndo}
                disabled={elements.length === 0}
                className="p-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 border border-slate-700 cursor-pointer flex items-center gap-1 text-xs"
                title="Deshacer último trazo o jugador"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Deshacer</span>
              </button>
              <button
                type="button"
                onClick={handleClearBoard}
                disabled={elements.length === 0}
                className="px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-500 disabled:opacity-30 text-white border border-red-500/50 cursor-pointer flex items-center gap-1.5 font-bold transition-all text-xs shadow-sm"
                title="Limpiar toda la pizarra y reiniciar contadores a 1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpiar Pizarra</span>
              </button>
            </div>
          </div>
        )}

        {/* Tools Selector Bar */}
        {!readOnly && (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-11 gap-1.5 p-2 bg-slate-900 rounded-xl border border-slate-800 text-[11px]">
            {/* 1. Mover / Seleccionar */}
            <button
              type="button"
              onClick={() => {
                setSelectedTool('select');
                setLineStartPoint(null);
              }}
              className={`p-2 rounded-lg flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                selectedTool === 'select'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md ring-2 ring-amber-300'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
              title="Mover y seleccionar elementos"
            >
              <MousePointer className="w-4 h-4" />
              <span className="text-[10px] font-bold">Mover</span>
            </button>

            {/* 2. Atacante */}
            <button
              type="button"
              onClick={() => {
                setSelectedTool('player_offense');
                setLineStartPoint(null);
              }}
              className={`p-2 rounded-lg flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                selectedTool === 'player_offense'
                  ? 'bg-orange-500 text-white font-black shadow-md ring-2 ring-orange-300'
                  : 'text-orange-400 hover:bg-slate-800'
              }`}
              title="Colocar jugador atacante (1-5)"
            >
              <div className="w-5 h-5 rounded-full bg-orange-600 border border-white flex items-center justify-center text-[10px] font-extrabold text-white">
                {offenseNumber}
              </div>
              <span className="text-[10px] font-bold">Ataque</span>
            </button>

            {/* 3. Defensor */}
            <button
              type="button"
              onClick={() => {
                setSelectedTool('player_defense');
                setLineStartPoint(null);
              }}
              className={`p-2 rounded-lg flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                selectedTool === 'player_defense'
                  ? 'bg-blue-600 text-white font-black shadow-md ring-2 ring-blue-300'
                  : 'text-blue-400 hover:bg-slate-800'
              }`}
              title="Colocar defensor (1-5)"
            >
              <div className="w-5 h-5 rounded-full bg-blue-600 border border-white flex items-center justify-center text-[10px] font-extrabold text-white">
                {defenseNumber}
              </div>
              <span className="text-[10px] font-bold">Defensa</span>
            </button>

            {/* 4. Balón */}
            <button
              type="button"
              onClick={() => {
                setSelectedTool('ball');
                setLineStartPoint(null);
              }}
              className={`p-2 rounded-lg flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                selectedTool === 'ball'
                  ? 'bg-amber-600 text-white font-black shadow-md ring-2 ring-amber-300'
                  : 'text-amber-400 hover:bg-slate-800'
              }`}
              title="Colocar balón de baloncesto"
            >
              <span className="text-base leading-none">🏀</span>
              <span className="text-[10px] font-bold">Balón</span>
            </button>

            {/* 5. Cono */}
            <button
              type="button"
              onClick={() => {
                setSelectedTool('cone');
                setLineStartPoint(null);
              }}
              className={`p-2 rounded-lg flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                selectedTool === 'cone'
                  ? 'bg-yellow-500 text-slate-950 font-black shadow-md ring-2 ring-yellow-300'
                  : 'text-yellow-400 hover:bg-slate-800'
              }`}
              title="Colocar cono / obstáculo"
            >
              <span className="text-sm leading-none">🔺</span>
              <span className="text-[10px] font-bold">Cono</span>
            </button>

            {/* 6. Pase (Línea discontinua) */}
            <button
              type="button"
              onClick={() => {
                setSelectedTool('line_pass');
                setLineStartPoint(null);
              }}
              className={`p-2 rounded-lg flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                selectedTool === 'line_pass'
                  ? 'bg-sky-500 text-slate-950 font-black shadow-md ring-2 ring-sky-300'
                  : 'text-sky-300 hover:bg-slate-800'
              }`}
              title="Línea de Pase (Discontinua con flecha)"
            >
              <MoveUpRight className="w-4 h-4 stroke-[3]" />
              <span className="text-[10px] font-bold">Pase</span>
            </button>

            {/* 7. Corte / Carrera */}
            <button
              type="button"
              onClick={() => {
                setSelectedTool('line_cut');
                setLineStartPoint(null);
              }}
              className={`p-2 rounded-lg flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                selectedTool === 'line_cut'
                  ? 'bg-slate-100 text-slate-950 font-black shadow-md ring-2 ring-white'
                  : 'text-slate-200 hover:bg-slate-800'
              }`}
              title="Corte / Desplazamiento sin balón (Línea continua)"
            >
              <Minus className="w-4 h-4 stroke-[3.5]" />
              <span className="text-[10px] font-bold">Corte</span>
            </button>

            {/* 8. Bote / Dribble (Zigzag) */}
            <button
              type="button"
              onClick={() => {
                setSelectedTool('line_dribble');
                setLineStartPoint(null);
              }}
              className={`p-2 rounded-lg flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                selectedTool === 'line_dribble'
                  ? 'bg-amber-400 text-slate-950 font-black shadow-md ring-2 ring-amber-300'
                  : 'text-amber-300 hover:bg-slate-800'
              }`}
              title="Bote / Dribbling (Línea en zigzag)"
            >
              <TrendingUp className="w-4 h-4" />
              <span className="text-[10px] font-bold">Bote</span>
            </button>

            {/* 9. Bloqueo (T-Bar) */}
            <button
              type="button"
              onClick={() => {
                setSelectedTool('line_screen');
                setLineStartPoint(null);
              }}
              className={`p-2 rounded-lg flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                selectedTool === 'line_screen'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-md ring-2 ring-emerald-300'
                  : 'text-emerald-400 hover:bg-slate-800'
              }`}
              title="Bloqueo directo/indirecto (Línea con tope en T)"
            >
              <Ban className="w-4 h-4" />
              <span className="text-[10px] font-bold">Bloqueo</span>
            </button>

            {/* 10. Tiro a Canasta */}
            <button
              type="button"
              onClick={() => {
                setSelectedTool('line_shot');
                setLineStartPoint(null);
              }}
              className={`p-2 rounded-lg flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                selectedTool === 'line_shot'
                  ? 'bg-rose-500 text-white font-black shadow-md ring-2 ring-rose-300'
                  : 'text-rose-400 hover:bg-slate-800'
              }`}
              title="Tiro a Canasta (Flecha a canasta)"
            >
              <Target className="w-4 h-4" />
              <span className="text-[10px] font-bold">Tiro</span>
            </button>

            {/* 11. Texto / Nota */}
            <button
              type="button"
              onClick={() => {
                setSelectedTool('text');
                setLineStartPoint(null);
              }}
              className={`p-2 rounded-lg flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                selectedTool === 'text'
                  ? 'bg-purple-500 text-white font-black shadow-md ring-2 ring-purple-300'
                  : 'text-purple-400 hover:bg-slate-800'
              }`}
              title="Añadir texto táctico"
            >
              <Type className="w-4 h-4" />
              <span className="text-[10px] font-bold">Texto</span>
            </button>
          </div>
        )}

        {/* Quick Number Selector for Offense / Defense tools */}
        {!readOnly && (selectedTool === 'player_offense' || selectedTool === 'player_defense') && (
          <div className="flex items-center justify-between px-3 py-2 bg-slate-900/95 rounded-xl border border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-300 font-bold text-xs">
                {selectedTool === 'player_offense' ? 'Dorsal Atacante:' : 'Dorsal Defensor:'}
              </span>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((num) => {
                  const isActive =
                    selectedTool === 'player_offense'
                      ? offenseNumber === num
                      : defenseNumber === num;
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        if (selectedTool === 'player_offense') setOffenseNumber(num);
                        else setDefenseNumber(num);
                      }}
                      className={`w-7 h-7 rounded-full font-extrabold text-xs flex items-center justify-center transition-all cursor-pointer ${
                        isActive
                          ? selectedTool === 'player_offense'
                            ? 'bg-orange-500 text-white ring-2 ring-orange-300 scale-110 shadow-md'
                            : 'bg-blue-600 text-white ring-2 ring-blue-300 scale-110 shadow-md'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (selectedTool === 'player_offense') setOffenseNumber(1);
                else setDefenseNumber(1);
              }}
              className="text-xs text-amber-400 hover:underline cursor-pointer font-bold"
            >
              Reiniciar al 1
            </button>
          </div>
        )}

        {/* Action Help Banner */}
        {!readOnly && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/70 border border-slate-800/80 rounded-lg text-xs text-slate-300">
            <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-medium text-[11px]">{getToolHelpText()}</span>
          </div>
        )}

        {/* Tactical Canvas SVG */}
        <div
          className="relative w-full aspect-[16/10] bg-[#0d281e] rounded-2xl overflow-hidden shadow-inner border-2 border-slate-700/80 cursor-crosshair touch-none select-none"
          style={{ touchAction: 'none' }}
        >
          <svg
            ref={svgRef}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="w-full h-full"
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
          >
            {/* Court Flooring Background */}
            <rect width="100" height="100" fill="#0d281e" />

            {/* Realistic FIBA Markings */}
            {courtType === 'half' ? (
              // Half Court Layout
              <g stroke="rgba(255,255,255,0.75)" strokeWidth="0.65" fill="none">
                {/* Court Boundary */}
                <rect x="4" y="4" width="92" height="92" rx="1" />
                {/* Free throw lane (Zona) */}
                <rect x="36" y="4" width="28" height="38" fill="rgba(255,255,255,0.03)" />
                {/* Free throw circle */}
                <circle cx="50" cy="42" r="11" />
                <line x1="39" y1="42" x2="61" y2="42" strokeDasharray="1.2,1.2" />
                {/* 3-Point Arc */}
                <path d="M 12 4 L 12 18 A 38 38 0 0 0 88 18 L 88 4" />
                {/* Restricted Area (Semicírculo de no carga) */}
                <path d="M 44 14 A 6 6 0 0 0 56 14" />
                {/* Backboard and Basket */}
                <line x1="42" y1="9" x2="58" y2="9" strokeWidth="1.2" stroke="white" />
                <line x1="50" y1="9" x2="50" y2="12" strokeWidth="0.8" stroke="white" />
                <circle cx="50" cy="13" r="2.2" stroke="#ea580c" strokeWidth="1" fill="none" />
                {/* Half court center circle at bottom */}
                <path d="M 39 96 A 11 11 0 0 1 61 96" />
              </g>
            ) : (
              // Full Court Layout
              <g stroke="rgba(255,255,255,0.75)" strokeWidth="0.65" fill="none">
                {/* Outer Boundary */}
                <rect x="4" y="4" width="92" height="92" rx="1" />
                {/* Half court line */}
                <line x1="4" y1="50" x2="96" y2="50" strokeWidth="0.8" />
                {/* Center Circle */}
                <circle cx="50" cy="50" r="9" />

                {/* Top Basket (Zona, 3p, Hoop) */}
                <rect x="37" y="4" width="26" height="22" fill="rgba(255,255,255,0.03)" />
                <circle cx="50" cy="26" r="8" />
                <path d="M 14 4 L 14 12 A 36 36 0 0 0 86 12 L 86 4" />
                <line x1="43" y1="8" x2="57" y2="8" strokeWidth="1" stroke="white" />
                <circle cx="50" cy="11" r="2" stroke="#ea580c" strokeWidth="0.9" fill="none" />

                {/* Bottom Basket (Zona, 3p, Hoop) */}
                <rect x="37" y="74" width="26" height="22" fill="rgba(255,255,255,0.03)" />
                <circle cx="50" cy="74" r="8" />
                <path d="M 14 96 L 14 88 A 36 36 0 0 1 86 88 L 86 96" />
                <line x1="43" y1="92" x2="57" y2="92" strokeWidth="1" stroke="white" />
                <circle cx="50" cy="89" r="2" stroke="#ea580c" strokeWidth="0.9" fill="none" />
              </g>
            )}

            {/* Tactical Lines Render */}
            {elements
              .filter((el) => el.type === 'line' && el.points && el.points.length >= 2)
              .map((line) => {
                const p1 = line.points![0];
                const p2 = line.points![1];
                const isSelected = selectedElementId === line.id;
                const lineColor = line.color || '#ffffff';

                if (line.lineStyle === 'screen') {
                  const bar = getScreenBarCoords(p1, p2);
                  return (
                    <g
                      key={line.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedElementId(line.id);
                      }}
                      className="cursor-pointer"
                    >
                      <line
                        x1={p1.x}
                        y1={p1.y}
                        x2={p2.x}
                        y2={p2.y}
                        stroke={isSelected ? '#38BDF8' : lineColor}
                        strokeWidth={isSelected ? '2.2' : '1.5'}
                      />
                      <line
                        x1={bar.b1.x}
                        y1={bar.b1.y}
                        x2={bar.b2.x}
                        y2={bar.b2.y}
                        stroke={isSelected ? '#38BDF8' : lineColor}
                        strokeWidth={isSelected ? '2.8' : '2.2'}
                      />
                    </g>
                  );
                }

                if (line.lineStyle === 'dribble') {
                  const zigzagD = generateZigzagPath(line.points!);
                  const arrowPts = getArrowHeadPoints(p1, p2);
                  return (
                    <g
                      key={line.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedElementId(line.id);
                      }}
                      className="cursor-pointer"
                    >
                      <path
                        d={zigzagD}
                        fill="none"
                        stroke={isSelected ? '#38BDF8' : lineColor}
                        strokeWidth={isSelected ? '2.2' : '1.5'}
                      />
                      <polygon points={arrowPts} fill={isSelected ? '#38BDF8' : lineColor} />
                    </g>
                  );
                }

                // Pass / Cut / Shot
                const isDashed = line.lineStyle === 'pass';
                const isDotted = line.lineStyle === 'shot';
                const arrowPts = getArrowHeadPoints(p1, p2);

                return (
                  <g
                    key={line.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedElementId(line.id);
                    }}
                    className="cursor-pointer"
                  >
                    <line
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke={isSelected ? '#38BDF8' : lineColor}
                      strokeWidth={isSelected ? '2.2' : '1.5'}
                      strokeDasharray={isDashed ? '2.5,1.5' : isDotted ? '1,1.2' : undefined}
                    />
                    <polygon points={arrowPts} fill={isSelected ? '#38BDF8' : lineColor} />
                  </g>
                );
              })}

            {/* Currently Drawing Line Preview */}
            {(isDrawingLine || lineStartPoint) && currentMousePoint && lineStartPoint && (
              <g opacity="0.85">
                {selectedTool === 'line_screen' ? (
                  (() => {
                    const bar = getScreenBarCoords(lineStartPoint, currentMousePoint);
                    return (
                      <>
                        <line
                          x1={lineStartPoint.x}
                          y1={lineStartPoint.y}
                          x2={currentMousePoint.x}
                          y2={currentMousePoint.y}
                          stroke="#4ADE80"
                          strokeWidth="1.6"
                        />
                        <line
                          x1={bar.b1.x}
                          y1={bar.b1.y}
                          x2={bar.b2.x}
                          y2={bar.b2.y}
                          stroke="#4ADE80"
                          strokeWidth="2.5"
                        />
                      </>
                    );
                  })()
                ) : selectedTool === 'line_dribble' ? (
                  (() => {
                    const zigzagD = generateZigzagPath([lineStartPoint, currentMousePoint]);
                    const arrowPts = getArrowHeadPoints(lineStartPoint, currentMousePoint);
                    return (
                      <>
                        <path d={zigzagD} fill="none" stroke="#FBBF24" strokeWidth="1.6" />
                        <polygon points={arrowPts} fill="#FBBF24" />
                      </>
                    );
                  })()
                ) : (
                  (() => {
                    const arrowPts = getArrowHeadPoints(lineStartPoint, currentMousePoint);
                    const color =
                      selectedTool === 'line_pass'
                        ? '#38BDF8'
                        : selectedTool === 'line_shot'
                        ? '#F43F5E'
                        : '#F8FAFC';
                    return (
                      <>
                        <line
                          x1={lineStartPoint.x}
                          y1={lineStartPoint.y}
                          x2={currentMousePoint.x}
                          y2={currentMousePoint.y}
                          stroke={color}
                          strokeWidth="1.6"
                          strokeDasharray={
                            selectedTool === 'line_pass'
                              ? '2.5,1.5'
                              : selectedTool === 'line_shot'
                              ? '1,1.2'
                              : undefined
                          }
                        />
                        <polygon points={arrowPts} fill={color} />
                      </>
                    );
                  })()
                )}
                {/* Start Point indicator */}
                <circle cx={lineStartPoint.x} cy={lineStartPoint.y} r="1.5" fill="#38BDF8" />
              </g>
            )}

            {/* Tokens Render (Players, Ball, Cone, Text) */}
            {elements
              .filter((el) => el.type !== 'line')
              .map((el) => {
                const isSelected = selectedElementId === el.id;
                const handleTokenPointerDown = (e: React.PointerEvent<SVGGElement>) => {
                  e.stopPropagation();
                  setSelectedElementId(el.id);
                  setDraggingElementId(el.id);
                  setDragStartPos({ x: el.x, y: el.y });
                };

                if (el.type === 'player_offense') {
                  return (
                    <g
                      key={el.id}
                      transform={`translate(${el.x}, ${el.y})`}
                      onPointerDown={handleTokenPointerDown}
                      className="cursor-grab active:cursor-grabbing"
                    >
                      <circle
                        r="3.4"
                        fill="#ea580c"
                        stroke={isSelected ? '#38BDF8' : '#ffffff'}
                        strokeWidth={isSelected ? '1.2' : '0.6'}
                        filter="drop-shadow(0 1px 2px rgba(0,0,0,0.5))"
                      />
                      <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#ffffff"
                        fontSize="3.4"
                        fontWeight="bold"
                      >
                        {el.number || '1'}
                      </text>
                    </g>
                  );
                }

                if (el.type === 'player_defense') {
                  return (
                    <g
                      key={el.id}
                      transform={`translate(${el.x}, ${el.y})`}
                      onPointerDown={handleTokenPointerDown}
                      className="cursor-grab active:cursor-grabbing"
                    >
                      <circle
                        r="3.4"
                        fill="#2563eb"
                        stroke={isSelected ? '#38BDF8' : '#ffffff'}
                        strokeWidth={isSelected ? '1.2' : '0.6'}
                        filter="drop-shadow(0 1px 2px rgba(0,0,0,0.5))"
                      />
                      <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#ffffff"
                        fontSize="3.4"
                        fontWeight="bold"
                      >
                        {el.number || 'X'}
                      </text>
                    </g>
                  );
                }

                if (el.type === 'ball') {
                  return (
                    <g
                      key={el.id}
                      transform={`translate(${el.x}, ${el.y})`}
                      onPointerDown={handleTokenPointerDown}
                      className="cursor-grab active:cursor-grabbing"
                    >
                      <circle
                        r="2.6"
                        fill="#f97316"
                        stroke={isSelected ? '#38BDF8' : '#000000'}
                        strokeWidth={isSelected ? '1' : '0.4'}
                      />
                      <line x1="-2.4" y1="0" x2="2.4" y2="0" stroke="#000000" strokeWidth="0.3" />
                      <path
                        d="M -1.8 -1.8 A 2.4 2.4 0 0 1 1.8 1.8"
                        stroke="#000000"
                        strokeWidth="0.3"
                        fill="none"
                      />
                    </g>
                  );
                }

                if (el.type === 'cone') {
                  return (
                    <g
                      key={el.id}
                      transform={`translate(${el.x}, ${el.y})`}
                      onPointerDown={handleTokenPointerDown}
                      className="cursor-grab active:cursor-grabbing"
                    >
                      <polygon
                        points="0,-2.8 2.6,2.4 -2.6,2.4"
                        fill="#eab308"
                        stroke={isSelected ? '#38BDF8' : '#713f12'}
                        strokeWidth={isSelected ? '1' : '0.4'}
                      />
                      <line x1="-1.8" y1="0.6" x2="1.8" y2="0.6" stroke="#ffffff" strokeWidth="0.4" />
                    </g>
                  );
                }

                if (el.type === 'text') {
                  return (
                    <g
                      key={el.id}
                      transform={`translate(${el.x}, ${el.y})`}
                      onPointerDown={handleTokenPointerDown}
                      className="cursor-grab active:cursor-grabbing"
                    >
                      <rect
                        x="-10"
                        y="-3.5"
                        width="20"
                        height="7"
                        rx="1.5"
                        fill="rgba(15,23,42,0.9)"
                        stroke={isSelected ? '#38BDF8' : '#475569'}
                        strokeWidth={isSelected ? '1' : '0.5'}
                      />
                      <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#ffffff"
                        fontSize="2.4"
                        fontWeight="bold"
                      >
                        {el.label || 'Nota'}
                      </text>
                    </g>
                  );
                }

                return null;
              })}
          </svg>
        </div>

        {/* Legend info */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 pt-1">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-sky-400 inline-block border-b border-dashed" /> Pase
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-slate-200 inline-block" /> Corte
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-amber-400 inline-block" /> Bote
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 text-emerald-400 inline-block font-bold">|</span> Bloqueo
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-rose-500 inline-block" /> Tiro
            </span>
          </div>
          <span className="font-semibold text-slate-300">
            {elements.length} {elements.length === 1 ? 'elemento' : 'elementos'} en pizarra
          </span>
        </div>
      </div>
    );
  }
);

TacticalDrillBoard.displayName = 'TacticalDrillBoard';

export default TacticalDrillBoard;
