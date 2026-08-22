import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  MousePointer,
  Users,
  Circle,
  MoveUpRight,
  TrendingUp,
  Minus,
  Ban,
  Eraser,
  RotateCcw,
  Trash2,
  Save,
  Check,
  Play,
  Pause,
  SkipBack,
  Repeat,
  Sparkles,
  Target,
  Plus,
  FolderOpen,
  Layers,
  X,
  Calendar,
  Tag,
  FileText,
  Search,
  Shield,
  Eye,
  BookOpen,
  Flame,
  Zap,
  ArrowLeft,
} from 'lucide-react';
import {
  DrawTool,
  LineStyle,
  Point,
  TacticalPath,
  TacticalToken,
  TacticalTokenType,
  SavedPlay,
  PlayFrame,
  UserProfile,
} from '../types';
import { consumeTrialAction } from '../utils/trialManager';

// Helper to calculate position along a multi-point path given progress (0 to 1)
function getPointAlongPath(points: Point[], progress: number): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return points[0];
  if (progress <= 0) return points[0];
  if (progress >= 1) return points[points.length - 1];

  const segments: { p1: Point; p2: Point; len: number }[] = [];
  let totalLength = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    const len = Math.sqrt(dx * dx + dy * dy);
    segments.push({ p1: points[i], p2: points[i + 1], len });
    totalLength += len;
  }

  if (totalLength === 0) return points[0];

  const targetDist = progress * totalLength;
  let accumulated = 0;

  for (const seg of segments) {
    if (accumulated + seg.len >= targetDist) {
      const segProgress = seg.len === 0 ? 0 : (targetDist - accumulated) / seg.len;
      return {
        x: seg.p1.x + (seg.p2.x - seg.p1.x) * segProgress,
        y: seg.p1.y + (seg.p2.y - seg.p1.y) * segProgress,
      };
    }
    accumulated += seg.len;
  }

  return points[points.length - 1];
}

// Tactical SVG Arrowhead polygon generator (0-100 viewBox space)
function getArrowHeadPoints(p1: Point, p2: Point, size: number = 2.8): string {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const angle = Math.atan2(dy, dx);

  const angle1 = angle + Math.PI - 0.45;
  const angle2 = angle + Math.PI + 0.45;

  const a1 = {
    x: p2.x + size * Math.cos(angle1),
    y: p2.y + size * Math.sin(angle1),
  };
  const a2 = {
    x: p2.x + size * Math.cos(angle2),
    y: p2.y + size * Math.sin(angle2),
  };

  return `${p2.x},${p2.y} ${a1.x},${a1.y} ${a2.x},${a2.y}`;
}

// Tactical Screen Bar line generator (|)
function getScreenBarCoords(p1: Point, p2: Point, barWidth: number = 3.8) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const angle = Math.atan2(dy, dx);

  const pAngle1 = angle + Math.PI / 2;
  const pAngle2 = angle - Math.PI / 2;

  const half = barWidth / 2;
  return {
    b1: {
      x: p2.x + half * Math.cos(pAngle1),
      y: p2.y + half * Math.sin(pAngle1),
    },
    b2: {
      x: p2.x + half * Math.cos(pAngle2),
      y: p2.y + half * Math.sin(pAngle2),
    },
  };
}

// Generate a clean Zigzag / Wavy Dribble path data
function generateZigzagPathData(points: Point[], amplitude: number = 1.2, wavelength: number = 2.8): string {
  if (points.length < 2) return '';

  const p1 = points[0];
  const p2 = points[points.length - 1];
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy);

  if (len < 0.5) return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;

  const numSteps = Math.max(3, Math.floor(len / wavelength));
  let pathD = `M ${p1.x} ${p1.y}`;

  const nx = -dy / len;
  const ny = dx / len;

  for (let i = 1; i < numSteps; i++) {
    const t = i / numSteps;
    const basePt = { x: p1.x + dx * t, y: p1.y + dy * t };
    const side = i % 2 === 1 ? 1 : -1;
    const zx = basePt.x + nx * amplitude * side;
    const zy = basePt.y + ny * amplitude * side;
    pathD += ` L ${zx} ${zy}`;
  }

  pathD += ` L ${p2.x} ${p2.y}`;
  return pathD;
}

interface WhiteboardViewProps {
  userProfile?: UserProfile | null;
  onCheckRegistration?: (action: () => void, notice?: string) => void;
  onOpenTrialModal?: (mode?: 'general_action' | 'ficha_entrenador') => void;
}

