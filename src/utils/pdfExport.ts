import jsPDF from 'jspdf';
import { SavedTraining, DrillItem, TrainingReviewReport } from '../types';

/**
 * Native, bulletproof PDF Generator for Full Training Sessions using jsPDF.
 * Generates sharp, vector-quality multi-page PDF documents and immediately triggers file download.
 */
export const exportTrainingSessionToPdf = (training: SavedTraining): boolean => {
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
      if (y + neededHeight > pageHeight - margin - 12) {
        doc.addPage();
        y = margin;
        drawPageHeader();
      }
    };

    const drawPageHeader = () => {
      // Top header banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(margin, y, contentWidth, 14, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('COACHMIND - SESIÓN DE ENTRENAMIENTO DE BALONCESTO', margin + 4, y + 9);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(251, 146, 60); // orange-400
      const dateStr = training.createdAt || new Date().toLocaleDateString('es-ES');
      doc.text(dateStr, pageWidth - margin - 25, y + 9);

      y += 18;
    };

    // First Page Initial Header
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(margin, y, contentWidth, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('COACHMIND BALONCESTO', margin + 4, y + 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(203, 213, 225); // slate-300
    doc.text('Planificación Táctica Oficial y Metodología Deportiva', margin + 4, y + 16);

    const dateStr = training.createdAt || new Date().toLocaleDateString('es-ES');
    doc.setTextColor(251, 146, 60); // orange-400
    doc.setFont('helvetica', 'bold');
    doc.text(`Fecha: ${dateStr}`, pageWidth - margin - 35, y + 16);

    y += 28;

    // Session Title & Core Meta Box
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'FD');

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42); // slate-900
    const titleText = training.title.length > 55 ? training.title.slice(0, 52) + '...' : training.title;
    doc.text(titleText, margin + 4, y + 8);

    // Meta row
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105); // slate-600
    const totalTime =
      training.plan?.totalDuration ||
      training.durationMinutes ||
      60;
    const metaLine1 = `Sección: ${training.section || 'General'}  |  Categoría: ${training.category || 'Senior'} (${training.ageRange || 'Libre'})  |  Nivel: ${training.level || 'Estándar'}`;
    doc.text(metaLine1, margin + 4, y + 15);

    const metaLine2 = `Intensidad: ${training.intensity || 'Media'}  |  Duración Total: ${totalTime} minutos  |  Ejercicios: ${training.exerciseCount || (training.plan?.mainDrills?.length || 0) + (training.plan?.warmup?.length || 0) + (training.plan?.cooldown?.length || 0)}`;
    doc.text(metaLine2, margin + 4, y + 21);

    y += 31;

    // Objective Box
    if (training.objective) {
      checkPageBreak(25);
      doc.setFillColor(255, 247, 237); // orange-50
      doc.setDrawColor(249, 115, 22); // orange-500
      doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(194, 65, 12); // orange-700
      doc.text('OBJETIVO PRINCIPAL DE LA SESIÓN:', margin + 4, y + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      const splitObj = doc.splitTextToSize(training.objective, contentWidth - 8);
      doc.text(splitObj.slice(0, 2), margin + 4, y + 12);

      y += 22;
    }

    // AI Review Report Summary if attached
    if (training.plan?.reviewReport) {
      const review = training.plan.reviewReport;
      checkPageBreak(28);

      const isHigh = review.alignmentScore >= 80;
      doc.setFillColor(15, 23, 42); // slate-900
      doc.setDrawColor(30, 41, 59);
      doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(251, 191, 36); // amber-400
      doc.text('AUDITORÍA METODOLÓGICA IA', margin + 4, y + 6.5);

      doc.setFontSize(8.5);
      doc.setTextColor(isHigh ? 52 : 251, isHigh ? 211 : 191, isHigh ? 153 : 36);
      doc.text(`Coherencia Táctica: ${review.alignmentScore}%`, pageWidth - margin - 45, y + 6.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(226, 232, 240);
      const splitSummary = doc.splitTextToSize(review.summary, contentWidth - 8);
      doc.text(splitSummary.slice(0, 2), margin + 4, y + 13);

      y += 28;
    }

    // Helper for rendering drills
    const renderDrillSection = (
      sectionTitle: string,
      drills: DrillItem[],
      colorTheme: { headerBg: [number, number, number]; accent: [number, number, number] }
    ) => {
      if (!drills || drills.length === 0) return;

      checkPageBreak(20);

      // Section Title Banner
      doc.setFillColor(...colorTheme.headerBg);
      doc.roundedRect(margin, y, contentWidth, 8, 1.5, 1.5, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(255, 255, 255);
      doc.text(sectionTitle.toUpperCase(), margin + 4, y + 5.5);

      y += 11;

      drills.forEach((drill, idx) => {
        checkPageBreak(35);

        // Drill Box
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        
        const drillBoxStartY = y;
        let drillBoxHeight = 32;

        // Calculate needed height for description and tips
        const splitDesc = drill.description ? doc.splitTextToSize(drill.description, contentWidth - 10) : [];
        const hasTips = drill.coachingTips && drill.coachingTips.length > 0;
        const tipsHeight = hasTips ? Math.min(drill.coachingTips.length * 4.5 + 8, 20) : 0;
        const descHeight = Math.min(splitDesc.length * 4, 25);
        
        drillBoxHeight = 14 + descHeight + tipsHeight + 4;

        doc.roundedRect(margin, drillBoxStartY, contentWidth, drillBoxHeight, 2, 2, 'FD');

        // Drill Header inside box
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin, drillBoxStartY, contentWidth, 8, 2, 2, 'F');
        doc.rect(margin, drillBoxStartY + 6, contentWidth, 2, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        const drillHeader = `${idx + 1}. ${drill.title}`;
        doc.text(drillHeader, margin + 4, drillBoxStartY + 5.5);

        // Time & Players on the right
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        const drillMeta = `${drill.durationMinutes} min  |  ${drill.playersCount || 'Equipo'}`;
        doc.text(drillMeta, pageWidth - margin - 40, drillBoxStartY + 5.5);

        let curY = drillBoxStartY + 12;

        // Description
        if (splitDesc.length > 0) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(51, 65, 85);
          doc.text(splitDesc.slice(0, 5), margin + 4, curY);
          curY += Math.min(splitDesc.length * 4, 20) + 2;
        }

        // Coaching Tips
        if (hasTips) {
          doc.setFillColor(239, 246, 255); // blue-50
          doc.setDrawColor(191, 219, 254);
          const boxH = Math.min(drill.coachingTips.length * 4.5 + 4, 18);
          doc.roundedRect(margin + 3, curY, contentWidth - 6, boxH, 1.5, 1.5, 'FD');

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(29, 78, 216); // blue-700
          doc.text('Claves de Corrección:', margin + 6, curY + 4);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(30, 41, 59);

          drill.coachingTips.slice(0, 3).forEach((tip, tIdx) => {
            const tipText = `• ${tip.length > 80 ? tip.slice(0, 77) + '...' : tip}`;
            doc.text(tipText, margin + 6, curY + 8 + tIdx * 4);
          });

          curY += boxH + 2;
        }

        y += drillBoxHeight + 4;
      });

      y += 2;
    };

    // 1. Warmup
    if (training.plan?.warmup && training.plan.warmup.length > 0) {
      renderDrillSection('1. Fase de Calentamiento / Activación', training.plan.warmup, {
        headerBg: [234, 88, 12], // orange-600
        accent: [249, 115, 22],
      });
    }

    // 2. Main Drills
    if (training.plan?.mainDrills && training.plan.mainDrills.length > 0) {
      renderDrillSection('2. Fase Principal / Ejercicios Tácticos', training.plan.mainDrills, {
        headerBg: [37, 99, 235], // blue-600
        accent: [59, 130, 246],
      });
    }

    // 3. Cooldown
    if (training.plan?.cooldown && training.plan.cooldown.length > 0) {
      renderDrillSection('3. Fase Final / Vuelta a la Calma', training.plan.cooldown, {
        headerBg: [5, 150, 105], // emerald-600
        accent: [16, 185, 129],
      });
    }

    // Coach Tactical Notes
    if (training.plan?.coachNotes && training.plan.coachNotes.length > 0) {
      checkPageBreak(25);
      doc.setFillColor(241, 245, 249); // slate-100
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('NOTAS Y RECORDATORIOS DEL ENTRENADOR', margin + 4, y + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);

      training.plan.coachNotes.slice(0, 3).forEach((note, nIdx) => {
        doc.text(`• ${note}`, margin + 4, y + 11 + nIdx * 4);
      });

      y += 24;
    }

    // Add footer on all pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
      doc.text('CoachMind Basketball • Sistema Inteligente de Planificación', margin, pageHeight - 6);
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
      // Header Bar
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

      y += (isSubsequent ? 16 : 28);
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
 * Exports full training session as a Word document (.doc)
 */
export const exportTrainingToDoc = (training: SavedTraining) => {
  const allDrills = [
    ...(training.plan?.warmup || []),
    ...(training.plan?.mainDrills || []),
    ...(training.plan?.cooldown || []),
  ];

  let drillsHtml = '';
  allDrills.forEach((drill, idx) => {
    drillsHtml += `
      <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
        <h3 style="color: #ea580c; margin-top: 0;">${idx + 1}. ${drill.title} (${drill.durationMinutes} min)</h3>
        <p><strong>Jugadores/Espacio:</strong> ${drill.playersCount || 'Plantilla completa'}</p>
        <p><strong>Descripción:</strong><br/>${drill.description ? drill.description.replace(/\n/g, '<br/>') : 'Sin descripción'}</p>
        ${
          drill.coachingTips && drill.coachingTips.length > 0
            ? `<div style="background-color: #eff6ff; padding: 10px; border-left: 4px solid #3b82f6; margin-top: 10px;">
                <strong>Claves de Corrección:</strong>
                <ul>${drill.coachingTips.map((tip) => `<li>${tip}</li>`).join('')}</ul>
               </div>`
            : ''
        }
      </div>
    `;
  });

  const auditHtml = training.plan?.reviewReport
    ? `
      <div style="background-color: #0f172a; color: #ffffff; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
        <h3 style="color: #fbbf24; margin-top: 0;">Auditoría Metodológica IA (${training.plan.reviewReport.alignmentScore}% Coherencia)</h3>
        <p style="color: #cbd5e1;">${training.plan.reviewReport.summary}</p>
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
        .meta-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; margin-bottom: 20px; }
        .obj-box { background: #fff7ed; border-left: 4px solid #ea580c; padding: 12px; margin-bottom: 20px; }
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
      <h2>Ejercicios de la Sesión (${allDrills.length})</h2>
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
