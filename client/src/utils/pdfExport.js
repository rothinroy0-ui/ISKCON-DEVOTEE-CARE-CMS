import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const INDIGO = [79, 70, 229];
const SLATE_900 = [15, 23, 42];
const SLATE_500 = [100, 116, 139];
const SLATE_200 = [226, 232, 240];
const SLATE_50 = [248, 250, 252];

const PAGE_MARGIN = 40;

function formatStatus(status) {
  if (!status) return '';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function buildSubtitle(subtitle, count) {
  if (subtitle) return subtitle;
  return `ISKCON Durgapur · ${count} devotee${count === 1 ? '' : 's'} · Generated ${new Date().toLocaleString()}`;
}

export function exportDevoteesPdf(devotees, { title = 'Devotee Directory', subtitle = '' } = {}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header band
  doc.setFillColor(...INDIGO);
  doc.rect(0, 0, pageWidth, 68, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(title, PAGE_MARGIN, 32);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(buildSubtitle(subtitle, devotees.length), PAGE_MARGIN, 50);

  // Table
  autoTable(doc, {
    startY: 88,
    head: [['Devotee ID', 'Full Name', 'Phone', 'Date of Birth', 'City', 'Status']],
    body: devotees.map((d) => [
      d.devotee_id || `ISK-DGP-${String(d.id).padStart(4, '0')}`,
      d.full_name || '',
      d.phone || '',
      d.dob || '',
      d.city || '—',
      formatStatus(d.status),
    ]),
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 6,
      textColor: SLATE_900,
      lineColor: SLATE_200,
      lineWidth: 0.5,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: INDIGO,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    alternateRowStyles: { fillColor: SLATE_50 },
    columnStyles: {
      0: { cellWidth: 95 },
      3: { cellWidth: 85 },
      5: { cellWidth: 65 },
    },
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN, bottom: 52 },
  });

  // Footer on every page
  const pageCount = doc.internal.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...SLATE_500);
    doc.text('ISKCON Durgapur CMS', PAGE_MARGIN, pageHeight - 22);
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - PAGE_MARGIN, pageHeight - 22, {
      align: 'right',
    });
  }

  const date = new Date().toISOString().slice(0, 10);
  doc.save(`devotees-${date}.pdf`);
}
