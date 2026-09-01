import jsPDF from 'jspdf';
import { SavedTraining, DrillItem, TrainingReviewReport, TacticalDiagramElement } from '../types';

/**
 * Creates a clean, self-contained SVG string representing the basketball court and all tactical elements.
 */
function createDrillSvgString(drill: DrillItem): string {
  const courtType = drill.courtType || 'half';
  const elements = drill.diagramElements || [];

  // Check if diagramDataUrl is already an SVG data URL with real tokens
  if (drill.diagramDataUrl && drill.diagramDataUrl.startsWith('data:image/svg+xml')) {
    try {
      const decoded = decodeURIComponent(drill.diagramDataUrl.split(',')[1]);
      if (decoded && decoded.includes('<svg') && decoded.includes('</svg>')) {
        return decoded;
      }
    } catch {
      // fallback to generated SVG
    }
  }

  let linesSvg = '';
  let tokensSvg = '';

  elements.forEach((el) => {
    if (el.type === 'line' && el.points && el.points.length >= 2) {
      const p1 = el.points[0];
      const p2 = el.points[1];
      const color = el.color || '#ffffff';

      if (el.lineStyle === 'screen') {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const angle = Math.atan2(dy, dx);
        const half = 2.25;
        const b1x = p2.x + half * Math.cos(angle + Math.PI / 2);
        const b1y = p2.y + half * Math.sin(angle + Math.PI / 2);
        const b2x = p2.x + half * Math.cos(angle - Math.PI / 2);
        const b2y = p2.y + half * Math.sin(angle - Math.PI / 2);

        linesSvg += `
          <line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${color}" stroke-width="1.6" />
          <line x1="${b1x}" y1="${b1y}" x2="${b2x}" y2="${b2y}" stroke="${color}" stroke-width="2.6" />
        `;
      } else if (el.lineStyle === 'dribble') {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const numSteps = Math.max(3, Math.floor(len / 3.5));
        const nx = -dy / (len || 1);
        const ny = dx / (len || 1);
        let pathD = `M ${p1.x} ${p1.y}`;
        for (let i = 1; i < numSteps; i++) {
          const t = i / numSteps;
          const side = i % 2 === 1 ? 1 : -1;
          pathD += ` L ${p1.x + dx * t + nx * 1.5 * side} ${p1.y + dy * t + ny * 1.5 * side}`;
        }
        pathD += ` L ${p2.x} ${p2.y}`;

        const angle = Math.atan2(dy, dx);
        const a1x = p2.x + 3.2 * Math.cos(angle + Math.PI - 0.45);
        const a1y = p2.y + 3.2 * Math.sin(angle + Math.PI - 0.45);
        const a2x = p2.x + 3.2 * Math.cos(angle + Math.PI + 0.45);
        const a2y = p2.y + 3.2 * Math.sin(angle + Math.PI + 0.45);

        linesSvg += `
          <path d="${pathD}" fill="none" stroke="${color}" stroke-width="1.6" />
          <polygon points="${p2.x},${p2.y} ${a1x},${a1y} ${a2x},${a2y}" fill="${color}" />
        `;
      } else {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const angle = Math.atan2(dy, dx);
        const a1x = p2.x + 3.2 * Math.cos(angle + Math.PI - 0.45);
        const a1y = p2.y + 3.2 * Math.sin(angle + Math.PI - 0.45);
        const a2x = p2.x + 3.2 * Math.cos(angle + Math.PI + 0.45);
        const a2y = p2.y + 3.2 * Math.sin(angle + Math.PI + 0.45);

        const isDashed = el.lineStyle === 'pass';
        const isDotted = el.lineStyle === 'shot';
        const dashAttr = isDashed ? 'stroke-dasharray="2.5,1.5"' : isDotted ? 'stroke-dasharray="1,1.2"' : '';

        linesSvg += `
          <line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${color}" stroke-width="1.6" ${dashAttr} />
          <polygon points="${p2.x},${p2.y} ${a1x},${a1y} ${a2x},${a2y}" fill="${color}" />
        `;
      }
    } else if (el.type === 'player_offense') {
      tokensSvg += `
        <g transform="translate(${el.x}, ${el.y})">
          <circle r="3.4" fill="#ea580c" stroke="#ffffff" stroke-width="0.6" />
          <text text-anchor="middle" dominant-baseline="central" fill="#ffffff" font-size="3.4" font-weight="bold" font-family="system-ui, sans-serif">${el.number || '1'}</text>
        </g>
      `;
    } else if (el.type === 'player_defense') {
      tokensSvg += `
        <g transform="translate(${el.x}, ${el.y})">
          <circle r="3.4" fill="#2563eb" stroke="#ffffff" stroke-width="0.6" />
          <text text-anchor="middle" dominant-baseline="central" fill="#ffffff" font-size="3.4" font-weight="bold" font-family="system-ui, sans-serif">${el.number || 'X'}</text>
        </g>
      `;
    } else if (el.type === 'ball') {
      tokensSvg += `
        <g transform="translate(${el.x}, ${el.y})">
          <circle r="2.6" fill="#f97316" stroke="#000000" stroke-width="0.4" />
          <line x1="-2.4" y1="0" x2="2.4" y2="0" stroke="#000000" stroke-width="0.3" />
          <path d="M -1.8 -1.8 A 2.4 2.4 0 0 1 1.8 1.8" stroke="#000000" stroke-width="0.3" fill="none" />
        </g>
      `;
    } else if (el.type === 'cone') {
      tokensSvg += `
        <g transform="translate(${el.x}, ${el.y})">
          <polygon points="0,-2.8 2.6,2.4 -2.6,2.4" fill="#eab308" stroke="#713f12" stroke-width="0.4" />
          <line x1="-1.8" y1="0.6" x2="1.8" y2="0.6" stroke="#ffffff" stroke-width="0.4" />
        </g>
      `;
    } else if (el.type === 'text') {
      const label = el.label || 'Nota';
      tokensSvg += `
        <g transform="translate(${el.x}, ${el.y})">
          <rect x="-10" y="-3.5" width="20" height="7" rx="1.5" fill="rgba(15,23,42,0.9)" stroke="#475569" stroke-width="0.5" />
          <text text-anchor="middle" dominant-baseline="central" fill="#ffffff" font-size="2.4" font-weight="bold" font-family="system-ui, sans-serif">${label}</text>
        </g>
      `;
    }
  });

  const courtSvg =
    courtType === 'half'
      ? `
    <g stroke="rgba(255,255,255,0.75)" stroke-width="0.65" fill="none">
      <rect x="4" y="4" width="92" height="92" rx="1" />
      <rect x="36" y="4" width="28" height="38" fill="rgba(255,255,255,0.03)" />
      <circle cx="50" cy="42" r="11" />
      <line x1="39" y1="42" x2="61" y2="42" stroke-dasharray="1.2,1.2" />
      <path d="M 12 4 L 12 18 A 38 38 0 0 0 88 18 L 88 4" />
      <path d="M 44 14 A 6 6 0 0 0 56 14" />
      <line x1="42" y1="9" x2="58" y2="9" stroke-width="1.2" stroke="white" />
      <line x1="50" y1="9" x2="50" y2="12" stroke-width="0.8" stroke="white" />
      <circle cx="50" cy="13" r="2.2" stroke="#ea580c" stroke-width="1" fill="none" />
      <path d="M 39 96 A 11 11 0 0 1 61 96" />
    </g>
  `
      : `
    <g stroke="rgba(255,255,255,0.75)" stroke-width="0.65" fill="none">
      <rect x="4" y="4" width="92" height="92" rx="1" />
      <line x1="4" y1="50" x2="96" y2="50" stroke-width="0.8" />
      <circle cx="50" cy="50" r="9" />
      <rect x="37" y="4" width="26" height="22" fill="rgba(255,255,255,0.03)" />
      <circle cx="50" cy="26" r="8" />
      <path d="M 14 4 L 14 12 A 36 36 0 0 0 86 12 L 86 4" />
      <line x1="43" y1="8" x2="57" y2="8" stroke-width="1" stroke="white" />
      <circle cx="50" cy="11" r="2" stroke="#ea580c" stroke-width="0.9" fill="none" />
      <rect x="37" y="74" width="26" height="22" fill="rgba(255,255,255,0.03)" />
      <circle cx="50" cy="74" r="8" />
      <path d="M 14 96 L 14 88 A 36 36 0 0 1 86 88 L 86 96" />
      <line x1="43" y1="92" x2="57" y2="92" stroke-width="1" stroke="white" />
      <circle cx="50" cy="89" r="2" stroke="#ea580c" stroke-width="0.9" fill="none" />
    </g>
  `;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="800" height="500">
    <rect width="100" height="100" fill="#0d281e" />
    ${courtSvg}
    ${linesSvg}
    ${tokensSvg}
  </svg>`;
}

/**
 * Converts a DrillItem's diagram into a high-resolution PNG Data URL.
 */
export const renderDrillDiagramToPng = async (drill: DrillItem): Promise<string> => {
  if (drill.diagramDataUrl && drill.diagramDataUrl.startsWith('data:image/png;base64,')) {
    return drill.diagramDataUrl;
  }

  const svgString = createDrillSvgString(drill);
  const svgDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const fallbackCanvas = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 500;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0d281e';
        ctx.fillRect(0, 0, 800, 500);
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 4;
        ctx.strokeRect(32, 20, 736, 460);
      }
      resolve(canvas.toDataURL('image/png'));
    };

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 500;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          fallbackCanvas();
          return;
        }
        ctx.drawImage(img, 0, 0, 800, 500);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        fallbackCanvas();
      }
    };

    img.onerror = () => {
      fallbackCanvas();
    };

    img.src = svgDataUrl;
  });
};

/**
 * Native, bulletproof PDF Generator for Full Training Sessions using jsPDF.
 * Embeds high-resolution tactical boards for every drill.
 */
export const exportTrainingSessionToPdf = async (training: SavedTraining): Promise<boolean> => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    const checkPageBreak = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - margin - 12) {
        doc.addPage();
        y = margin;
        drawPageHeader();
      }
    };

    const drawPageHeader = () => {
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(margin, y, contentWidth, 12, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('COACHMIND - SESIÓN DE ENTRENAMIENTO DE BALONCESTO', margin + 4, y + 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(251, 146, 60); // orange-400
      const dateStr = training.createdAt || new Date().toLocaleDateString('es-ES');
      doc.text(dateStr, pageWidth - margin - 25, y + 8);

      y += 16;
    };

    // First Page Header
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(margin, y, contentWidth, 22, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('COACHMIND BALONCESTO', margin + 4, y + 8.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(203, 213, 225); // slate-300
    doc.text('Planificación Táctica Oficial y Metodología Deportiva', margin + 4, y + 15.5);

    const dateStr = training.createdAt || new Date().toLocaleDateString('es-ES');
    doc.setTextColor(251, 146, 60); // orange-400
    doc.setFont('helvetica', 'bold');
    doc.text(`Fecha: ${dateStr}`, pageWidth - margin - 35, y + 15.5);

    y += 26;

    // Session Title & Core Meta Box
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42); // slate-900
    const titleText = training.title.length > 55 ? training.title.slice(0, 52) + '...' : training.title;
    doc.text(titleText, margin + 4, y + 7.5);

    // Meta row
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105); // slate-600
    const totalTime = training.plan?.totalDuration || training.durationMinutes || 60;
    const metaLine1 = `Sección: ${training.section || 'General'}  |  Categoría: ${training.category || 'Senior'} (${training.ageRange || 'Libre'})  |  Nivel: ${training.level || 'Estándar'}`;
    doc.text(metaLine1, margin + 4, y + 14);

    const metaLine2 = `Intensidad: ${training.intensity || 'Media'}  |  Duración Total: ${totalTime} min  |  Ejercicios: ${training.exerciseCount || (training.plan?.mainDrills?.length || 0) + (training.plan?.warmup?.length || 0) + (training.plan?.cooldown?.length || 0)}`;
    doc.text(metaLine2, margin + 4, y + 19.5);

    y += 28;

    // Objective Box
    if (training.objective) {
      checkPageBreak(22);
      doc.setFillColor(255, 247, 237); // orange-50
      doc.setDrawColor(249, 115, 22); // orange-500
      doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(194, 65, 12); // orange-700
      doc.text('OBJETIVO PRINCIPAL DE LA SESIÓN:', margin + 4, y + 5.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      const splitObj = doc.splitTextToSize(training.objective, contentWidth - 8);
      doc.text(splitObj.slice(0, 2), margin + 4, y + 11);

      y += 20;
    }

    // AI Review Report Summary if attached
    if (training.plan?.reviewReport) {
      const review = training.plan.reviewReport;
      checkPageBreak(24);

      const isHigh = review.alignmentScore >= 80;
      doc.setFillColor(15, 23, 42); // slate-900
      doc.setDrawColor(30, 41, 59);
      doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(251, 191, 36); // amber-400
      doc.text('AUDITORÍA METODOLÓGICA IA', margin + 4, y + 6);

      doc.setFontSize(8);
      doc.setTextColor(isHigh ? 52 : 251, isHigh ? 211 : 191, isHigh ? 153 : 36);
      doc.text(`Coherencia: ${review.alignmentScore}%`, pageWidth - margin - 35, y + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(226, 232, 240);
      const splitSummary = doc.splitTextToSize(review.summary, contentWidth - 8);
      doc.text(splitSummary.slice(0, 2), margin + 4, y + 12);

      y += 24;
    }

    // Pre-render all drill diagrams as PNG Data URLs in parallel
    const allDrillSections: { title: string; drills: DrillItem[]; color: [number, number, number] }[] = [];
    if (training.plan?.warmup && training.plan.warmup.length > 0) {
      allDrillSections.push({ title: '1. Fase de Calentamiento / Activación', drills: training.plan.warmup, color: [234, 88, 12] });
    }
    if (training.plan?.mainDrills && training.plan.mainDrills.length > 0) {
      allDrillSections.push({ title: '2. Fase Principal / Ejercicios Tácticos', drills: training.plan.mainDrills, color: [37, 99, 235] });
    }
    if (training.plan?.cooldown && training.plan.cooldown.length > 0) {
      allDrillSections.push({ title: '3. Fase Final / Vuelta a la Calma', drills: training.plan.cooldown, color: [5, 150, 105] });
    }

    // Render drill sections with Tactical Boards
    for (const section of allDrillSections) {
      checkPageBreak(18);

      // Section Title Banner
      doc.setFillColor(...section.color);
      doc.roundedRect(margin, y, contentWidth, 7, 1.5, 1.5, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(section.title.toUpperCase(), margin + 4, y + 5);

      y += 10;

      for (let idx = 0; idx < section.drills.length; idx++) {
        const drill = section.drills[idx];
        const diagramPng = await renderDrillDiagramToPng(drill);

        // Calculate heights
        const leftWidth = 106; // text width
        const boardWidth = 66; // tactical board width in mm
        const boardHeight = 41.25; // 16:10 aspect ratio (66 * 5/8)

        const splitDesc = drill.description ? doc.splitTextToSize(drill.description, leftWidth - 6) : [];
        const hasTips = drill.coachingTips && drill.coachingTips.length > 0;
        const tipsLineCount = hasTips ? Math.min(drill.coachingTips.length, 3) : 0;
        const textContentHeight = Math.min(splitDesc.length * 3.8, 25) + (hasTips ? tipsLineCount * 3.8 + 8 : 0);

        const cardBodyHeight = Math.max(boardHeight + 6, textContentHeight + 8);
        const totalCardHeight = 10 + cardBodyHeight;

        checkPageBreak(totalCardHeight + 4);

        const cardStartY = y;

        // Card Container
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin, cardStartY, contentWidth, totalCardHeight, 2, 2, 'FD');

        // Card Header Bar
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin, cardStartY, contentWidth, 8, 2, 2, 'F');
        doc.rect(margin, cardStartY + 6, contentWidth, 2, 'F');

        // Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        const drillTitle = `${idx + 1}. ${drill.title}`;
        doc.text(drillTitle.length > 45 ? drillTitle.slice(0, 42) + '...' : drillTitle, margin + 4, cardStartY + 5.5);

        // Meta (time & players)
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        const drillMeta = `${drill.durationMinutes} min  |  ${drill.playersCount || 'Plantilla'}`;
        doc.text(drillMeta, pageWidth - margin - 35, cardStartY + 5.5);

        let curTextY = cardStartY + 12;

        // Description (Left Column)
        if (splitDesc.length > 0) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(51, 65, 85);
          doc.text(splitDesc.slice(0, 5), margin + 4, curTextY);
          curTextY += Math.min(splitDesc.length * 3.8, 18) + 2;
        }

        // Coaching Tips (Left Column)
        if (hasTips) {
          const tipsBoxH = tipsLineCount * 3.8 + 6;
          doc.setFillColor(239, 246, 255); // blue-50
          doc.setDrawColor(191, 219, 254);
          doc.roundedRect(margin + 3, curTextY, leftWidth - 6, tipsBoxH, 1.5, 1.5, 'FD');

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          doc.setTextColor(29, 78, 216); // blue-700
          doc.text('Claves de Corrección:', margin + 5, curTextY + 3.8);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(30, 41, 59);

          drill.coachingTips.slice(0, 3).forEach((tip, tIdx) => {
            const tipText = `• ${tip.length > 60 ? tip.slice(0, 57) + '...' : tip}`;
            doc.text(tipText, margin + 5, curTextY + 7.5 + tIdx * 3.6);
          });
        }

        // Tactical Board Image (Right Column)
        const boardX = margin + leftWidth + 4;
        const boardY = cardStartY + 11;

        try {
          doc.addImage(diagramPng, 'PNG', boardX, boardY, boardWidth, boardHeight);
          // Subtle frame around tactical board
          doc.setDrawColor(51, 65, 85);
          doc.setLineWidth(0.3);
          doc.roundedRect(boardX, boardY, boardWidth, boardHeight, 1, 1, 'D');
        } catch (imgErr) {
          console.warn('Could not add drill diagram image to PDF:', imgErr);
        }

        y += totalCardHeight + 4;
      }

      y += 2;
    }

    // Coach Tactical Notes
    if (training.plan?.coachNotes && training.plan.coachNotes.length > 0) {
      checkPageBreak(22);
      doc.setFillColor(241, 245, 249); // slate-100
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text('NOTAS Y RECORDATORIOS DEL ENTRENADOR', margin + 4, y + 5.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(51, 65, 85);

      training.plan.coachNotes.slice(0, 3).forEach((note, nIdx) => {
        doc.text(`• ${note}`, margin + 4, y + 10 + nIdx * 3.8);
      });

      y += 22;
    }

    // Add footer on all pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
      doc.text('CoachMind Basketball • Sistema Inteligente de Planificación Táctica', margin, pageHeight - 6);
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin - 22, pageHeight - 6);
    }

    const cleanTitle = training.title.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Sesion';
    doc.save(`Entrenamiento_CoachMind_${cleanTitle}.pdf`);
    return true;
  } catch (error) {
    console.error('Error generating PDF with jsPDF:', error);
    return false;
  }
};

/**
 * Direct PDF Generator for AI Audit Report (Generates a clean, branded PDF directly via jsPDF)
 */
export const exportAuditReportToPdf = (
  report: TrainingReviewReport,
  sessionInfo: {
    title: string;
    category?: string;
    level?: string;
    intensity?: string;
    objective?: string;
    date?: string;
  }
): boolean => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 16;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    const checkPageBreak = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - margin - 10) {
        doc.addPage();
        y = margin;
        drawHeaderBanner(true);
      }
    };

    const drawHeaderBanner = (isSubsequent = false) => {
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(margin, y, contentWidth, isSubsequent ? 12 : 22, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(isSubsequent ? 10 : 13);
      doc.text('COACHMIND - INFORME DE AUDITORÍA METODOLÓGICA IA', margin + 4, y + (isSubsequent ? 8 : 9));

      if (!isSubsequent) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(203, 213, 225); // slate-300
        doc.text('Evaluación de Coherencia Táctica y Objetivos de Entrenamiento', margin + 4, y + 16);

        const dateStr = sessionInfo.date || new Date().toLocaleDateString('es-ES');
        doc.text(`Fecha: ${dateStr}`, pageWidth - margin - 35, y + 16);
      }

      y += isSubsequent ? 16 : 28;
    };

    drawHeaderBanner(false);

    // Session Info Box
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    const truncatedTitle = sessionInfo.title.length > 55 ? sessionInfo.title.slice(0, 52) + '...' : sessionInfo.title;
    doc.text(`Sesión: ${truncatedTitle}`, margin + 4, y + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    const details = `Categoría: ${sessionInfo.category || 'Senior'}  |  Nivel: ${sessionInfo.level || 'Estándar'}  |  Intensidad: ${sessionInfo.intensity || 'Media'}`;
    doc.text(details, margin + 4, y + 14);

    const objText = `Objetivo: ${sessionInfo.objective ? (sessionInfo.objective.length > 80 ? sessionInfo.objective.slice(0, 77) + '...' : sessionInfo.objective) : 'Fundamentos tácticos'}`;
    doc.text(objText, margin + 4, y + 20);

    y += 30;

    // Alignment Score & Summary Section
    const isHighAlignment = report.alignmentScore >= 80;
    doc.setFillColor(isHighAlignment ? 240 : 254, isHighAlignment ? 253 : 243, isHighAlignment ? 244 : 199);
    doc.setDrawColor(isHighAlignment ? 34 : 217, isHighAlignment ? 197 : 119, isHighAlignment ? 94 : 6);
    doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(isHighAlignment ? 21 : 180, isHighAlignment ? 128 : 83, isHighAlignment ? 61 : 9);
    doc.text(`DIAGNÓSTICO GLOBAL: ${report.alignmentScore}% COHERENCIA METODOLÓGICA`, margin + 4, y + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    const splitSummary = doc.splitTextToSize(report.summary, contentWidth - 8);
    doc.text(splitSummary, margin + 4, y + 14);

    y += 32;

    // Strengths
    if (report.strengths && report.strengths.length > 0) {
      checkPageBreak(30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(16, 185, 129); // emerald-600
      doc.text('PUNTOS FUERTES IDENTIFICADOS POR LA IA', margin, y);
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);

      report.strengths.forEach((str) => {
        checkPageBreak(8);
        const splitStr = doc.splitTextToSize(`• ${str}`, contentWidth - 4);
        doc.text(splitStr, margin + 2, y);
        y += splitStr.length * 4.5 + 1;
      });

      y += 4;
    }

    // Drill-by-Drill Feedback
    if (report.drillFeedbacks && report.drillFeedbacks.length > 0) {
      checkPageBreak(25);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(245, 158, 11); // amber-600
      doc.text('EVALUACIÓN DETALLADA EJERCICIO POR EJERCICIO', margin, y);
      y += 6;

      report.drillFeedbacks.forEach((fb, idx) => {
        checkPageBreak(28);

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'FD');

        // Title & badge
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.text(`${idx + 1}. ${fb.drillTitle}`, margin + 3, y + 5.5);

        doc.setFontSize(8);
        if (fb.isAligned) {
          doc.setTextColor(16, 185, 129);
          doc.text('[ Alineado con Objetivo ]', pageWidth - margin - 45, y + 5.5);
        } else {
          doc.setTextColor(225, 29, 72);
          doc.text('[ Requiere Ajuste ]', pageWidth - margin - 40, y + 5.5);
        }

        // Reason
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);
        const splitReason = doc.splitTextToSize(`Motivo: ${fb.reason}`, contentWidth - 6);
        doc.text(splitReason.slice(0, 2), margin + 3, y + 11);

        // Suggestion
        if (fb.suggestion) {
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(180, 83, 9);
          const splitSug = doc.splitTextToSize(`Consejo IA: ${fb.suggestion}`, contentWidth - 6);
          doc.text(splitSug[0], margin + 3, y + 17.5);
        }

        y += 25;
      });

      y += 2;
    }

    // Tactical Suggestions
    if (report.tacticalSuggestions && report.tacticalSuggestions.length > 0) {
      checkPageBreak(30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(37, 99, 235); // blue-600
      doc.text('RECOMENDACIONES Y SUGERENCIAS TÁCTICAS AVANZADAS', margin, y);
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);

      report.tacticalSuggestions.forEach((sug) => {
        checkPageBreak(8);
        const splitSug = doc.splitTextToSize(`• ${sug}`, contentWidth - 4);
        doc.text(splitSug, margin + 2, y);
        y += splitSug.length * 4.5 + 1;
      });

      y += 4;
    }

    // Footer on all pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
      doc.text('CoachMind Basketball • Sistema Inteligente de Planificación Táctica', margin, pageHeight - 8);
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin - 20, pageHeight - 8);
    }

    const safeFilename = `Auditoria_IA_CoachMind_${sessionInfo.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    doc.save(safeFilename);
    return true;
  } catch (error) {
    console.error('Error generating Audit PDF with jsPDF:', error);
    return false;
  }
};

