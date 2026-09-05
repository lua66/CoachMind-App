import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PlayerStatsData {
  id: string;
  equipo: string;
  fecha: string;
  dorsal: string;
  jugadora: string;
  pj: number;
  min: number;
  pts: number;
  fc_p: number;
  tla: number;
  tli: number;
  t2a: number;
  t2i: number;
  t3a: number;
  t3i: number;
  team: 'local' | 'visitante';
}

export interface TeamScoutingReportParams {
  teamName: string;
  opponentName: string;
  isLocal: boolean;
  matchLeg: 'ida' | 'vuelta';
  matchNumber: string;
  scoreLocal: string;
  scoreVisitor: string;
  players: PlayerStatsData[];
}

export function generateTeamScoutingPdf(params: TeamScoutingReportParams) {
  const {
    teamName,
    opponentName,
    isLocal,
    matchLeg,
    matchNumber,
    scoreLocal,
    scoreVisitor,
    players,
  } = params;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const primaryColor: [number, number, number] = isLocal ? [30, 64, 175] : [109, 40, 217]; // Blue or Purple
  const darkNavy: [number, number, number] = [11, 19, 43];
  const goldAccent: [number, number, number] = [217, 119, 6];

  // 1. Header Banner
  doc.setFillColor(...darkNavy);
  doc.rect(0, 0, pageWidth, 38, 'F');

  // Decorative Accent bar
  doc.setFillColor(...primaryColor);
  doc.rect(0, 36, pageWidth, 2.5, 'F');

  // Title & Subtitle
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text(`INFORME DE SCOUTING OFENSIVO`, 14, 14);

  doc.setFontSize(11);
  doc.setTextColor(245, 158, 11);
  doc.text(`EQUIPO: ${teamName.toUpperCase()} (${isLocal ? 'LOCAL' : 'VISITANTE / RIVAL'})`, 14, 21);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  const matchInfoText = `Partido #${matchNumber || '1'} • Partido de ${matchLeg === 'ida' ? 'Ida' : 'Vuelta'} • Rival: ${opponentName || 'Rival'}`;
  doc.text(matchInfoText, 14, 28);

  if (scoreLocal || scoreVisitor) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`Marcador: ${scoreLocal || '0'} - ${scoreVisitor || '0'}`, pageWidth - 14, 21, { align: 'right' });
  }

  const generatedDate = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generado: ${generatedDate}`, pageWidth - 14, 28, { align: 'right' });

  let currentY = 44;

  // 2. Resumen Métrico General del Equipo
  const totalPoints = players.reduce((sum, p) => sum + (p.pts || (p.tla * 1 + p.t2a * 2 + p.t3a * 3)), 0);
  const totalTLA = players.reduce((sum, p) => sum + p.tla, 0);
  const totalTLI = players.reduce((sum, p) => sum + p.tli, 0);
  const pctTL = totalTLI > 0 ? ((totalTLA / totalTLI) * 100).toFixed(1) : '-';

  const totalT2A = players.reduce((sum, p) => sum + p.t2a, 0);
  const totalT2I = players.reduce((sum, p) => sum + p.t2i, 0);
  const pctT2 = totalT2I > 0 ? ((totalT2A / totalT2I) * 100).toFixed(1) : '-';

  const totalT3A = players.reduce((sum, p) => sum + p.t3a, 0);
  const totalT3I = players.reduce((sum, p) => sum + p.t3i, 0);
  const pctT3 = totalT3I > 0 ? ((totalT3A / totalT3I) * 100).toFixed(1) : '-';

  const totalFaltas = players.reduce((sum, p) => sum + p.fc_p, 0);

  // Metric Cards
  const boxWidth = (pageWidth - 28 - 9) / 4;
  const metrics = [
    { label: 'PUNTOS TOTALES', val: `${totalPoints} pts`, sub: `${players.length} jugadoras` },
    { label: 'TIROS LIBRES (TL)', val: `${totalTLA}/${totalTLI || totalTLA}`, sub: pctTL !== '-' ? `${pctTL}% acierto` : 'Anotados' },
    { label: 'TIROS DE 2 (T2)', val: `${totalT2A}/${totalT2I || totalT2A}`, sub: pctT2 !== '-' ? `${pctT2}% acierto` : 'Anotados' },
    { label: 'TRIPLES (T3)', val: `${totalT3A}/${totalT3I || totalT3A}`, sub: pctT3 !== '-' ? `${pctT3}% acierto` : 'Anotados' },
  ];

  metrics.forEach((m, idx) => {
    const x = 14 + idx * (boxWidth + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, currentY, boxWidth, 18, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(m.label, x + 3, currentY + 5);

    doc.setFontSize(10.5);
    doc.setTextColor(...darkNavy);
    doc.text(m.val, x + 3, currentY + 11.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(m.sub, x + 3, currentY + 15.5);
  });

  currentY += 23;

  // 3. TOP 5 OFENSIVOS (Cuadrantes de Análisis)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...darkNavy);
  doc.text('LÍDERES OFENSIVAS • TOP 5 EN CADA APARTADO', 14, currentY);
  currentY += 4;

  const topPTS = [...players].sort((a, b) => b.pts - a.pts).slice(0, 5);
  const topTLA = [...players].sort((a, b) => b.tla - a.tla).slice(0, 5);
  const topT2A = [...players].sort((a, b) => b.t2a - a.t2a).slice(0, 5);
  const topT3A = [...players].sort((a, b) => b.t3a - a.t3a).slice(0, 5);

  const topCols = [
    { title: 'TOP 5 PUNTOS', list: topPTS, keyVal: (p: PlayerStatsData) => `${p.pts} pts`, headerBg: primaryColor },
    { title: 'TOP 5 TIROS LIBRES (TL)', list: topTLA, keyVal: (p: PlayerStatsData) => `${p.tla}${p.tli ? `/${p.tli}` : ''} TL`, headerBg: goldAccent },
    { title: 'TOP 5 TIROS DE 2 (T2)', list: topT2A, keyVal: (p: PlayerStatsData) => `${p.t2a}${p.t2i ? `/${p.t2i}` : ''} T2`, headerBg: [37, 99, 235] as [number, number, number] },
    { title: 'TOP 5 TRIPLES (T3)', list: topT3A, keyVal: (p: PlayerStatsData) => `${p.t3a}${p.t3i ? `/${p.t3i}` : ''} T3`, headerBg: [225, 29, 72] as [number, number, number] },
  ];

  topCols.forEach((col, idx) => {
    const x = 14 + idx * (boxWidth + 3);
    const yStart = currentY;

    // Header
    doc.setFillColor(...col.headerBg);
    doc.roundedRect(x, yStart, boxWidth, 6, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text(col.title, x + boxWidth / 2, yStart + 4.2, { align: 'center' });

    // Rows
    let rowY = yStart + 7.5;
    col.list.forEach((p, pIdx) => {
      doc.setFillColor(pIdx % 2 === 0 ? 255 : 248, pIdx % 2 === 0 ? 255 : 250, pIdx % 2 === 0 ? 255 : 252);
      doc.setDrawColor(226, 232, 240);
      doc.rect(x, rowY, boxWidth, 6, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(30, 41, 59);
      const dorsalStr = p.dorsal ? `#${p.dorsal} ` : '';
      const nameShort = p.jugadora.length > 13 ? p.jugadora.substring(0, 12) + '…' : p.jugadora;
      doc.text(`${pIdx + 1}. ${dorsalStr}${nameShort}`, x + 1.5, rowY + 4.2);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(...col.headerBg);
      doc.text(col.keyVal(p), x + boxWidth - 1.5, rowY + 4.2, { align: 'right' });

      rowY += 6.5;
    });

    if (col.list.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text('Sin registros', x + boxWidth / 2, rowY + 4, { align: 'center' });
    }
  });

  currentY += 46;

  // 4. TABLA COMPLETA CON LOS ENCABEZADOS EXACTOS DEL EXCEL
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...darkNavy);
  doc.text('PLANILLA COMPLETA DE ESTADÍSTICAS', 14, currentY);
  currentY += 2;

  const tableHead = [
    [
      'Dorsal',
      'Jugadora',
      'PJ',
      'MIN',
      'PTS',
      'FC/P',
      'TLA',
      'TLI',
      '%TL',
      'T2A',
      'T2I',
      '%T2',
      'T3A',
      'T3I',
      '%T3',
    ],
  ];

  const tableBody = players.map((p) => {
    const pTL = p.tli > 0 ? `${Math.round((p.tla / p.tli) * 100)}%` : '-';
    const pT2 = p.t2i > 0 ? `${Math.round((p.t2a / p.t2i) * 100)}%` : '-';
    const pT3 = p.t3i > 0 ? `${Math.round((p.t3a / p.t3i) * 100)}%` : '-';

    return [
      p.dorsal || '-',
      p.jugadora || 'Jugadora',
      p.pj.toString(),
      p.min.toString(),
      p.pts.toString(),
      p.fc_p.toString(),
      p.tla.toString(),
      p.tli.toString(),
      pTL,
      p.t2a.toString(),
      p.t2i.toString(),
      pT2,
      p.t3a.toString(),
      p.t3i.toString(),
      pT3,
    ];
  });

  // Fila de Totales
  const totalPJMax = Math.max(...players.map((p) => p.pj), 1);
  const totalMin = players.reduce((sum, p) => sum + p.min, 0);

  tableBody.push([
    'TOTAL',
    `${players.length} Jugadoras`,
    totalPJMax.toString(),
    totalMin.toString(),
    totalPoints.toString(),
    totalFaltas.toString(),
    totalTLA.toString(),
    totalTLI.toString(),
    pctTL !== '-' ? `${pctTL}%` : '-',
    totalT2A.toString(),
    totalT2I.toString(),
    pctT2 !== '-' ? `${pctT2}%` : '-',
    totalT3A.toString(),
    totalT3I.toString(),
    pctT3 !== '-' ? `${pctT3}%` : '-',
  ]);

  autoTable(doc, {
    startY: currentY,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    styles: {
      fontSize: 6.5,
      cellPadding: 1.5,
      halign: 'center',
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: darkNavy,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 11, fontStyle: 'bold' },
      1: { cellWidth: 32, halign: 'left', fontStyle: 'bold' },
      2: { cellWidth: 8 },
      3: { cellWidth: 9 },
      4: { cellWidth: 10, fontStyle: 'bold', textColor: [180, 83, 9] },
      5: { cellWidth: 9 },
      6: { cellWidth: 9 },
      7: { cellWidth: 9 },
      8: { cellWidth: 10 },
      9: { cellWidth: 9 },
      10: { cellWidth: 9 },
      11: { cellWidth: 10 },
      12: { cellWidth: 9 },
      13: { cellWidth: 9 },
      14: { cellWidth: 10 },
    },
    didParseCell: (data) => {
      // Fila de totales en negrita
      if (data.row.index === tableBody.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
        data.cell.styles.textColor = [15, 23, 42];
      }
    },
    margin: { left: 14, right: 14 },
  });

  // Footer / Pie de página
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `CoachMind Analytics • Informe Oficial de Scouting • Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  // Descargar archivo PDF
  const sanitizedTeamName = teamName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const filename = `Scouting_${sanitizedTeamName}_${matchLeg}_partido_${matchNumber || '1'}.pdf`;
  doc.save(filename);
}