export const WhiteboardView: React.FC<WhiteboardViewProps> = ({
  userProfile,
  onCheckRegistration,
  onOpenTrialModal,
}) => {
  const [selectedTool, setSelectedTool] = useState<DrawTool>('select');
  const [lineStyle, setLineStyle] = useState<LineStyle>('straight');
  const [courtType, setCourtType] = useState<'full' | 'half'>('full');

  // Placement Mode for clicking on court to spawn items
  const [activePlacementMode, setActivePlacementMode] = useState<
    'none' | 'playerA' | 'playerB' | 'ball' | 'cone'
  >('none');

  // Counters for sequential jersey numbers (1 to 15)
  const [nextPlayerANumber, setNextPlayerANumber] = useState<number>(1);
  const [nextPlayerBNumber, setNextPlayerBNumber] = useState<number>(1);

  // Initial Tokens on court: Clean whiteboard by default
  const [tokens, setTokens] = useState<TacticalToken[]>([]);
  const [baseTokens, setBaseTokens] = useState<TacticalToken[]>([]);

  // Multi-Frame / Multi-Phase Sequence State
  const [frames, setFrames] = useState<PlayFrame[]>([
    { id: 'frame-1', title: 'Fase 1', tokens: [], paths: [] },
  ]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);

  const [activeTokenId, setActiveTokenId] = useState<string | null>(null);
  const [paths, setPaths] = useState<TacticalPath[]>([]);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync current active tokens/paths back to frames array
  const syncFrames = (newTokens: TacticalToken[], newPaths: TacticalPath[]) => {
    setTokens(newTokens);
    setPaths(newPaths);
    setFrames((prev) => {
      const copy = [...prev];
      if (copy[currentFrameIndex]) {
        copy[currentFrameIndex] = {
          ...copy[currentFrameIndex],
          tokens: newTokens,
          paths: newPaths,
        };
      } else {
        copy.push({
          id: `frame-${Date.now()}`,
          title: `Fase ${copy.length + 1}`,
          tokens: newTokens,
          paths: newPaths,
        });
      }
      return copy;
    });
  };

  // Calculate final positions of tokens at end of current frame paths
  const computeNextFrameTokens = (
    currentTokens: TacticalToken[],
    currentPaths: TacticalPath[]
  ): TacticalToken[] => {
    if (currentTokens.length === 0) return [];

    // Identify ball token & ball carrier
    const ballToken = currentTokens.find((t) => t.type === 'ball');
    let ballCarrierId: string | null = null;

    if (ballToken) {
      let minDist = Infinity;
      currentTokens.forEach((p) => {
        if (p.type !== 'ball') {
          const dist = Math.sqrt(
            Math.pow(p.x - ballToken.x, 2) + Math.pow(p.y - ballToken.y, 2)
          );
          if (dist < minDist && dist < 12) {
            minDist = dist;
            ballCarrierId = p.id;
          }
        }
      });
    }

    const nextPosMap: Record<string, Point> = {};

    // 1. Move player tokens if they have a player movement path (cut, screen, dribble) starting near them
    currentTokens.forEach((t) => {
      if (t.type === 'ball') return;

      // PASS and SHOT are ball paths - ignore them for player movement!
      const playerPath = currentPaths.find((path) => {
        if (path.tool === 'pass' || path.tool === 'shot') return false;
        if (path.points.length < 2) return false;
        const startPt = path.points[0];
        const dist = Math.sqrt(
          Math.pow(startPt.x - t.x, 2) + Math.pow(startPt.y - t.y, 2)
        );
        return dist < 12;
      });

      if (playerPath && playerPath.points.length >= 2) {
        const endPt = playerPath.points[playerPath.points.length - 1];
        nextPosMap[t.id] = endPt;
      }
    });

    // 2. Handle Ball position for next frame
    if (ballToken) {
      // Find carrier's new moved position if they had a movement path
      const carrierNewPos = ballCarrierId ? nextPosMap[ballCarrierId] : null;

      // Check if there's a pass or shot path starting near:
      // a) initial ball position
      // b) initial ball carrier position
      // c) moved position of ball carrier (end of dribble/cut)
      // d) any player's moved position
      const passOrShotPath = currentPaths.find((path) => {
        if (path.tool !== 'pass' && path.tool !== 'shot') return false;
        if (path.points.length < 2) return false;
        const startPt = path.points[0];

        const distToBall = Math.sqrt(
          Math.pow(startPt.x - ballToken.x, 2) + Math.pow(startPt.y - ballToken.y, 2)
        );
        if (distToBall < 14) return true;

        if (ballCarrierId) {
          const carrier = currentTokens.find((c) => c.id === ballCarrierId);
          if (carrier) {
            const distToCarrier = Math.sqrt(
              Math.pow(startPt.x - carrier.x, 2) + Math.pow(startPt.y - carrier.y, 2)
            );
            if (distToCarrier < 14) return true;
          }

          if (carrierNewPos) {
            const distToMoved = Math.sqrt(
              Math.pow(startPt.x - carrierNewPos.x, 2) + Math.pow(startPt.y - carrierNewPos.y, 2)
            );
            if (distToMoved < 14) return true;
          }
        }

        for (const t of currentTokens) {
          if (t.type !== 'ball' && nextPosMap[t.id]) {
            const pos = nextPosMap[t.id];
            const dist = Math.sqrt(
              Math.pow(startPt.x - pos.x, 2) + Math.pow(startPt.y - pos.y, 2)
            );
            if (dist < 14) return true;
          }
        }

        return false;
      });

      if (passOrShotPath && passOrShotPath.points.length >= 2) {
        // Ball moves to destination of pass or shot
        const endPt = passOrShotPath.points[passOrShotPath.points.length - 1];
        nextPosMap[ballToken.id] = endPt;
      } else if (ballCarrierId) {
        // If ball carrier moved (e.g. cut, screen, or dribble), ball moves with carrier to carrier's end position
        if (nextPosMap[ballCarrierId]) {
          nextPosMap[ballToken.id] = { ...nextPosMap[ballCarrierId] };
        }
      }
    }

    return currentTokens.map((t) => ({
      ...t,
      x: nextPosMap[t.id] ? nextPosMap[t.id].x : t.x,
      y: nextPosMap[t.id] ? nextPosMap[t.id].y : t.y,
    }));
  };

  const handleAddFrame = () => {
    const nextTokens = computeNextFrameTokens(tokens, paths);

    const currentUpdatedFrames = [...frames];
    if (currentUpdatedFrames[currentFrameIndex]) {
      currentUpdatedFrames[currentFrameIndex] = {
        ...currentUpdatedFrames[currentFrameIndex],
        tokens,
        paths,
      };
    }

    const newFrame: PlayFrame = {
      id: `frame-${Date.now()}`,
      title: `Fase ${currentUpdatedFrames.length + 1}`,
      tokens: nextTokens,
      paths: [],
    };

    const updatedFrames = [...currentUpdatedFrames, newFrame];
    setFrames(updatedFrames);
    setCurrentFrameIndex(updatedFrames.length - 1);
    setTokens(nextTokens);
    setPaths([]);
  };

  const handleSelectFrame = (index: number) => {
    if (index < 0 || index >= frames.length) return;
    setCurrentFrameIndex(index);
    setTokens(frames[index].tokens);
    setPaths(frames[index].paths);
  };

  const handleDeleteFrame = (index: number) => {
    if (frames.length <= 1) return;
    const updated = frames.filter((_, i) => i !== index);
    const renumbered = updated.map((f, i) => ({
      ...f,
      title: `Fase ${i + 1}`,
    }));

    setFrames(renumbered);
    const nextIdx = Math.min(index, renumbered.length - 1);
    setCurrentFrameIndex(nextIdx);
    setTokens(renumbered[nextIdx].tokens);
    setPaths(renumbered[nextIdx].paths);
  };

  // Saved plays local storage management
  const [savedPlays, setSavedPlays] = useState<SavedPlay[]>(() => {
    try {
      const data = localStorage.getItem('coach_saved_plays');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  });
  const [selectedPlayId, setSelectedPlayId] = useState<string>('');

  // Modal State for Saving & Viewing Tactics
  const [activeViewerPlay, setActiveViewerPlay] = useState<SavedPlay | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isViewTacticsModalOpen, setIsViewTacticsModalOpen] = useState(false);
  const [tacticName, setTacticName] = useState('');
  const [tacticDate, setTacticDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [tacticCategory, setTacticCategory] = useState('Ataque');
  const [tacticNotes, setTacticNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSavedPlays = useMemo(() => {
    if (!searchTerm.trim()) return savedPlays;
    const term = searchTerm.toLowerCase().trim();
    return savedPlays.filter(
      (p) =>
        p.title.toLowerCase().includes(term) ||
        p.createdAt.toLowerCase().includes(term) ||
        (p.category && p.category.toLowerCase().includes(term))
    );
  }, [savedPlays, searchTerm]);

  const offensePlays = useMemo(() => {
    return filteredSavedPlays.filter((p) => !p.category || p.category === 'Ataque');
  }, [filteredSavedPlays]);

  const defensePlays = useMemo(() => {
    return filteredSavedPlays.filter((p) => p.category === 'Defensa');
  }, [filteredSavedPlays]);

  const specialPlays = useMemo(() => {
    return filteredSavedPlays.filter(
      (p) => p.category && p.category !== 'Ataque' && p.category !== 'Defensa'
    );
  }, [filteredSavedPlays]);

  // Animation & Play States
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 1
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isLooping, setIsLooping] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const viewerContainerRef = useRef<HTMLDivElement>(null);

  // Helper tool color
  const getToolColor = (tool: DrawTool): string => {
    switch (tool) {
      case 'pass':
        return '#0284C7'; // Cyan/Blue dashed
      case 'dribble':
        return '#D97706'; // Amber wavy
      case 'screen':
        return '#E11D48'; // Rose block
      case 'cut':
        return '#059669'; // Emerald solid
      case 'shot':
        return '#C084FC'; // Fucsia/Purple shot
      default:
        return '#3B82F6';
    }
  };

  // Animation Loop Effect
  useEffect(() => {
    if (!isPlaying) return;

    let animationFrameId: number;
    let lastTime = performance.now();
    const DURATION_SECONDS = 3.5;

    const animate = (now: number) => {
      const deltaTime = (now - lastTime) / 1000;
      lastTime = now;

      setProgress((prev) => {
        const next = prev + (deltaTime / DURATION_SECONDS) * playbackSpeed;
        if (next >= 1) {
          if (isLooping) {
            return 0;
          } else {
            setIsPlaying(false);
            return 1;
          }
        }
        return next;
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, playbackSpeed, isLooping]);

  const handleRewind = () => {
    setProgress(0);
    setIsPlaying(true);
  };

  // Calculate active frame during playback
  const totalFrames = frames.length;
  const scaledProgress = progress * totalFrames;
  const activeAnimFrameIdx = Math.min(
    totalFrames - 1,
    Math.floor(scaledProgress)
  );
  const localProgress =
    progress >= 1 ? 1 : scaledProgress - activeAnimFrameIdx;

  // Map each token to its position in the active frame during animation
  const tokenAnimatedPositions = useMemo(() => {
    if (!isPlaying && progress === 0) return null;

    const activeFrame = frames[activeAnimFrameIdx] || frames[0];
    if (!activeFrame) return null;

    const frameTokens = activeFrame.tokens;
    const framePaths = activeFrame.paths;
    const frameP = localProgress;

    const positions: Record<string, Point> = {};

    // 1. Identify Ball Carrier at start of active frame
    const ballToken = frameTokens.find((t) => t.type === 'ball');
    let ballCarrierId: string | null = null;

    if (ballToken) {
      let minDist = Infinity;
      frameTokens.forEach((p) => {
        if (p.type !== 'ball') {
          const dist = Math.sqrt(
            Math.pow(p.x - ballToken.x, 2) + Math.pow(p.y - ballToken.y, 2)
          );
          if (dist < minDist && dist < 10) {
            minDist = dist;
            ballCarrierId = p.id;
          }
        }
      });
    }

    // Find ball carrier's movement path (dribble/cut/screen)
    let carrierMovePath: TacticalPath | null = null;
    let carrierMoveEnd: Point | null = null;

    if (ballCarrierId) {
      const carrier = frameTokens.find((c) => c.id === ballCarrierId);
      if (carrier) {
        carrierMovePath = framePaths.find((path) => {
          if (path.tool === 'pass' || path.tool === 'shot') return false;
          if (path.points.length < 2) return false;
          const dist = Math.sqrt(
            Math.pow(path.points[0].x - carrier.x, 2) +
              Math.pow(path.points[0].y - carrier.y, 2)
          );
          return dist < 12;
        }) || null;

        if (carrierMovePath) {
          carrierMoveEnd = carrierMovePath.points[carrierMovePath.points.length - 1];
        }
      }
    }

    // Find pass or shot path in this frame
    let passOrShotPath: TacticalPath | null = null;
    let isSequentialPass = false;

    if (ballToken) {
      // First check if pass/shot starts near carrier's MOVED position (end of dribble)
      if (carrierMoveEnd) {
        passOrShotPath = framePaths.find((path) => {
          if (path.tool !== 'pass' && path.tool !== 'shot') return false;
          if (path.points.length < 2) return false;
          const dist = Math.sqrt(
            Math.pow(path.points[0].x - carrierMoveEnd!.x, 2) +
              Math.pow(path.points[0].y - carrierMoveEnd!.y, 2)
          );
          return dist < 14;
        }) || null;

        if (passOrShotPath) {
          isSequentialPass = true;
        }
      }

      // If not sequential, check if pass/shot starts near initial ball/carrier position
      if (!passOrShotPath) {
        passOrShotPath = framePaths.find((path) => {
          if (path.tool !== 'pass' && path.tool !== 'shot') return false;
          if (path.points.length < 2) return false;
          const startPt = path.points[0];

          const distToBall = Math.sqrt(
            Math.pow(startPt.x - ballToken.x, 2) + Math.pow(startPt.y - ballToken.y, 2)
          );
          if (distToBall < 12) return true;

          if (ballCarrierId) {
            const carrier = frameTokens.find((c) => c.id === ballCarrierId);
            if (carrier) {
              const distToCarrier = Math.sqrt(
                Math.pow(startPt.x - carrier.x, 2) + Math.pow(startPt.y - carrier.y, 2)
              );
              if (distToCarrier < 12) return true;
            }
          }
          return false;
        }) || null;
      }
    }

    // 2. Animate each player token along its path
    frameTokens.forEach((token) => {
      if (token.type === 'ball') return; // Handled separately below

      let closestPath: TacticalPath | null = null;
      let minDistance = Infinity;

      framePaths.forEach((p) => {
        if (p.tool === 'pass' || p.tool === 'shot') return; // Pass and Shot belong to ball, not players!
        if (p.points.length < 2) return;
        const startPt = p.points[0];
        const dist = Math.sqrt(
          Math.pow(startPt.x - token.x, 2) + Math.pow(startPt.y - token.y, 2)
        );
        if (dist < minDistance && dist < 12) {
          minDistance = dist;
          closestPath = p;
        }
      });

      if (closestPath) {
        let playerP = frameP;
        if (token.id === ballCarrierId && isSequentialPass) {
          playerP = Math.min(1, frameP * 2);
        }

        positions[token.id] = getPointAlongPath(
          (closestPath as TacticalPath).points,
          playerP
        );
      } else {
        positions[token.id] = { x: token.x, y: token.y };
      }
    });

    // 3. Animate Ball Token
    if (ballToken) {
      if (isSequentialPass && passOrShotPath && carrierMovePath) {
        if (frameP <= 0.5) {
          const carrierPos = positions[ballCarrierId!];
          if (carrierPos) {
            positions[ballToken.id] = { x: carrierPos.x, y: carrierPos.y };
          } else {
            positions[ballToken.id] = getPointAlongPath(carrierMovePath.points, frameP * 2);
          }
        } else {
          const passP = (frameP - 0.5) * 2;
          positions[ballToken.id] = getPointAlongPath(passOrShotPath.points, passP);
        }
      } else if (passOrShotPath && passOrShotPath.points.length >= 2) {
        // Ball travels along pass/shot path!
        positions[ballToken.id] = getPointAlongPath(passOrShotPath.points, frameP);
      } else if (ballCarrierId) {
        // Ball moves alongside the ball carrier's animated position
        const carrierAnimPos =
          positions[ballCarrierId] ||
          frameTokens.find((t) => t.id === ballCarrierId);
        if (carrierAnimPos) {
          positions[ballToken.id] = { x: carrierAnimPos.x, y: carrierAnimPos.y };
        } else {
          positions[ballToken.id] = { x: ballToken.x, y: ballToken.y };
        }
      } else {
        positions[ballToken.id] = { x: ballToken.x, y: ballToken.y };
      }
    }

    return positions;
  }, [isPlaying, progress, frames, activeAnimFrameIdx, localProgress]);

  const getRelativeCoords = (e: React.MouseEvent | React.TouchEvent): Point | null => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    return { x, y };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (isPlaying) return;

    const pt = getRelativeCoords(e);
    if (!pt) return;

    // Handle placement click
    if (activePlacementMode === 'playerA') {
      const playerNum = nextPlayerANumber > 15 ? ((nextPlayerANumber - 1) % 15) + 1 : nextPlayerANumber;
      const newToken: TacticalToken = {
        id: `a-${Date.now()}`,
        type: 'playerA',
        label: `${playerNum}`,
        x: pt.x,
        y: pt.y,
        color: '#2563EB',
      };
      const updated = [...tokens, newToken];
      syncFrames(updated, paths);
      setBaseTokens(updated);
      setNextPlayerANumber((prev) => (prev >= 15 ? 1 : prev + 1));
      return;
    }

    if (activePlacementMode === 'playerB') {
      const playerNum = nextPlayerBNumber > 15 ? ((nextPlayerBNumber - 1) % 15) + 1 : nextPlayerBNumber;
      const newToken: TacticalToken = {
        id: `b-${Date.now()}`,
        type: 'playerB',
        label: `${playerNum}`,
        x: pt.x,
        y: pt.y,
        color: '#DC2626',
      };
      const updated = [...tokens, newToken];
      syncFrames(updated, paths);
      setBaseTokens(updated);
      setNextPlayerBNumber((prev) => (prev >= 15 ? 1 : prev + 1));
      return;
    }

    if (activePlacementMode === 'ball') {
      const newToken: TacticalToken = {
        id: `ball-${Date.now()}`,
        type: 'ball',
        label: '🏀',
        x: pt.x,
        y: pt.y,
      };
      const updated = [...tokens, newToken];
      syncFrames(updated, paths);
      setBaseTokens(updated);
      return;
    }

    if (activePlacementMode === 'cone') {
      const newToken: TacticalToken = {
        id: `cone-${Date.now()}`,
        type: 'cone',
        label: '▲',
        x: pt.x,
        y: pt.y,
        color: '#F59E0B',
      };
      const updated = [...tokens, newToken];
      syncFrames(updated, paths);
      setBaseTokens(updated);
      return;
    }

    // Drawing tool mode
    if (selectedTool !== 'select' && selectedTool !== 'eraser') {
      // Snap start point to nearest player/ball token if clicked near it
      const nearbyToken = tokens.find((t) => {
        const dist = Math.sqrt(Math.pow(t.x - pt.x, 2) + Math.pow(t.y - pt.y, 2));
        return dist < 8; // 8% threshold
      });

      const startPt = nearbyToken ? { x: nearbyToken.x, y: nearbyToken.y } : pt;

      setIsDrawing(true);
      setCurrentPoints([startPt]);
    }
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (activeTokenId && selectedTool === 'select' && activePlacementMode === 'none' && !isPlaying) {
      const pt = getRelativeCoords(e);
      if (pt) {
        const tokenToMove = tokens.find((t) => t.id === activeTokenId);
        if (tokenToMove) {
          const dx = pt.x - tokenToMove.x;
          const dy = pt.y - tokenToMove.y;

          // Check if token is holding the ball
          const ballToken = tokens.find((t) => t.type === 'ball');
          let isHoldingBall = false;
          if (ballToken && tokenToMove.type !== 'ball') {
            const distToBall = Math.sqrt(
              Math.pow(tokenToMove.x - ballToken.x, 2) +
                Math.pow(tokenToMove.y - ballToken.y, 2)
            );
            if (distToBall < 10) isHoldingBall = true;
          }

          const updatedTokens = tokens.map((t) => {
            if (t.id === activeTokenId) {
              return { ...t, x: pt.x, y: pt.y };
            }
            if (isHoldingBall && ballToken && t.id === ballToken.id) {
              return { ...t, x: t.x + dx, y: t.y + dy };
            }
            return t;
          });

          syncFrames(updatedTokens, paths);
          setBaseTokens(updatedTokens);
        }
      }
      return;
    }

    if (!isDrawing || selectedTool === 'select' || activePlacementMode !== 'none') return;

    const pt = getRelativeCoords(e);
    if (!pt) return;

    if (lineStyle === 'curve') {
      setCurrentPoints((prev) => [...prev, pt]);
    } else {
      setCurrentPoints((prev) => [prev[0], pt]);
    }
  };

  const handlePointerUp = () => {
    if (activeTokenId) {
      setActiveTokenId(null);
    }

    if (isDrawing && currentPoints.length >= 2) {
      const startPt = currentPoints[0];
      let endPt = currentPoints[currentPoints.length - 1];

      // Snap end point if released near another token
      const nearbyEndToken = tokens.find((t) => {
        const distToEnd = Math.sqrt(Math.pow(t.x - endPt.x, 2) + Math.pow(t.y - endPt.y, 2));
        const distToStart = Math.sqrt(Math.pow(t.x - startPt.x, 2) + Math.pow(t.y - startPt.y, 2));
        return distToEnd < 8 && distToStart > 3;
      });

      if (nearbyEndToken) {
        endPt = { x: nearbyEndToken.x, y: nearbyEndToken.y };
      }

      const finalPoints =
        lineStyle === 'curve'
          ? [...currentPoints.slice(0, -1), endPt]
          : [startPt, endPt];

      const dx = endPt.x - startPt.x;
      const dy = endPt.y - startPt.y;
      const totalLen = Math.sqrt(dx * dx + dy * dy);

      if (totalLen > 1.5) {
        const newPath: TacticalPath = {
          id: `path-${Date.now()}`,
          tool: selectedTool,
          style: lineStyle,
          points: finalPoints,
          color: getToolColor(selectedTool),
        };
        const updatedPaths = [...paths, newPath];
        syncFrames(tokens, updatedPaths);
      }
    }

    setIsDrawing(false);
    setCurrentPoints([]);
  };

  const handleUndo = () => {
    const updatedPaths = paths.slice(0, -1);
    syncFrames(tokens, updatedPaths);
  };

  const handleClearTrazos = () => {
    syncFrames(tokens, []);
    setIsPlaying(false);
    setProgress(0);
  };

  const handleClearAll = () => {
    const initialFrame: PlayFrame = {
      id: `frame-${Date.now()}`,
      title: 'Fase 1',
      tokens: [],
      paths: [],
    };
    setFrames([initialFrame]);
    setCurrentFrameIndex(0);
    setTokens([]);
    setPaths([]);
    setBaseTokens([]);
    setNextPlayerANumber(1);
    setNextPlayerBNumber(1);
    setIsPlaying(false);
    setProgress(0);
  };

  const handleResetPositions = () => {
    setIsPlaying(false);
    setProgress(0);
    if (frames[0]) {
      setCurrentFrameIndex(0);
      setTokens(frames[0].tokens);
      setPaths(frames[0].paths);
    }
  };

  const handleTogglePlay = () => {
    const hasAnyPaths = frames.some((f) => f.paths.length > 0) || paths.length > 0;
    if (!hasAnyPaths && tokens.length === 0) {
      alert('Añade jugadores y dibuja trazos tácticos para poder reproducir la jugada.');
      return;
    }

    if (progress >= 1) {
      setProgress(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleOpenSaveModal = () => {
    if (!userProfile) {
      if (onOpenTrialModal) onOpenTrialModal('general_action');
      return;
    }
    setTacticName(`Táctica ${savedPlays.length + 1}`);
    const todayStr = new Date().toISOString().split('T')[0];
    setTacticDate(todayStr);
    setTacticNotes('');
    setIsSaveModalOpen(true);
  };

  const handleConfirmSavePlay = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!consumeTrialAction(userProfile, 'whiteboard')) {
      setIsSaveModalOpen(false);
      if (onOpenTrialModal) onOpenTrialModal('general_action');
      return;
    }

    if (!tacticName.trim()) {
      alert('Por favor ingresa un nombre para la táctica.');
      return;
    }

    let formattedDate = tacticDate;
    if (tacticDate && tacticDate.includes('-')) {
      const parts = tacticDate.split('-');
      if (parts.length === 3) {
        formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    } else if (!formattedDate) {
      formattedDate = new Date().toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    }

    const currentFramesState =
      frames.length > 0
        ? frames
        : [
            {
              id: `frame-${Date.now()}`,
              title: 'Fase 1',
              tokens: [...tokens],
              paths: [...paths],
            },
          ];

    const newPlay: SavedPlay = {
      id: `play-${Date.now()}`,
      title: tacticName.trim(),
      createdAt: formattedDate,
      category: tacticCategory,
      notes: tacticNotes.trim(),
      tokens: [...tokens],
      paths: [...paths],
      frames: [...currentFramesState],
    };

    const updated = [newPlay, ...savedPlays];
    setSavedPlays(updated);
    setSelectedPlayId(newPlay.id);
    localStorage.setItem('coach_saved_plays', JSON.stringify(updated));

    setIsSaveModalOpen(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleLoadPlay = (play: SavedPlay) => {
    setActiveViewerPlay(play);
    setSelectedPlayId(play.id);
    setIsPlaying(false);
    setProgress(0);

    if (play.frames && play.frames.length > 0) {
      setFrames(play.frames);
      setCurrentFrameIndex(0);
      setTokens(play.frames[0].tokens);
      setPaths(play.frames[0].paths);
      setBaseTokens(play.frames[0].tokens);
    } else {
      const singleFrame: PlayFrame = {
        id: `frame-${Date.now()}`,
        title: 'Fase 1',
        tokens: play.tokens || [],
        paths: play.paths || [],
      };
      setFrames([singleFrame]);
      setCurrentFrameIndex(0);
      setTokens(play.tokens || []);
      setPaths(play.paths || []);
      setBaseTokens(play.tokens || []);
    }
    
    // Auto start play
    setTimeout(() => {
      setIsPlaying(true);
    }, 100);
    setIsViewTacticsModalOpen(false);
  };

  const handleDeletePlay = (playId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const play = savedPlays.find((p) => p.id === playId);
    if (!play) return;

    const updated = savedPlays.filter((p) => p.id !== playId);
    setSavedPlays(updated);
    localStorage.setItem('coach_saved_plays', JSON.stringify(updated));

    if (selectedPlayId === playId) {
      setSelectedPlayId(updated[0]?.id || '');
    }
    if (activeViewerPlay?.id === playId) {
      setActiveViewerPlay(null);
    }
  };

  const renderPlayCard = (play: SavedPlay) => {
    const isSelected = selectedPlayId === play.id;
    const totalFramesCount = play.frames?.length || 1;

    return (
      <div
        key={play.id}
        className={`p-3.5 rounded-xl border transition-all space-y-2.5 ${
          isSelected
            ? 'bg-blue-950/70 border-blue-500 shadow-md ring-1 ring-blue-500/40'
            : 'bg-slate-900 border-slate-800 hover:border-slate-700'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <h5 className="font-extrabold text-xs text-white flex items-center gap-1.5 flex-wrap">
              <span>{play.title}</span>
              {play.category && (
                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-slate-800 text-amber-300 border border-slate-700">
                  {play.category}
                </span>
              )}
            </h5>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <span className="flex items-center gap-1 text-slate-300">
                <Calendar className="w-3 h-3 text-amber-400" />
                {play.createdAt}
              </span>
              <span>•</span>
              <span>{totalFramesCount} fase{totalFramesCount === 1 ? '' : 's'}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => handleLoadPlay(play)}
              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-[11px] flex items-center gap-1 shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <FolderOpen className="w-3 h-3" />
              <span>Cargar</span>
            </button>
            <button
              type="button"
              onClick={(e) => handleDeletePlay(play.id, e)}
              title="Eliminar esta táctica"
              className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-800/80 text-red-400 hover:text-red-200 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {play.notes && (
          <p className="text-[10.5px] text-slate-300 italic line-clamp-2 bg-slate-950/80 p-1.5 rounded-lg border border-slate-800/80">
            "{play.notes}"
          </p>
        )}
      </div>
    );
  };

  if (activeViewerPlay) {
    return (
      <div className="space-y-6 animate-fadeIn max-w-5xl mx-auto pb-12">
        {/* Banner Superior de la Táctica Guardada */}
        <div className="bg-slate-900 border border-slate-700/80 p-4 sm:p-6 rounded-3xl text-white shadow-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-extrabold text-xs uppercase tracking-wider flex items-center gap-1">
                  <Play className="w-3 h-3 fill-blue-300" />
                  Visor de Táctica Guardada
                </span>
                {activeViewerPlay.category && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-xs">
                    {activeViewerPlay.category}
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {activeViewerPlay.title}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="bg-slate-950/80 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-2xl border border-slate-800 text-right">
                <span className="text-[10px] text-slate-400 block uppercase font-extrabold tracking-wider">
                  Fecha de Guardado
                </span>
                <span className="text-xs font-mono font-bold text-amber-300 flex items-center justify-end gap-1.5 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  {activeViewerPlay.createdAt}
                </span>
              </div>
              <button
                onClick={() => {
                  setIsPlaying(false);
                  setProgress(0);
                  setActiveViewerPlay(null);
                  handleClearAll();
                  setSelectedPlayId('');
                }}
                className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2 border border-slate-700 transition-all active:scale-95 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-blue-400" />
                <span>Volver a Pizarra Limpia</span>
              </button>
            </div>
          </div>

          {activeViewerPlay.notes && (
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-slate-300 text-xs italic flex items-start gap-2.5 leading-relaxed">
              <FileText className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p>"{activeViewerPlay.notes}"</p>
            </div>
          )}
        </div>

        {/* Reproductor y Cancha en Modo Video */}
        <div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-3xl shadow-2xl space-y-4">
          {/* Barra de Controles de Animación */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/90 p-3.5 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`px-4 py-2.5 rounded-xl text-white font-black text-xs flex items-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer ${
                  isPlaying
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
                    : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                }`}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-white" />
                    <span>Pausar</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Reproducir Táctica</span>
                  </>
                )}
              </button>

              <button
                onClick={handleRewind}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                title="Reiniciar reproducción"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Barra de Progreso / Scrubber */}
            <div className="flex-1 max-w-md mx-2 flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-slate-400 w-8 text-right">
                {Math.round(progress * 100)}%
              </span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={progress}
                onChange={(e) => {
                  setIsPlaying(false);
                  setProgress(parseFloat(e.target.value));
                }}
                className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
                {[0.5, 1, 1.5, 2].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setPlaybackSpeed(spd)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition-colors cursor-pointer ${
                      playbackSpeed === spd
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>

              <button
                onClick={() => setIsLooping(!isLooping)}
                title="Bucle continuo"
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  isLooping
                    ? 'bg-blue-600/30 text-blue-400 border-blue-500'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <Repeat className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Fases si la jugada tiene más de 1 fase */}
          {frames.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                Fases de Jugada:
              </span>
              {frames.map((frame, idx) => {
                const isAnimActive = isPlaying && activeAnimFrameIdx === idx;
                const isCurrent = !isPlaying && currentFrameIndex === idx;

                return (
                  <button
                    key={frame.id}
                    onClick={() => {
                      setIsPlaying(false);
                      handleSelectFrame(idx);
                    }}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-extrabold transition-all shrink-0 cursor-pointer ${
                      isAnimActive
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md ring-2 ring-amber-400/40 animate-pulse'
                        : isCurrent
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {frame.title}
                  </button>
                );
              })}
            </div>
          )}

          {/* Cancha de Baloncesto (Solo Lectura) */}
          <div
            ref={viewerContainerRef}
            className="w-full aspect-[16/10] bg-[#1E293B] rounded-2xl relative overflow-hidden border-2 border-slate-700 shadow-inner select-none pointer-events-none"
          >
            {/* FIBA Basketball Court Lines SVG */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <rect x="2" y="3" width="96" height="94" fill="none" stroke="#64748B" strokeWidth="0.8" />
              {courtType === 'full' && (
                <>
                  <line x1="50" y1="3" x2="50" y2="97" stroke="#64748B" strokeWidth="0.8" />
                  <ellipse cx="50" cy="50" rx="8" ry="12" fill="none" stroke="#64748B" strokeWidth="0.8" />
                </>
              )}
              <rect x="2" y="30" width="19" height="40" fill="none" stroke="#64748B" strokeWidth="0.8" />
              <path d="M 21 30 A 6 10 0 0 1 21 70" fill="none" stroke="#64748B" strokeWidth="0.8" strokeDasharray="1.5 1.5" />
              <path d="M 21 30 A 6 10 0 0 0 21 70" fill="none" stroke="#64748B" strokeWidth="0.8" />
              <path d="M 2 13 L 12 13 A 24 37 0 0 1 12 87 L 2 87" fill="none" stroke="#64748B" strokeWidth="0.8" />
              <line x1="4" y1="43" x2="4" y2="57" stroke="#FFFFFF" strokeWidth="1.2" />
              <circle cx="5.5" cy="50" r="2.2" fill="none" stroke="#F97316" strokeWidth="0.8" />
              {courtType === 'full' && (
                <>
                  <rect x="79" y="30" width="19" height="40" fill="none" stroke="#64748B" strokeWidth="0.8" />
                  <path d="M 79 30 A 6 10 0 0 0 79 70" fill="none" stroke="#64748B" strokeWidth="0.8" strokeDasharray="1.5 1.5" />
                  <path d="M 79 30 A 6 10 0 0 1 79 70" fill="none" stroke="#64748B" strokeWidth="0.8" />
                  <path d="M 98 13 L 88 13 A 24 37 0 0 0 88 87 L 98 87" fill="none" stroke="#64748B" strokeWidth="0.8" />
                  <line x1="96" y1="43" x2="96" y2="57" stroke="#FFFFFF" strokeWidth="1.2" />
                  <circle cx="94.5" cy="50" r="2.2" fill="none" stroke="#F97316" strokeWidth="0.8" />
                </>
              )}
            </svg>

            {/* Drawn Paths SVG */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              {(isPlaying ? (frames[activeAnimFrameIdx]?.paths || []) : paths).map((p) => {
                if (p.points.length < 2) return null;
                const firstPt = p.points[0];
                const lastPt = p.points[p.points.length - 1];
                const isPass = p.tool === 'pass';
                const isDribble = p.tool === 'dribble';
                const isCut = p.tool === 'cut';
                const isScreen = p.tool === 'screen';
                const isShot = p.tool === 'shot';

                let pathD = '';
                if (isDribble) {
                  pathD = generateZigzagPathData(p.points);
                } else if (p.style === 'straight') {
                  pathD = `M ${firstPt.x} ${firstPt.y} L ${lastPt.x} ${lastPt.y}`;
                } else {
                  pathD = `M ${p.points.map((pt) => `${pt.x} ${pt.y}`).join(' L ')}`;
                }

                const arrowPoints = (isPass || isDribble || isCut || isShot)
                  ? getArrowHeadPoints(p.points[p.points.length - 2] || firstPt, lastPt, 2.8)
                  : '';
                const screenBar = isScreen ? getScreenBarCoords(p.points[p.points.length - 2] || firstPt, lastPt, 3.8) : null;
                const animatedHead = getPointAlongPath(p.points, isPlaying ? localProgress : progress);

                return (
                  <g key={p.id}>
                    <path
                      d={pathD}
                      fill="none"
                      stroke={p.color}
                      strokeWidth={isShot ? '1.4' : '1.2'}
                      strokeDasharray={isPass ? '1.8 1.8' : isShot ? '1.2 1.2' : 'none'}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={isPlaying ? 0.9 : progress > 0 ? 0.75 : 1}
                    />
                    {(isPass || isDribble || isCut || isShot) && arrowPoints && (
                      <polygon points={arrowPoints} fill={p.color} opacity={isPlaying ? 0.9 : progress > 0 ? 0.75 : 1} />
                    )}
                    {isScreen && screenBar && (
                      <line x1={screenBar.b1.x} y1={screenBar.b1.y} x2={screenBar.b2.x} y2={screenBar.b2.y} stroke={p.color} strokeWidth="1.6" strokeLinecap="round" opacity={isPlaying ? 0.9 : progress > 0 ? 0.75 : 1} />
                    )}
                    {isShot && (
                      <circle cx={lastPt.x} cy={lastPt.y} r="1.8" fill="none" stroke={p.color} strokeWidth="0.8" />
                    )}
                    {(isPlaying || progress > 0) && (
                      <circle cx={animatedHead.x} cy={animatedHead.y} r="1.6" fill={p.color} className="animate-pulse" />
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Fichas de Jugadores y Balón Animadas */}
            {(isPlaying ? (frames[activeAnimFrameIdx]?.tokens || tokens) : tokens).map((token) => {
              const animPos = tokenAnimatedPositions ? tokenAnimatedPositions[token.id] : null;
              const currentX = animPos ? animPos.x : token.x;
              const currentY = animPos ? animPos.y : token.y;

              return (
                <div
                  key={token.id}
                  style={{
                    left: `${currentX}%`,
                    top: `${currentY}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className="absolute w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-xs shadow-lg transition-transform pointer-events-none"
                >
                  {token.type === 'playerA' && (
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center border-2 border-white font-bold text-xs shadow-md">
                      {token.label}
                    </div>
                  )}
                  {token.type === 'playerB' && (
                    <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center border-2 border-white font-bold text-xs shadow-md">
                      {token.label}
                    </div>
                  )}
                  {token.type === 'ball' && (
                    <div className="text-xl filter drop-shadow">🏀</div>
                  )}
                  {token.type === 'cone' && (
                    <div className="text-xl filter drop-shadow">▲</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Botón Inferior: Volver a la Sección de Pizarra */}
        <div className="flex items-center justify-center pt-2">
          <button
            onClick={() => {
              setIsPlaying(false);
              setProgress(0);
              setActiveViewerPlay(null);
              handleClearAll();
              setSelectedPlayId('');
            }}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm flex items-center gap-2.5 shadow-xl shadow-blue-600/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
            <span>Volver a Pizarra Limpia (Nuevo Proyecto)</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn max-w-7xl mx-auto pb-12 whiteboard-view" data-board="true" data-allow-action="true">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/20 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Pizarra Táctica Interactiva</span>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center gap-1">
                <Play className="w-3 h-3 fill-blue-700" />
                Con Animación
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Añade jugadores (1-15), dibuja pases, cortes o tiros, y presiona <strong>Play</strong> para ver la simulación en directo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              handleClearAll();
              setSelectedPlayId('');
            }}
            className="px-3.5 py-2 rounded-xl font-bold text-xs bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Limpiar la pizarra para empezar un nuevo proyecto táctico"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Nueva Pizarra Limpia</span>
          </button>
          <button
            onClick={() => setCourtType('full')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all ${
              courtType === 'full'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Cancha entera
          </button>
          <button
            onClick={() => setCourtType('half')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all ${
              courtType === 'half'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Media cancha
          </button>
        </div>
      </div>

      {/* Main Whiteboard Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Tools Sidebar Panel (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Herramientas Box */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center justify-between">
              <span>Herramientas de Pizarra</span>
              <button
                onClick={handleClearAll}
                className="text-[11px] text-red-600 hover:underline font-bold"
              >
                Vaciar Pizarra
              </button>
            </h3>

            {/* Colocación de Jugadores y Elementos */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Colocar Fichas en Cancha (Hacer Clic)
              </span>
              <div className="grid grid-cols-2 gap-2">
                {/* Equipo A (Local) */}
                <button
                  onClick={() => {
                    setSelectedTool('select');
                    setActivePlacementMode(
                      activePlacementMode === 'playerA' ? 'none' : 'playerA'
                    );
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    activePlacementMode === 'playerA'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-300'
                      : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs">Equipo A (Local)</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                        activePlacementMode === 'playerA'
                          ? 'bg-white text-blue-700'
                          : 'bg-blue-200 text-blue-900'
                      }`}
                    >
                      #{nextPlayerANumber <= 15 ? nextPlayerANumber : 15}
                    </span>
                  </div>
                  <p className="text-[10px] opacity-80 mt-0.5">
                    {activePlacementMode === 'playerA'
                      ? 'Haz clic en cancha para colocar'
                      : 'Numerados del 1 al 15'}
                  </p>
                </button>

                {/* Equipo B (Visitante) */}
                <button
                  onClick={() => {
                    setSelectedTool('select');
                    setActivePlacementMode(
                      activePlacementMode === 'playerB' ? 'none' : 'playerB'
                    );
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    activePlacementMode === 'playerB'
                      ? 'bg-red-600 text-white border-red-600 shadow-md ring-2 ring-red-300'
                      : 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs">Equipo B (Visitante)</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                        activePlacementMode === 'playerB'
                          ? 'bg-white text-red-700'
                          : 'bg-red-200 text-red-900'
                      }`}
                    >
                      #{nextPlayerBNumber <= 15 ? nextPlayerBNumber : 15}
                    </span>
                  </div>
                  <p className="text-[10px] opacity-80 mt-0.5">
                    {activePlacementMode === 'playerB'
                      ? 'Haz clic en cancha para colocar'
                      : 'Numerados del 1 al 15'}
                  </p>
                </button>

                {/* Balón */}
                <button
                  onClick={() => {
                    setSelectedTool('select');
                    setActivePlacementMode(
                      activePlacementMode === 'ball' ? 'none' : 'ball'
                    );
                  }}
                  className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    activePlacementMode === 'ball'
                      ? 'bg-amber-500 text-slate-950 border-amber-600 font-extrabold shadow-sm'
                      : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <span>🏀</span>
                  <span>+ Balón</span>
                </button>

                {/* Cono */}
                <button
                  onClick={() => {
                    setSelectedTool('select');
                    setActivePlacementMode(
                      activePlacementMode === 'cone' ? 'none' : 'cone'
                    );
                  }}
                  className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    activePlacementMode === 'cone'
                      ? 'bg-orange-500 text-white border-orange-600 font-extrabold shadow-sm'
                      : 'bg-orange-50 text-orange-900 border-orange-200 hover:bg-orange-100'
                  }`}
                >
                  <span className="text-orange-600 font-black">▲</span>
                  <span>+ Cono</span>
                </button>
              </div>
            </div>

            {/* Trazos Tácticos */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Herramientas de Dibujo y Trazos
              </span>

              <div className="grid grid-cols-2 gap-2">
                {/* Mover / Selection */}
                <button
                  onClick={() => {
                    setSelectedTool('select');
                    setActivePlacementMode('none');
                  }}
                  className={`p-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    selectedTool === 'select' && activePlacementMode === 'none'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <MousePointer className="w-3.5 h-3.5" />
                  <span>Mover Fichas</span>
                </button>

                {/* Pase tool */}
                <button
                  onClick={() => {
                    setSelectedTool('pass');
                    setActivePlacementMode('none');
                  }}
                  className={`p-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    selectedTool === 'pass'
                      ? 'bg-sky-600 text-white border-sky-600 shadow-md'
                      : 'bg-slate-50 text-sky-700 border-slate-200 hover:bg-sky-50'
                  }`}
                >
                  <MoveUpRight className="w-3.5 h-3.5" />
                  <span>Pase</span>
                </button>

                {/* Dribling tool */}
                <button
                  onClick={() => {
                    setSelectedTool('dribble');
                    setActivePlacementMode('none');
                  }}
                  className={`p-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    selectedTool === 'dribble'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                      : 'bg-slate-50 text-amber-700 border-slate-200 hover:bg-amber-50'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Dribling</span>
                </button>

                {/* Bloqueo tool */}
                <button
                  onClick={() => {
                    setSelectedTool('screen');
                    setActivePlacementMode('none');
                  }}
                  className={`p-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    selectedTool === 'screen'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                      : 'bg-slate-50 text-rose-700 border-slate-200 hover:bg-rose-50'
                  }`}
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Bloqueo</span>
                </button>

                {/* Corte tool */}
                <button
                  onClick={() => {
                    setSelectedTool('cut');
                    setActivePlacementMode('none');
                  }}
                  className={`p-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    selectedTool === 'cut'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                      : 'bg-slate-50 text-emerald-700 border-slate-200 hover:bg-emerald-50'
                  }`}
                >
                  <Minus className="w-3.5 h-3.5 rotate-45" />
                  <span>Corte</span>
                </button>

                {/* Tiro tool (NUEVO) */}
                <button
                  onClick={() => {
                    setSelectedTool('shot');
                    setActivePlacementMode('none');
                  }}
                  className={`p-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    selectedTool === 'shot'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                      : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                  }`}
                >
                  <Target className="w-3.5 h-3.5 text-purple-500" />
                  <span>Tiro a Canasta</span>
                </button>

                {/* Borrar trazo */}
                <button
                  onClick={() => {
                    setSelectedTool('eraser');
                    setActivePlacementMode('none');
                  }}
                  className={`p-2.5 rounded-xl border font-bold text-xs col-span-2 flex items-center justify-center gap-1.5 transition-all ${
                    selectedTool === 'eraser'
                      ? 'bg-slate-800 text-white border-slate-800 shadow-md'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Eraser className="w-3.5 h-3.5" />
                  <span>Modo Borrador de Trazo</span>
                </button>
              </div>
            </div>
          </div>

          {/* Tarjeta de Tácticas de Equipo Guardadas */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-4.5 rounded-2xl border border-slate-700 text-white space-y-3.5 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                  <FolderOpen className="w-4 h-4 text-amber-400" />
                  Tácticas de Equipo Guardadas
                </h3>
                <p className="text-[11px] text-slate-400">
                  Biblioteca táctica guardada por fecha y nombre
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-amber-300 font-extrabold text-xs">
                {savedPlays.length}
              </span>
            </div>

            {/* Resumen táctico rápido */}
            <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
              <div className="p-1.5 rounded-lg bg-slate-950/60 border border-red-500/30 text-red-300 font-bold">
                <span className="block text-xs font-black text-white">{offensePlays.length}</span>
                <span>Ataque</span>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-950/60 border border-blue-500/30 text-blue-300 font-bold">
                <span className="block text-xs font-black text-white">{defensePlays.length}</span>
                <span>Defensa</span>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-950/60 border border-amber-500/30 text-amber-300 font-bold">
                <span className="block text-xs font-black text-white">{specialPlays.length}</span>
                <span>Especiales</span>
              </div>
            </div>

            {/* Botón para abrir modal con las 3 tarjetas de categorías */}
            <button
              onClick={() => setIsViewTacticsModalOpen(true)}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 active:scale-98 transition-all"
            >
              <Eye className="w-4 h-4 text-blue-200" />
              <span>Ver Tácticas Guardadas</span>
            </button>
          </div>

          {/* Trazo Style Selector Box (MÁS DELGADA) */}
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-2">
            <span className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
              Estilo de Trazo:
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setLineStyle('straight')}
                className={`py-1.5 px-3 rounded-lg border font-bold text-xs transition-all ${
                  lineStyle === 'straight'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Línea Recta
              </button>
              <button
                onClick={() => setLineStyle('curve')}
                className={`py-1.5 px-3 rounded-lg border font-bold text-xs transition-all ${
                  lineStyle === 'curve'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Línea Curva
              </button>
            </div>
          </div>

          {/* Action Footer Controls */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={handleUndo}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Deshacer</span>
              </button>
              <button
                onClick={handleClearTrazos}
                className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Borrar Trazos</span>
              </button>
            </div>

            <button
              onClick={handleOpenSaveModal}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/20 active:scale-95 transition-all"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>¡Guardada!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Guardar Táctica</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Basketball Court Canvas Area + Play Controls (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-800 shadow-2xl relative select-none space-y-4">
          
          {/* Top Playback Banner / Status Bar */}
          <div className="flex items-center justify-between bg-slate-800/90 backdrop-blur px-4 py-2.5 rounded-2xl border border-slate-700 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <span className={`w-2.5 h-2.5 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <span className="font-bold">
                {isPlaying
                  ? 'REPRODUCIENDO JUGADA...'
                  : progress > 0
                  ? 'ANIMACIÓN EN PAUSA'
                  : activePlacementMode !== 'none'
                  ? `MODO COLOCAR: ${activePlacementMode === 'playerA' ? 'EQUIPO A' : activePlacementMode === 'playerB' ? 'EQUIPO B' : activePlacementMode}`
                  : 'MODO EDICIÓN'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-slate-400 text-[11px] hidden sm:inline">
                Velocidad:
              </span>
              <div className="flex items-center bg-slate-900/80 p-0.5 rounded-lg border border-slate-700">
                {[0.5, 1, 1.5, 2].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setPlaybackSpeed(spd)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                      playbackSpeed === spd
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>

              <button
                onClick={() => setIsLooping(!isLooping)}
                title="Bucle continuo"
                className={`p-1.5 rounded-lg border transition-all ${
                  isLooping
                    ? 'bg-blue-600/30 text-blue-400 border-blue-500'
                    : 'bg-slate-900/80 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                <Repeat className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Frame Sequencer Bar (Secuencia Táctica por Fases) */}
          <div className="bg-slate-800/95 backdrop-blur p-3 sm:p-4 rounded-2xl border border-slate-700/80 space-y-2.5 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                  Secuencia por Fases (Pasos de Jugada)
                </span>
                {isPlaying && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-[10px] animate-pulse">
                    Fase {activeAnimFrameIdx + 1} de {frames.length}
                  </span>
                )}
              </div>

              <button
                onClick={handleAddFrame}
                disabled={isPlaying}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Añadir Fase (Siguiente Paso)</span>
              </button>
            </div>

            {/* Frame Selector Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
              {frames.map((frame, idx) => {
                const isActive = currentFrameIndex === idx && !isPlaying;
                const isAnimActive = isPlaying && activeAnimFrameIdx === idx;

                return (
                  <div
                    key={frame.id}
                    onClick={() => {
                      if (!isPlaying) handleSelectFrame(idx);
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-extrabold cursor-pointer transition-all shrink-0 ${
                      isAnimActive
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md ring-2 ring-amber-400/40 animate-pulse'
                        : isActive
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md ring-2 ring-blue-400/30'
                        : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    <span>{frame.title}</span>
                    <span className="text-[10px] opacity-75 font-mono">
                      ({frame.paths.length} trazo{frame.paths.length === 1 ? '' : 's'})
                    </span>

                    {frames.length > 1 && !isPlaying && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFrame(idx);
                        }}
                        title="Eliminar esta fase"
                        className="ml-1 p-0.5 rounded hover:bg-black/20 text-slate-300 hover:text-red-300"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] text-slate-400 italic">
              💡 <strong>Tip:</strong> Dibuja los trazos de la Fase 1 y presiona <strong>+ Añadir Fase</strong>. Las fichas y el balón comenzarán automáticamente en sus nuevas posiciones para el Paso 2.
            </p>
          </div>

          {/* Court Board Container */}
          <div
            ref={containerRef}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
            className="w-full aspect-[16/10] bg-[#1E293B] rounded-2xl relative overflow-hidden border-2 border-slate-700 cursor-crosshair shadow-inner"
          >
            {/* FIBA Basketball Court Lines SVG */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {/* Outer boundary line */}
              <rect
                x="2"
                y="3"
                width="96"
                height="94"
                fill="none"
                stroke="#64748B"
                strokeWidth="0.8"
              />

              {courtType === 'full' && (
                <>
                  {/* Halfcourt line */}
                  <line
                    x1="50"
                    y1="3"
                    x2="50"
                    y2="97"
                    stroke="#64748B"
                    strokeWidth="0.8"
                  />
                  {/* Center Circle */}
                  <ellipse
                    cx="50"
                    cy="50"
                    rx="8"
                    ry="12"
                    fill="none"
                    stroke="#64748B"
                    strokeWidth="0.8"
                  />
                </>
              )}

              {/* Left Key / Paint Area */}
              <rect
                x="2"
                y="30"
                width="19"
                height="40"
                fill="none"
                stroke="#64748B"
                strokeWidth="0.8"
              />
              {/* Left Free throw circle */}
              <path
                d="M 21 30 A 6 10 0 0 1 21 70"
                fill="none"
                stroke="#64748B"
                strokeWidth="0.8"
                strokeDasharray="1.5 1.5"
              />
              <path
                d="M 21 30 A 6 10 0 0 0 21 70"
                fill="none"
                stroke="#64748B"
                strokeWidth="0.8"
              />
              {/* Left 3-Point Arc */}
              <path
                d="M 2 13 L 12 13 A 24 37 0 0 1 12 87 L 2 87"
                fill="none"
                stroke="#64748B"
                strokeWidth="0.8"
              />
              {/* Left Hoop and Backboard */}
              <line x1="4" y1="43" x2="4" y2="57" stroke="#FFFFFF" strokeWidth="1.2" />
              <circle cx="5.5" cy="50" r="2.2" fill="none" stroke="#F97316" strokeWidth="0.8" />

              {/* Right Side (if full court) */}
              {courtType === 'full' && (
                <>
                  {/* Right Key / Paint Area */}
                  <rect
                    x="79"
                    y="30"
                    width="19"
                    height="40"
                    fill="none"
                    stroke="#64748B"
                    strokeWidth="0.8"
                  />
                  {/* Right Free throw circle */}
                  <path
                    d="M 79 30 A 6 10 0 0 0 79 70"
                    fill="none"
                    stroke="#64748B"
                    strokeWidth="0.8"
                    strokeDasharray="1.5 1.5"
                  />
                  <path
                    d="M 79 30 A 6 10 0 0 1 79 70"
                    fill="none"
                    stroke="#64748B"
                    strokeWidth="0.8"
                  />
                  {/* Right 3-Point Arc */}
                  <path
                    d="M 98 13 L 88 13 A 24 37 0 0 0 88 87 L 98 87"
                    fill="none"
                    stroke="#64748B"
                    strokeWidth="0.8"
                  />
                  {/* Right Hoop and Backboard */}
                  <line x1="96" y1="43" x2="96" y2="57" stroke="#FFFFFF" strokeWidth="1.2" />
                  <circle cx="94.5" cy="50" r="2.2" fill="none" stroke="#F97316" strokeWidth="0.8" />
                </>
              )}
            </svg>

            {/* Drawn Paths Overlay SVG */}
            <svg
              className={`absolute inset-0 w-full h-full ${
                selectedTool === 'eraser' ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'
              }`}
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {/* Render paths (Active frame paths or accumulated active) */}
              {(isPlaying ? (frames[activeAnimFrameIdx]?.paths || []) : paths).map((p) => {
                if (p.points.length < 2) return null;

                const firstPt = p.points[0];
                const lastPt = p.points[p.points.length - 1];

                const isPass = p.tool === 'pass';
                const isDribble = p.tool === 'dribble';
                const isCut = p.tool === 'cut';
                const isScreen = p.tool === 'screen';
                const isShot = p.tool === 'shot';

                let pathD = '';
                if (isDribble) {
                  pathD = generateZigzagPathData(p.points);
                } else if (p.style === 'straight') {
                  pathD = `M ${firstPt.x} ${firstPt.y} L ${lastPt.x} ${lastPt.y}`;
                } else {
                  pathD = `M ${p.points.map((pt) => `${pt.x} ${pt.y}`).join(' L ')}`;
                }

                // Arrowhead or Screen bar calculation
                const arrowPoints =
                  isPass || isDribble || isCut || isShot
                    ? getArrowHeadPoints(p.points[p.points.length - 2] || firstPt, lastPt, 2.8)
                    : '';

                const screenBar = isScreen
                  ? getScreenBarCoords(p.points[p.points.length - 2] || firstPt, lastPt, 3.8)
                  : null;

                // Animated tracer dot riding the path inside active frame
                const animatedHead = getPointAlongPath(p.points, isPlaying ? localProgress : progress);

                return (
                  <g
                    key={p.id}
                    onClick={() => {
                      if (selectedTool === 'eraser' && !isPlaying) {
                        const updated = paths.filter((item) => item.id !== p.id);
                        syncFrames(tokens, updated);
                      }
                    }}
                    className={selectedTool === 'eraser' ? 'hover:opacity-50 transition-opacity' : ''}
                  >
                    {/* Wider invisible stroke for easy tap/click erasure */}
                    {selectedTool === 'eraser' && (
                      <path
                        d={pathD}
                        fill="none"
                        stroke="transparent"
                        strokeWidth="5"
                        pointerEvents="stroke"
                      />
                    )}

                    {/* Main Tactical Stroke */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke={p.color}
                      strokeWidth={isShot ? '1.4' : '1.2'}
                      strokeDasharray={isPass ? '1.8 1.8' : isShot ? '1.2 1.2' : 'none'}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={isPlaying ? 0.9 : progress > 0 ? 0.75 : 1}
                    />

                    {/* Arrowhead marker at end of path */}
                    {(isPass || isDribble || isCut || isShot) && arrowPoints && (
                      <polygon
                        points={arrowPoints}
                        fill={p.color}
                        opacity={isPlaying ? 0.9 : progress > 0 ? 0.75 : 1}
                      />
                    )}

                    {/* Screen Bar at end of path */}
                    {isScreen && screenBar && (
                      <line
                        x1={screenBar.b1.x}
                        y1={screenBar.b1.y}
                        x2={screenBar.b2.x}
                        y2={screenBar.b2.y}
                        stroke={p.color}
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        opacity={isPlaying ? 0.9 : progress > 0 ? 0.75 : 1}
                      />
                    )}

                    {/* Target marker for SHOT tool */}
                    {isShot && (
                      <circle
                        cx={lastPt.x}
                        cy={lastPt.y}
                        r="1.8"
                        fill="none"
                        stroke={p.color}
                        strokeWidth="0.8"
                      />
                    )}

                    {/* Glowing Tracer Dot during animation */}
                    {(isPlaying || progress > 0) && (
                      <circle
                        cx={animatedHead.x}
                        cy={animatedHead.y}
                        r="1.6"
                        fill={p.color}
                        className="animate-pulse"
                      />
                    )}
                  </g>
                );
              })}

              {/* Current drawing preview path */}
              {isDrawing && currentPoints.length >= 2 && (() => {
                const p1 = currentPoints[0];
                const p2 = currentPoints[currentPoints.length - 1];
                const color = getToolColor(selectedTool);

                const isPass = selectedTool === 'pass';
                const isDribble = selectedTool === 'dribble';
                const isCut = selectedTool === 'cut';
                const isScreen = selectedTool === 'screen';
                const isShot = selectedTool === 'shot';

                let previewD = '';
                if (isDribble) {
                  previewD = generateZigzagPathData(currentPoints);
                } else if (lineStyle === 'straight') {
                  previewD = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
                } else {
                  previewD = `M ${currentPoints.map((pt) => `${pt.x} ${pt.y}`).join(' L ')}`;
                }

                const arrowPoints =
                  isPass || isDribble || isCut || isShot
                    ? getArrowHeadPoints(currentPoints[currentPoints.length - 2] || p1, p2, 2.8)
                    : '';

                const screenBar = isScreen
                  ? getScreenBarCoords(currentPoints[currentPoints.length - 2] || p1, p2, 3.8)
                  : null;

                return (
                  <g>
                    <path
                      d={previewD}
                      fill="none"
                      stroke={color}
                      strokeWidth={isShot ? '1.4' : '1.2'}
                      strokeDasharray={isPass ? '1.8 1.8' : isShot ? '1.2 1.2' : 'none'}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {(isPass || isDribble || isCut || isShot) && arrowPoints && (
                      <polygon points={arrowPoints} fill={color} />
                    )}
                    {isScreen && screenBar && (
                      <line
                        x1={screenBar.b1.x}
                        y1={screenBar.b1.y}
                        x2={screenBar.b2.x}
                        y2={screenBar.b2.y}
                        stroke={color}
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    )}
                  </g>
                );
              })()}
            </svg>

            {/* Draggable & Animated Player / Ball Tokens */}
            {(isPlaying ? (frames[activeAnimFrameIdx]?.tokens || tokens) : tokens).map((token) => {
              const animPos = tokenAnimatedPositions ? tokenAnimatedPositions[token.id] : null;
              const currentX = animPos ? animPos.x : token.x;
              const currentY = animPos ? animPos.y : token.y;

              return (
                <div
                  key={token.id}
                  onMouseDown={(e) => {
                    if (isPlaying) return;
                    if (selectedTool === 'select' && activePlacementMode === 'none') {
                      e.stopPropagation();
                      setActiveTokenId(token.id);
                    }
                  }}
                  onTouchStart={(e) => {
                    if (isPlaying) return;
                    if (selectedTool === 'select' && activePlacementMode === 'none') {
                      e.stopPropagation();
                      setActiveTokenId(token.id);
                    }
                  }}
                  style={{
                    left: `${currentX}%`,
                    top: `${currentY}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className={`absolute w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-xs shadow-lg transition-transform ${
                    isPlaying ? 'cursor-default transition-all duration-75' : 'cursor-grab active:cursor-grabbing'
                  } ${activeTokenId === token.id ? 'scale-125 z-30 ring-2 ring-white' : 'z-20'}`}
                >
                  {token.type === 'playerA' && (
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center border-2 border-white font-bold text-xs shadow-md">
                      {token.label}
                    </div>
                  )}
                  {token.type === 'playerB' && (
                    <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center border-2 border-white font-bold text-xs shadow-md">
                      {token.label}
                    </div>
                  )}
                  {token.type === 'ball' && (
                    <div className="text-xl filter drop-shadow">🏀</div>
                  )}
                  {token.type === 'cone' && (
                    <div className="text-xl filter drop-shadow">▲</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* PLAY CONTROL BAR & TIMELINE SLIDER */}
          <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 shadow-xl space-y-3">
            <div className="flex items-center gap-3">
              {/* Play / Pause Primary Button */}
              <button
                onClick={handleTogglePlay}
                className={`px-5 py-2.5 rounded-xl font-extrabold text-sm flex items-center gap-2 shadow-lg transition-all transform active:scale-95 ${
                  isPlaying
                    ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/20'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-emerald-500/20'
                }`}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-slate-950" />
                    <span>Pausar</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-slate-950" />
                    <span>{progress > 0 && progress < 1 ? 'Continuar' : 'Reproducir Movimientos'}</span>
                  </>
                )}
              </button>

              {/* Reset Button */}
              <button
                onClick={handleResetPositions}
                title="Volver al inicio"
                className="px-3 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <SkipBack className="w-4 h-4" />
                <span className="hidden sm:inline">Reiniciar</span>
              </button>

              {/* Timeline Progress Bar */}
              <div className="flex-1 flex items-center gap-2 px-2">
                <span className="text-[11px] font-mono text-slate-400 w-8 text-right">
                  {Math.round(progress * 100)}%
                </span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={progress}
                  onChange={(e) => {
                    setIsPlaying(false);
                    setProgress(parseFloat(e.target.value));
                  }}
                  className="w-full accent-blue-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            <p className="text-center text-xs text-slate-400 font-medium pt-1">
              {paths.length > 0
                ? `Hay ${paths.length} trazos tácticos guardados. Pulsa Play para ver la simulación.`
                : 'Punta en la cancha para colocar jugadores (1-15), traza pases/tiros y presiona Play.'}
            </p>
          </div>
        </div>
      </div>

      {/* Modal Guardar Táctica de Equipo */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                  <Save className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Guardar Táctica de Equipo</h3>
                  <p className="text-xs text-slate-400">Archiva esta jugada para consulta y entrenamientos</p>
                </div>
              </div>
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmSavePlay} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Nombre de la Táctica *
                </label>
                <input
                  type="text"
                  required
                  value={tacticName}
                  onChange={(e) => setTacticName(e.target.value)}
                  placeholder="Ej: Bloqueo Directo y Pase 3P"
                  className="w-full bg-slate-950 text-white border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    Fecha de Guardado *
                  </label>
                  <input
                    type="date"
                    required
                    value={tacticDate}
                    onChange={(e) => setTacticDate(e.target.value)}
                    className="w-full bg-slate-950 text-white border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-amber-400" />
                    Categoría
                  </label>
                  <select
                    value={tacticCategory}
                    onChange={(e) => setTacticCategory(e.target.value)}
                    className="w-full bg-slate-950 text-white border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Ataque">Ataque</option>
                    <option value="Defensa">Defensa</option>
                    <option value="Transición">Transición</option>
                    <option value="Saque de Banda/Fondo">Saque de Banda/Fondo</option>
                    <option value="Especial">Especial / Fin Pos.</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  Notas o Instrucciones para el Entrenador (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={tacticNotes}
                  onChange={(e) => setTacticNotes(e.target.value)}
                  placeholder="Ej: El base lee el bloqueo directo, si salta el 5 pasa al tirador en la esquina."
                  className="w-full bg-slate-950 text-white border border-slate-700 rounded-xl p-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar en Tácticas de Equipo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Explorador de Tácticas Guardadas (3 Tarjetas: Ataque, Defensa, Especiales) */}
      {isViewTacticsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-6xl w-full max-h-[90vh] flex flex-col shadow-2xl space-y-5 text-white">
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <FolderOpen className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
                    <span>Biblioteca de Tácticas Guardadas</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-amber-300 font-extrabold text-xs">
                      {savedPlays.length} tácticas
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Organizadas por categoría táctica para consulta y carga rápida en la pizarra
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {/* Search Bar */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o fecha..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-950 text-white placeholder-slate-400 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  onClick={() => setIsViewTacticsModalOpen(false)}
                  className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 3 Cards Container (Ataque, Defensa, Jugadas Especiales) */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-5 pr-1">
              {/* Tarjeta 1: Ataque */}
              <div className="bg-slate-950/80 rounded-2xl border border-red-500/30 p-4 flex flex-col space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center">
                      <Flame className="w-4 h-4" />
                    </div>
                    <h4 className="font-extrabold text-sm text-white">Tácticas de Ataque</h4>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-red-950/80 border border-red-800/80 text-red-300 font-bold text-xs">
                    {offensePlays.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[50vh] pr-1 scrollbar-thin">
                  {offensePlays.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-xs italic bg-slate-900/50 rounded-xl border border-slate-800">
                      No hay tácticas de ataque guardadas.
                    </div>
                  ) : (
                    offensePlays.map((play) => renderPlayCard(play))
                  )}
                </div>
              </div>

              {/* Tarjeta 2: Defensa */}
              <div className="bg-slate-950/80 rounded-2xl border border-blue-500/30 p-4 flex flex-col space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                      <Shield className="w-4 h-4" />
                    </div>
                    <h4 className="font-extrabold text-sm text-white">Tácticas de Defensa</h4>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-blue-950/80 border border-blue-800/80 text-blue-300 font-bold text-xs">
                    {defensePlays.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[50vh] pr-1 scrollbar-thin">
                  {defensePlays.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-xs italic bg-slate-900/50 rounded-xl border border-slate-800">
                      No hay tácticas de defensa guardadas.
                    </div>
                  ) : (
                    defensePlays.map((play) => renderPlayCard(play))
                  )}
                </div>
              </div>

              {/* Tarjeta 3: Jugadas Especiales */}
              <div className="bg-slate-950/80 rounded-2xl border border-amber-500/30 p-4 flex flex-col space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                      <Zap className="w-4 h-4" />
                    </div>
                    <h4 className="font-extrabold text-sm text-white">Jugadas Especiales</h4>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-800/80 text-amber-300 font-bold text-xs">
                    {specialPlays.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[50vh] pr-1 scrollbar-thin">
                  {specialPlays.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-xs italic bg-slate-900/50 rounded-xl border border-slate-800">
                      No hay jugadas especiales guardadas.
                    </div>
                  ) : (
                    specialPlays.map((play) => renderPlayCard(play))
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-3 text-xs text-slate-400">
              <p>Selecciona cualquier táctica y pulsa <strong className="text-blue-400">Cargar en Pizarra</strong> para visualizarla y reproducirla.</p>
              <button
                onClick={() => setIsViewTacticsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

