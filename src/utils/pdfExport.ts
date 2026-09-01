import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { SavedTraining, TrainingReviewReport } from '../types';

/**
 * Exports any DOM element as a high-quality multi-page PDF using html2canvas & jsPDF.
 */
export const exportElementToPdf = async (
  element: HTMLElement,
  filename: string,
  onProgress?: (isGenerating: boolean) => void
): Promise<boolean> => {
  try {
    if (onProgress) onProgress(true);

    // Save previous styles if needed
    const canvas = await html2canvas(element, {
      scale: 2, // High resolution for sharp text and diagrams
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // Add first page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    // Add subsequent pages if the content spans multiple pages
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    pdf.save(cleanFilename);
    return true;
  } catch (error) {
    console.error('Error generating PDF with html2canvas:', error);
    return false;
  } finally {
    if (onProgress) onProgress(false);
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
) => {
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
  doc.setFillColor(isHighAlignment ? 240 : 254, isHighAlignment ? 253 : 243, isHighAlignment ? 244 : 199); // light green or light amber
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
