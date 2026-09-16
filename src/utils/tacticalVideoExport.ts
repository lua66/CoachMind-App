import { Point, TacticalPath, TacticalToken, PlayFrame, DrawTool } from '../types';

// Helper: Calculate position along a multi-point path given progress (0 to 1)
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

// Helper: Calculate animated positions of tokens for a given frame and progress
function calculateAnimatedPositions(
  frame: PlayFrame,
  localProgress: number
): Record<string, Point> {
  const frameTokens = frame.tokens || [];
  const framePaths = frame.paths || [];
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
      carrierMovePath =
        framePaths.find((path) => {
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
    if (carrierMoveEnd) {
      passOrShotPath =
        framePaths.find((path) => {
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

    if (!passOrShotPath) {
      passOrShotPath =
        framePaths.find((path) => {
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
    if (token.type === 'ball') return;

    let closestPath: TacticalPath | null = null;
    let minDistance = Infinity;

    framePaths.forEach((p) => {
      if (p.tool === 'pass' || p.tool === 'shot') return;
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
      positions[ballToken.id] = getPointAlongPath(passOrShotPath.points, frameP);
    } else if (ballCarrierId) {
      const carrierAnimPos =
        positions[ballCarrierId] || frameTokens.find((t) => t.id === ballCarrierId);
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
}

// Tool Color Helper
function getToolColor(tool: DrawTool): string {
  switch (tool) {
    case 'pass':
      return '#38BDF8'; // Cyan / Blue dashed
    case 'dribble':
      return '#F59E0B'; // Amber / Orange wavy
    case 'screen':
      return '#F43F5E'; // Rose / Red block
    case 'cut':
      return '#10B981'; // Emerald solid
    case 'shot':
      return '#C084FC'; // Fucsia / Purple shot
    default:
      return '#3B82F6';
  }
}

// Draw FIBA Court on HTML5 Canvas
function drawFibaCourt(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  courtType: 'half' | 'full'
) {
  // Background gradient: Modern dark tactical slate board
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, '#0F172A');
  bgGradient.addColorStop(1, '#1E293B');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // Subtle court wood/texture floor glow
  ctx.save();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.5;

  const toX = (pX: number) => (pX / 100) * width;
  const toY = (pY: number) => (pY / 100) * height;

  // Outer boundary line
  ctx.beginPath();
  ctx.rect(toX(2), toY(3), toX(96), toY(94));
  ctx.strokeStyle = '#64748B';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Full Court Center Line & Center Circle
  if (courtType === 'full') {
    ctx.beginPath();
    ctx.moveTo(toX(50), toY(3));
    ctx.lineTo(toX(50), toY(97));
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(toX(50), toY(50), toX(8), toY(12), 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Left Basket Paint / Key
  ctx.beginPath();
  ctx.rect(toX(2), toY(30), toX(19), toY(40));
  ctx.strokeStyle = '#64748B';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Free throw semi-circle solid
  ctx.beginPath();
  ctx.arc(toX(21), toY(50), toY(20), -Math.PI / 2, Math.PI / 2, false);
  ctx.stroke();

  // Free throw semi-circle dashed
  ctx.save();
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.arc(toX(21), toY(50), toY(20), Math.PI / 2, (3 * Math.PI) / 2, false);
  ctx.stroke();
  ctx.restore();

  // Left 3-Point Line (Arc + Straight Corner lines)
  ctx.beginPath();
  ctx.moveTo(toX(2), toY(13));
  ctx.lineTo(toX(12), toY(13));
  ctx.bezierCurveTo(toX(36), toY(13), toX(36), toY(87), toX(12), toY(87));
  ctx.lineTo(toX(2), toY(87));
  ctx.stroke();

  // Left Backboard (white) and Rim (Orange)
  ctx.beginPath();
  ctx.moveTo(toX(4), toY(43));
  ctx.lineTo(toX(4), toY(57));
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(toX(5.5), toY(50), toX(2.2), 0, Math.PI * 2);
  ctx.strokeStyle = '#F97316';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Right Side (if full court)
  if (courtType === 'full') {
    ctx.beginPath();
    ctx.rect(toX(79), toY(30), toX(19), toY(40));
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(toX(79), toY(50), toY(20), Math.PI / 2, (3 * Math.PI) / 2, false);
    ctx.stroke();

    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(toX(79), toY(50), toY(20), -Math.PI / 2, Math.PI / 2, false);
    ctx.stroke();
    ctx.restore();

    ctx.beginPath();
    ctx.moveTo(toX(98), toY(13));
    ctx.lineTo(toX(88), toY(13));
    ctx.bezierCurveTo(toX(64), toY(13), toX(64), toY(87), toX(88), toY(87));
    ctx.lineTo(toX(98), toY(87));
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toX(96), toY(43));
    ctx.lineTo(toX(96), toY(57));
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(toX(94.5), toY(50), toX(2.2), 0, Math.PI * 2);
    ctx.strokeStyle = '#F97316';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  ctx.restore();
}

// Draw Tactical Paths on Canvas
function drawTacticalPaths(
  ctx: CanvasRenderingContext2D,
  paths: TacticalPath[],
  width: number,
  height: number
) {
  const toX = (pX: number) => (pX / 100) * width;
  const toY = (pY: number) => (pY / 100) * height;

  paths.forEach((p) => {
    if (!p.points || p.points.length < 2) return;

    const color = getToolColor(p.tool);
    const firstPt = p.points[0];
    const lastPt = p.points[p.points.length - 1];

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = p.tool === 'shot' ? 4 : 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Shadow glow for premium tactical look
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;

    if (p.tool === 'pass') {
      // Dashed line
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      if (p.style === 'straight') {
        ctx.moveTo(toX(firstPt.x), toY(firstPt.y));
        ctx.lineTo(toX(lastPt.x), toY(lastPt.y));
      } else {
        ctx.moveTo(toX(firstPt.x), toY(firstPt.y));
        p.points.forEach((pt) => ctx.lineTo(toX(pt.x), toY(pt.y)));
      }
      ctx.stroke();
    } else if (p.tool === 'dribble') {
      // Zigzag / Wavy
      ctx.beginPath();
      const dx = lastPt.x - firstPt.x;
      const dy = lastPt.y - firstPt.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const numSteps = Math.max(3, Math.floor(len / 3.2));
      const nx = -dy / (len || 1);
      const ny = dx / (len || 1);

      ctx.moveTo(toX(firstPt.x), toY(firstPt.y));
      for (let i = 1; i < numSteps; i++) {
        const t = i / numSteps;
        const basePt = { x: firstPt.x + dx * t, y: firstPt.y + dy * t };
        const side = i % 2 === 1 ? 1 : -1;
        const zx = basePt.x + nx * 1.5 * side;
        const zy = basePt.y + ny * 1.5 * side;
        ctx.lineTo(toX(zx), toY(zy));
      }
      ctx.lineTo(toX(lastPt.x), toY(lastPt.y));
      ctx.stroke();
    } else if (p.tool === 'screen') {
      // Screen line
      ctx.beginPath();
      if (p.style === 'straight') {
        ctx.moveTo(toX(firstPt.x), toY(firstPt.y));
        ctx.lineTo(toX(lastPt.x), toY(lastPt.y));
      } else {
        ctx.moveTo(toX(firstPt.x), toY(firstPt.y));
        p.points.forEach((pt) => ctx.lineTo(toX(pt.x), toY(pt.y)));
      }
      ctx.stroke();

      // Screen T-bar at the end
      const prevPt = p.points[p.points.length - 2] || firstPt;
      const tDx = lastPt.x - prevPt.x;
      const tDy = lastPt.y - prevPt.y;
      const angle = Math.atan2(tDy, tDx);
      const barLen = toX(3.5);

      const b1X = toX(lastPt.x) + (barLen / 2) * Math.cos(angle + Math.PI / 2);
      const b1Y = toY(lastPt.y) + (barLen / 2) * Math.sin(angle + Math.PI / 2);
      const b2X = toX(lastPt.x) + (barLen / 2) * Math.cos(angle - Math.PI / 2);
      const b2Y = toY(lastPt.y) + (barLen / 2) * Math.sin(angle - Math.PI / 2);

      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(b1X, b1Y);
      ctx.lineTo(b2X, b2Y);
      ctx.stroke();
    } else {
      // Regular solid line (cut or shot)
      ctx.beginPath();
      if (p.style === 'straight') {
        ctx.moveTo(toX(firstPt.x), toY(firstPt.y));
        ctx.lineTo(toX(lastPt.x), toY(lastPt.y));
      } else {
        ctx.moveTo(toX(firstPt.x), toY(firstPt.y));
        p.points.forEach((pt) => ctx.lineTo(toX(pt.x), toY(pt.y)));
      }
      ctx.stroke();
    }

    // Arrowhead for pass, dribble, cut, shot
    if (p.tool !== 'screen') {
      const prevPt = p.points[p.points.length - 2] || firstPt;
      const aDx = toX(lastPt.x) - toX(prevPt.x);
      const aDy = toY(lastPt.y) - toY(prevPt.y);
      const angle = Math.atan2(aDy, aDx);
      const arrowSize = toX(2.2);

      const a1X = toX(lastPt.x) + arrowSize * Math.cos(angle + Math.PI - 0.45);
      const a1Y = toY(lastPt.y) + arrowSize * Math.sin(angle + Math.PI - 0.45);
      const a2X = toX(lastPt.x) + arrowSize * Math.cos(angle + Math.PI + 0.45);
      const a2Y = toY(lastPt.y) + arrowSize * Math.sin(angle + Math.PI + 0.45);

      ctx.beginPath();
      ctx.moveTo(toX(lastPt.x), toY(lastPt.y));
      ctx.lineTo(a1X, a1Y);
      ctx.lineTo(a2X, a2Y);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  });
}

// Draw Animated Tokens (Players, Ball, Cones) on Canvas
function drawTokens(
  ctx: CanvasRenderingContext2D,
  tokens: TacticalToken[],
  positions: Record<string, Point>,
  width: number,
  height: number
) {
  const toX = (pX: number) => (pX / 100) * width;
  const toY = (pY: number) => (pY / 100) * height;

  tokens.forEach((token) => {
    const pos = positions[token.id] || { x: token.x, y: token.y };
    const x = toX(pos.x);
    const y = toY(pos.y);
    const radius = Math.min(width, height) * 0.026;

    ctx.save();

    if (token.type === 'playerA') {
      // Offense Player A (Electric Blue Circle)
      ctx.shadowColor = 'rgba(37, 99, 235, 0.6)';
      ctx.shadowBlur = 10;

      const grad = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, radius * 0.2, x, y, radius);
      grad.addColorStop(0, '#60A5FA');
      grad.addColorStop(1, '#2563EB');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Number / Label
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${Math.round(radius * 1.15)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(token.label || '1', x, y + 1);
    } else if (token.type === 'playerB') {
      // Defense Player B / Opponent (Crimson Red Circle)
      ctx.shadowColor = 'rgba(225, 29, 72, 0.6)';
      ctx.shadowBlur = 10;

      const grad = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, radius * 0.2, x, y, radius);
      grad.addColorStop(0, '#FB7185');
      grad.addColorStop(1, '#E11D48');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${Math.round(radius * 1.15)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(token.label || 'X', x, y + 1);
    } else if (token.type === 'ball') {
      // Basketball (Orange Textured Sphere)
      const ballRadius = radius * 0.85;
      ctx.shadowColor = 'rgba(249, 115, 22, 0.8)';
      ctx.shadowBlur = 12;

      const grad = ctx.createRadialGradient(
        x - ballRadius * 0.3,
        y - ballRadius * 0.3,
        ballRadius * 0.2,
        x,
        y,
        ballRadius
      );
      grad.addColorStop(0, '#FDBA74');
      grad.addColorStop(1, '#EA580C');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Basketball cross lines
      ctx.beginPath();
      ctx.moveTo(x - ballRadius, y);
      ctx.lineTo(x + ballRadius, y);
      ctx.moveTo(x, y - ballRadius);
      ctx.lineTo(x, y + ballRadius);
      ctx.stroke();
    } else if (token.type === 'cone') {
      // Training Cone (Orange Triangle)
      const coneSize = radius * 1.2;
      ctx.shadowColor = 'rgba(245, 158, 11, 0.6)';
      ctx.shadowBlur = 8;

      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.moveTo(x, y - coneSize * 0.7);
      ctx.lineTo(x + coneSize * 0.6, y + coneSize * 0.6);
      ctx.lineTo(x - coneSize * 0.6, y + coneSize * 0.6);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.restore();
  });
}

// Draw Top Header & Watermark Overlay
function drawOverlayInfo(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  playTitle: string,
  category: string,
  frameTitle: string,
  frameIndex: number,
  totalFrames: number,
  globalProgress: number
) {
  ctx.save();

  // Top Title Banner Bar (Semi-transparent dark glass)
  const barHeight = 44;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.fillRect(0, 0, width, barHeight);

  // Border bottom of header
  ctx.strokeStyle = 'rgba(51, 65, 85, 0.8)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, barHeight);
  ctx.lineTo(width, barHeight);
  ctx.stroke();

  // Left Title + Category Badge
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`🏀 ${playTitle}`, 16, barHeight / 2);

  if (category) {
    const titleWidth = ctx.measureText(`🏀 ${playTitle}`).width;
    const badgeX = 24 + titleWidth;
    ctx.fillStyle = '#3B82F6';
    ctx.beginPath();
    ctx.roundRect(badgeX, 10, 80, 24, 6);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(category.toUpperCase(), badgeX + 40, barHeight / 2);
  }

  // Right Side: Phase info & Brand
  ctx.textAlign = 'right';
  if (totalFrames > 1) {
    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`Fase ${frameIndex + 1}/${totalFrames}: ${frameTitle}`, width - 16, barHeight / 2);
  } else {
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('COACHMIND BASKETBALL', width - 16, barHeight / 2);
  }

  // Bottom Video Progress Bar (Thin modern amber/cyan timeline)
  const progressHeight = 4;
  ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
  ctx.fillRect(0, height - progressHeight, width, progressHeight);

  const fillWidth = Math.max(0, Math.min(width, width * globalProgress));
  const pGrad = ctx.createLinearGradient(0, 0, width, 0);
  pGrad.addColorStop(0, '#38BDF8');
  pGrad.addColorStop(1, '#F59E0B');
  ctx.fillStyle = pGrad;
  ctx.fillRect(0, height - progressHeight, fillWidth, progressHeight);

  ctx.restore();
}

export interface VideoExportOptions {
  width?: number;
  height?: number;
  fps?: number;
  durationPerFrame?: number; // seconds per tactical frame
  onProgress?: (percent: number, statusMessage: string) => void;
}

/**
 * Exports a tactical play (or set of animated frames) as an MP4/WebM video file.
 */
export async function exportTacticalPlayToVideo(
  playTitle: string,
  category: string,
  courtType: 'half' | 'full',
  frames: PlayFrame[],
  options: VideoExportOptions = {}
): Promise<{ blob: Blob; url: string; filename: string }> {
  if (!frames || frames.length === 0) {
    throw new Error('No hay fotogramas o jugadas para exportar a video.');
  }

  const width = options.width || 1280;
  const height = options.height || 800;
  const fps = options.fps || 30;
  const durationPerFrame = options.durationPerFrame || 3.5;
  const onProgress = options.onProgress || (() => {});

  // Create virtual canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('No se pudo inicializar el motor de renderizado Canvas 2D.');
  }

  // Determine best supported video MIME type
  const mimeTypes = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm;codecs=h264',
    'video/webm',
  ];

  let selectedMimeType = '';
  for (const mime of mimeTypes) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime)) {
      selectedMimeType = mime;
      break;
    }
  }

  if (!selectedMimeType) {
    selectedMimeType = 'video/webm';
  }

  onProgress(5, 'Inicializando codificador de video MP4...');

  // Setup MediaRecorder Stream
  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, {
    mimeType: selectedMimeType,
    videoBitsPerSecond: 4500000, // 4.5 Mbps high definition
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  const recordingPromise = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      const isMp4 = selectedMimeType.includes('mp4');
      const finalBlob = new Blob(chunks, { type: isMp4 ? 'video/mp4' : 'video/webm' });
      resolve(finalBlob);
    };
    recorder.onerror = (e) => reject(e);
  });

  recorder.start();

  // Animation timeline configuration
  const totalPlayFrames = frames.length;
  const totalAnimationDuration = totalPlayFrames * durationPerFrame; // seconds
  const endHoldDuration = 1.0; // 1 second hold at the end
  const totalDuration = totalAnimationDuration + endHoldDuration;
  const totalFramesCount = Math.round(totalDuration * fps);

  // Render loop frame by frame
  for (let frameIdx = 0; frameIdx < totalFramesCount; frameIdx++) {
    const currentTime = frameIdx / fps;
    const progress = Math.min(1, currentTime / totalAnimationDuration);

    // Current active frame index and local progress
    const scaledP = progress * totalPlayFrames;
    const activeFrameIdx = Math.min(totalPlayFrames - 1, Math.floor(scaledP));
    const localP = progress >= 1 ? 1 : scaledP - activeFrameIdx;

    const currentFrame = frames[activeFrameIdx] || frames[0];
    const animatedPositions = calculateAnimatedPositions(currentFrame, localP);

    // 1. Draw Court
    drawFibaCourt(ctx, width, height, courtType);

    // 2. Draw Tactical Paths
    drawTacticalPaths(ctx, currentFrame.paths || [], width, height);

    // 3. Draw Players, Ball & Cones
    drawTokens(ctx, currentFrame.tokens || [], animatedPositions, width, height);

    // 4. Draw Header, Watermark and Timeline Progress
    drawOverlayInfo(
      ctx,
      width,
      height,
      playTitle || 'Táctica Pizarra',
      category || 'Ataque',
      currentFrame.title || `Fase ${activeFrameIdx + 1}`,
      activeFrameIdx,
      totalPlayFrames,
      progress
    );

    // Update progress callback
    const pct = Math.round(((frameIdx + 1) / totalFramesCount) * 85) + 5;
    if (frameIdx % 5 === 0 || frameIdx === totalFramesCount - 1) {
      onProgress(
        pct,
        `Procesando fotograma ${frameIdx + 1} de ${totalFramesCount} (${Math.round((currentTime / totalDuration) * 100)}%)...`
      );
    }

    // Wait for the exact frame step
    await new Promise((r) => setTimeout(r, 1000 / fps));
  }

  onProgress(95, 'Finalizando y empaquetando archivo MP4...');
  recorder.stop();

  const blob = await recordingPromise;
  const url = URL.createObjectURL(blob);
  const cleanName = (playTitle || 'Tactica_Pizarra')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  const filename = `${cleanName}_video.mp4`;

  onProgress(100, '¡Video MP4 listo para descargar!');

  return { blob, url, filename };
}

/**
 * Triggers an immediate browser download for the exported tactical video.
 */
export async function downloadTacticalPlayVideo(
  playTitle: string,
  category: string,
  courtType: 'half' | 'full',
  frames: PlayFrame[],
  options: VideoExportOptions = {}
): Promise<string> {
  const { url, filename } = await exportTacticalPlayToVideo(
    playTitle,
    category,
    courtType,
    frames,
    options
  );

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Return the filename downloaded
  return filename;
}
