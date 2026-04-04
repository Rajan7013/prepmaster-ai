import jsPDF from 'jspdf';
import 'jspdf-autotable';
import ExcelJS from 'exceljs';

// Extend jsPDF with autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export const generatePDFReport = async (sessionData: any, userData: any) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Watermark
  doc.setFontSize(60);
  doc.setTextColor(245, 245, 245);
  doc.text('PREPMASTER AI', pageWidth / 2, pageHeight / 2, { align: 'center', angle: 45 });

  // Header Logo
  doc.setFillColor(63, 81, 181);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('PREPMASTER AI', 20, 25);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Professional Interview Performance Report', 20, 32);

  // Reset text color
  doc.setTextColor(0, 0, 0);

  // User Details Section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('CANDIDATE INFORMATION', 20, 55);
  
  doc.setDrawColor(200);
  doc.line(20, 57, pageWidth - 20, 57);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Name: ${userData?.displayName || userData?.name || 'User'}`, 20, 65);
  doc.text(`Email: ${userData?.email || 'N/A'}`, 20, 72);
  doc.text(`Target Role: ${sessionData.role || userData?.targetRole || 'Software Engineer'}`, 20, 79);
  doc.text(`Report ID: ${sessionData.id}`, pageWidth - 80, 65);
  doc.text(`Date: ${new Date(sessionData.timestamp).toLocaleString()}`, pageWidth - 80, 72);

  // Overall Score
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`OVERALL PERFORMANCE SCORE: ${sessionData.overallScore}/100`, 20, 95);

  // Metrics Table
  const metricsData = [
    ['Metric', 'Score', 'Status'],
    ['Subject Knowledge', `${sessionData.metrics.subjectKnowledge}/100`, sessionData.metrics.subjectKnowledge > 70 ? 'Strong' : 'Needs Work'],
    ['Communication', `${sessionData.metrics.communication}/100`, sessionData.metrics.communication > 70 ? 'Strong' : 'Needs Work'],
    ['Vocabulary', `${sessionData.metrics.vocabulary}/100`, sessionData.metrics.vocabulary > 70 ? 'Strong' : 'Needs Work'],
    ['Eye Movement', `${sessionData.metrics.eyeMovement}/100`, sessionData.metrics.eyeMovement > 70 ? 'Strong' : 'Needs Work'],
    ['Gestures', `${sessionData.metrics.gestures}/100`, sessionData.metrics.gestures > 70 ? 'Strong' : 'Needs Work'],
    ['Voice Pitch', `${sessionData.metrics.voicePitch}/100`, sessionData.metrics.voicePitch > 70 ? 'Strong' : 'Needs Work'],
    ['Response Time', `${sessionData.metrics.responseTime}/100`, sessionData.metrics.responseTime > 70 ? 'Strong' : 'Needs Work'],
    ['Fumbling', `${sessionData.metrics.fumbling}/100`, sessionData.metrics.fumbling > 70 ? 'Strong' : 'Needs Work'],
    ['Stuttering', `${sessionData.metrics.stuttering}/100`, sessionData.metrics.stuttering > 70 ? 'Strong' : 'Needs Work'],
  ];

  doc.autoTable({
    startY: 105,
    head: [metricsData[0]],
    body: metricsData.slice(1),
    theme: 'grid',
    headStyles: { fillColor: [63, 81, 181], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 4 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });

  // Feedback Sections
  let finalY = (doc as any).lastAutoTable.finalY + 15;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DETAILED AI ANALYSIS', 20, finalY);
  doc.line(20, finalY + 2, pageWidth - 20, finalY + 2);
  
  doc.setFontSize(10);
  finalY += 10;
  
  const feedbackSections = [
    { title: 'Content & Subject Knowledge:', text: sessionData.feedback.content },
    { title: 'Voice & Delivery:', text: sessionData.feedback.voice },
    { title: 'Body Language & Gestures:', text: sessionData.feedback.gestures },
    { title: 'Fluency (Stuttering & Fumbling):', text: sessionData.feedback.stutteringAndFumbling },
  ];

  feedbackSections.forEach(section => {
    if (finalY > pageHeight - 40) {
      doc.addPage();
      finalY = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.text(section.title, 20, finalY);
    finalY += 6;
    doc.setFont('helvetica', 'normal');
    const splitText = doc.splitTextToSize(section.text, pageWidth - 40);
    doc.text(splitText, 20, finalY);
    finalY += (splitText.length * 5) + 8;
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(200);
    doc.line(20, pageHeight - 15, pageWidth - 20, pageHeight - 15);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 35, pageHeight - 10);
    doc.text(`Generated on ${new Date().toLocaleString()} | PrepMaster AI - Professional Interview Coach`, 20, pageHeight - 10);
  }

  doc.save(`PrepMaster_Report_${sessionData.id}.pdf`);
};

export const generateExcelReport = async (sessionData: any, userData: any) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Interview Report');

  // Add Header
  worksheet.mergeCells('A1:C1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'PREPMASTER AI - INTERVIEW PERFORMANCE REPORT';
  titleCell.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3F51B5' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 30;

  // User Info
  worksheet.addRow([]);
  worksheet.addRow(['CANDIDATE DETAILS']);
  worksheet.getRow(3).font = { bold: true };
  
  worksheet.addRow(['Name', userData?.displayName || userData?.name || 'User']);
  worksheet.addRow(['Email', userData?.email || 'N/A']);
  worksheet.addRow(['Target Role', sessionData.role || userData?.targetRole || 'Software Engineer']);
  worksheet.addRow(['Report ID', sessionData.id]);
  worksheet.addRow(['Date', new Date(sessionData.timestamp).toLocaleString()]);
  worksheet.addRow([]);

  // Overall Score
  const scoreRow = worksheet.addRow(['OVERALL PERFORMANCE SCORE', sessionData.overallScore]);
  scoreRow.getCell(1).font = { bold: true };
  scoreRow.getCell(2).font = { bold: true, size: 12, color: { argb: 'FF3F51B5' } };

  worksheet.addRow([]);

  // Metrics Table
  const metricsHeader = worksheet.addRow(['METRIC', 'SCORE', 'STATUS']);
  metricsHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  metricsHeader.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3F51B5' } };
  });

  const metrics = [
    ['Subject Knowledge', sessionData.metrics.subjectKnowledge, sessionData.metrics.subjectKnowledge > 70 ? 'Strong' : 'Needs Work'],
    ['Communication', sessionData.metrics.communication, sessionData.metrics.communication > 70 ? 'Strong' : 'Needs Work'],
    ['Vocabulary', sessionData.metrics.vocabulary, sessionData.metrics.vocabulary > 70 ? 'Strong' : 'Needs Work'],
    ['Eye Movement', sessionData.metrics.eyeMovement, sessionData.metrics.eyeMovement > 70 ? 'Strong' : 'Needs Work'],
    ['Gestures', sessionData.metrics.gestures, sessionData.metrics.gestures > 70 ? 'Strong' : 'Needs Work'],
    ['Voice Pitch', sessionData.metrics.voicePitch, sessionData.metrics.voicePitch > 70 ? 'Strong' : 'Needs Work'],
    ['Response Time', sessionData.metrics.responseTime, sessionData.metrics.responseTime > 70 ? 'Strong' : 'Needs Work'],
    ['Fumbling', sessionData.metrics.fumbling, sessionData.metrics.fumbling > 70 ? 'Strong' : 'Needs Work'],
    ['Stuttering', sessionData.metrics.stuttering, sessionData.metrics.stuttering > 70 ? 'Strong' : 'Needs Work'],
  ];

  metrics.forEach(m => {
    const row = worksheet.addRow(m);
    if (m[2] === 'Needs Work') {
      row.getCell(3).font = { color: { argb: 'FFFF0000' } };
    } else {
      row.getCell(3).font = { color: { argb: 'FF008000' } };
    }
  });

  worksheet.addRow([]);

  // Feedback
  const feedbackHeader = worksheet.addRow(['FEEDBACK CATEGORY', 'DETAILED AI ANALYSIS']);
  feedbackHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  feedbackHeader.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3F51B5' } };
  });

  worksheet.addRow(['Content & Knowledge', sessionData.feedback.content]);
  worksheet.addRow(['Voice & Delivery', sessionData.feedback.voice]);
  worksheet.addRow(['Body Language', sessionData.feedback.gestures]);
  worksheet.addRow(['Fluency', sessionData.feedback.stutteringAndFumbling]);

  // Styling
  worksheet.getColumn(1).width = 30;
  worksheet.getColumn(2).width = 80;
  worksheet.getColumn(3).width = 15;
  
  worksheet.eachRow(row => {
    row.alignment = { wrapText: true, vertical: 'middle' };
  });

  // Footer
  worksheet.addRow([]);
  const footerRow = worksheet.addRow(['Generated by PrepMaster AI', '', `Date: ${new Date().toLocaleString()}`]);
  footerRow.font = { size: 9, italic: true, color: { argb: 'FF808080' } };

  // Save
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `PrepMaster_Report_${sessionData.id}.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
};