/**
 * Exports full training session as a Word document (.doc) with embedded Tactical Board images.
 */
export const exportTrainingToDoc = async (training: SavedTraining): Promise<boolean> => {
  try {
    const allDrills = [
      ...(training.plan?.warmup || []),
      ...(training.plan?.mainDrills || []),
      ...(training.plan?.cooldown || []),
    ];

    let drillsHtml = '';
    for (let idx = 0; idx < allDrills.length; idx++) {
      const drill = allDrills[idx];
      const diagramPng = await renderDrillDiagramToPng(drill);

      drillsHtml += `
        <div style="margin-bottom: 24px; padding: 16px; border: 1px solid #cbd5e1; border-radius: 10px; background-color: #ffffff; page-break-inside: avoid;">
          <table style="width: 100%; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px;">
            <tr>
              <td style="font-size: 16px; font-weight: bold; color: #0f172a;">${idx + 1}. ${drill.title}</td>
              <td style="text-align: right; font-size: 13px; color: #ea580c; font-weight: bold;">⏱ ${drill.durationMinutes} min &nbsp;|&nbsp; 👥 ${drill.playersCount || 'Plantilla completa'}</td>
            </tr>
          </table>

          <div style="margin-bottom: 12px;">
            <strong style="font-size: 12px; color: #475569; text-transform: uppercase;">Descripción y Funcionamiento:</strong>
            <p style="margin-top: 4px; font-size: 13px; line-height: 1.5; color: #1e293b;">${drill.description ? drill.description.replace(/\n/g, '<br/>') : 'Sin descripción'}</p>
          </div>

          ${
            drill.coachingTips && drill.coachingTips.length > 0
              ? `<div style="background-color: #eff6ff; padding: 12px; border-left: 4px solid #3b82f6; border-radius: 6px; margin-bottom: 16px;">
                  <strong style="font-size: 12px; color: #1d4ed8; text-transform: uppercase;">Claves de Corrección del Entrenador:</strong>
                  <ul style="margin: 6px 0 0 16px; padding: 0; font-size: 12px; color: #1e293b;">${drill.coachingTips.map((tip) => `<li style="margin-bottom: 3px;">${tip}</li>`).join('')}</ul>
                 </div>`
              : ''
          }

          <div style="margin-top: 12px; text-align: center; background-color: #0f172a; padding: 12px; border-radius: 8px;">
            <div style="font-size: 11px; font-weight: bold; color: #fb923c; margin-bottom: 6px; text-align: left; text-transform: uppercase;">📋 Pizarra Táctica:</div>
            <img src="${diagramPng}" width="460" height="288" style="display: block; margin: 0 auto; border-radius: 6px; border: 1px solid #475569;" alt="Pizarra táctica de ${drill.title}" />
          </div>
        </div>
      `;
    }

    const auditHtml = training.plan?.reviewReport
      ? `
        <div style="background-color: #0f172a; color: #ffffff; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
          <h3 style="color: #fbbf24; margin-top: 0;">Auditoría Metodológica IA (${training.plan.reviewReport.alignmentScore}% Coherencia)</h3>
          <p style="color: #cbd5e1; font-size: 13px;">${training.plan.reviewReport.summary}</p>
        </div>
      `
      : '';

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${training.title} - CoachMind</title>
        <style>
          body { font-family: Calibri, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #0f172a; border-bottom: 2px solid #ea580c; padding-bottom: 8px; }
          .meta-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; margin-bottom: 20px; font-size: 13px; }
          .obj-box { background: #fff7ed; border-left: 4px solid #ea580c; padding: 12px; margin-bottom: 20px; font-size: 13px; }
        </style>
      </head>
      <body>
        <h1>🏀 COACHMIND - ${training.title}</h1>
        <div class="meta-box">
          <strong>Sección:</strong> ${training.section} | 
          <strong>Categoría:</strong> ${training.category} | 
          <strong>Nivel:</strong> ${training.level} | 
          <strong>Intensidad:</strong> ${training.intensity} | 
          <strong>Duración:</strong> ${training.durationMinutes} min
        </div>
        <div class="obj-box">
          <strong>Objetivo Principal:</strong><br/>
          ${training.objective || 'Desarrollo técnico y táctico'}
        </div>
        ${auditHtml}
        <h2>Desglose Detallado de Ejercicios y Pizarras (${allDrills.length})</h2>
        ${drillsHtml}
        <hr/>
        <p style="font-size: 11px; color: #94a3b8; text-align: center;">CoachMind Basketball © ${new Date().getFullYear()} • Documento Oficial de Entrenamiento</p>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + fullHtml], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Entrenamiento_CoachMind_${training.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('Error exporting to Doc:', error);
    return false;
  }
};

/**
 * Open print window for AI Audit Report directly
 */
export const printAuditReport = (
  report: TrainingReviewReport,
  sessionInfo: {
    title: string;
    category?: string;
    level?: string;
    intensity?: string;
    objective?: string;
    date?: string;
  }
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor, permite las ventanas emergentes en tu navegador para imprimir la auditoría.');
    return;
  }

  const drillsHtml = report.drillFeedbacks
    .map(
      (fb, idx) => `
      <div style="margin-bottom: 12px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <strong style="font-size: 14px; color: #0f172a;">${idx + 1}. ${fb.drillTitle}</strong>
          <span style="font-size: 11px; font-weight: bold; color: ${fb.isAligned ? '#16a34a' : '#d97706'}; background: ${fb.isAligned ? '#f0fdf4' : '#fffbeb'}; padding: 3px 8px; border-radius: 9999px;">
            ${fb.isAligned ? '✅ En Línea con Objetivo' : '⚠️ Requiere Ajuste'}
          </span>
        </div>
        <p style="font-size: 12px; color: #475569; margin: 4px 0;">${fb.reason}</p>
        ${
          fb.suggestion
            ? `<p style="font-size: 12px; color: #b45309; margin-top: 6px; padding-top: 4px; border-top: 1px dashed #cbd5e1;"><strong>💡 Consejo táctico:</strong> ${fb.suggestion}</p>`
            : ''
        }
      </div>
    `
    )
    .join('');

  const strengthsHtml = report.strengths.map((s) => `<li style="margin-bottom: 4px;">${s}</li>`).join('');
  const suggestionsHtml = report.tacticalSuggestions.map((s) => `<li style="margin-bottom: 4px;">${s}</li>`).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>CoachMind - Auditoría IA - ${sessionInfo.title}</title>
      <style>
        @media print {
          body { margin: 0; padding: 15px; font-size: 12pt; }
          .no-print { display: none !important; }
        }
        body { font-family: system-ui, -apple-system, sans-serif; color: #0f172a; padding: 25px; max-width: 800px; margin: 0 auto; line-height: 1.5; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #f59e0b; padding-bottom: 10px; margin-bottom: 20px; }
        .btn-print { background: #f59e0b; color: #0f172a; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 800; cursor: pointer; margin-bottom: 20px; }
        .score-box { background: #0f172a; color: white; padding: 16px; border-radius: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
      </style>
    </head>
    <body>
      <button class="btn-print no-print" onclick="window.print()">🖨️ Imprimir Auditoría / Guardar PDF</button>

      <div class="header">
        <div>
          <h2 style="margin: 0; color: #0f172a;">🏀 CoachMind - Auditoría Metodológica IA</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">Evaluación de Coherencia Táctica y Objetivos</p>
        </div>
        <div style="font-size: 12px; color: #64748b;">Fecha: ${sessionInfo.date || new Date().toLocaleDateString('es-ES')}</div>
      </div>

      <div style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 16px; font-size: 13px;">
        <strong>Sesión:</strong> ${sessionInfo.title} | <strong>Categoría:</strong> ${sessionInfo.category || 'Senior'} | <strong>Intensidad:</strong> ${sessionInfo.intensity || 'Media'}<br/>
        <strong>Objetivo:</strong> ${sessionInfo.objective || 'Fundamentos tácticos'}
      </div>

      <div class="score-box">
        <div>
          <div style="font-size: 11px; font-weight: bold; color: #fbbf24; text-transform: uppercase;">Diagnóstico General</div>
          <div style="font-size: 13px; color: #e2e8f0; margin-top: 4px;">${report.summary}</div>
        </div>
        <div style="text-align: center; margin-left: 20px; background: rgba(255,255,255,0.1); padding: 10px 16px; border-radius: 10px;">
          <div style="font-size: 10px; color: #cbd5e1; text-transform: uppercase;">Coherencia</div>
          <div style="font-size: 24px; font-weight: 900; color: #fbbf24;">${report.alignmentScore}%</div>
        </div>
      </div>

      <h3 style="font-size: 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">Puntos Fuertes Identificados</h3>
      <ul style="font-size: 13px; color: #334155;">${strengthsHtml}</ul>

      <h3 style="font-size: 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-top: 20px;">Evaluación Ejercicio por Ejercicio</h3>
      ${drillsHtml}

      <h3 style="font-size: 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-top: 20px;">Recomendaciones Tácticas Avanzadas</h3>
      <ul style="font-size: 13px; color: #334155;">${suggestionsHtml}</ul>

      <hr style="margin-top: 30px; border: 0; border-top: 1px solid #e2e8f0;"/>
      <p style="font-size: 11px; color: #94a3b8; text-align: center;">CoachMind Basketball • www.coachmind.app</p>

      <script>
        setTimeout(() => { window.print(); }, 400);
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
};
