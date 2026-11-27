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

export async function exportDevoteesPdf(devotees, { title = 'Devotee Directory', subtitle = '' } = {}) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
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
    head: [['S.NO.', 'Devotee ID', 'Name (Initiated Name)', 'Mobile', 'Date of Birth', 'Address']],
    body: devotees.map((d, idx) => {
      const initName = d.initiated_name || d.spiritual_name || '';
      const nameWithInit = initName
        ? `${d.full_name || ''} (${initName})`
        : d.full_name || '';
      const addr = d.full_address || d.address || '';
      const city = d.town_city || d.city || '';
      const fullAddr =
        addr && city && !addr.toLowerCase().includes(city.toLowerCase())
          ? `${addr}, ${city}`
          : addr || city || '—';
      return [
        String(d.sl_no ?? idx + 1),
        d.devotee_id || `ISK-DGP-${String(d.id).padStart(4, '0')}`,
        nameWithInit,
        d.contact_no || d.phone || '',
        d.dob || '',
        fullAddr,
      ];
    }),
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
      0: { cellWidth: 38, halign: 'center' },
      1: { cellWidth: 85 },
      3: { cellWidth: 75 },
      4: { cellWidth: 72 },
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

function formatReadableDate(raw) {
  if (!raw) return '';
  const dt = new Date(raw);
  if (!Number.isNaN(dt.getTime())) {
    const day = dt.getDate();
    const month = dt.toLocaleString('en-US', { month: 'long' });
    const year = dt.getFullYear();
    return `${day} ${month}, ${year}`;
  }
  return String(raw);
}

export async function exportCelebrationPdf({
  subtitle,
  dateColumnLabel,
  rows,
  filename,
}) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 28;
  const maroon = [153, 27, 27];

  const generatedStr = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Title & Subtitle (Left)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...maroon);
  doc.text('ISKCON Durgapur — Seva Portal', margin, 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...SLATE_500);
  doc.text(subtitle, margin, 51);

  // Metadata (Right)
  doc.setFontSize(8.5);
  doc.setTextColor(...SLATE_900);
  doc.text(`Generated: ${generatedStr}`, pageWidth - margin, 34, {
    align: 'right',
  });
  doc.text(`Records: ${rows.length}`, pageWidth - margin, 48, {
    align: 'right',
  });

  // Maroon divider line
  doc.setDrawColor(...maroon);
  doc.setLineWidth(1.2);
  doc.line(margin, 60, pageWidth - margin, 60);

  autoTable(doc, {
    startY: 70,
    head: [['S.NO.', 'DEVOTEE NAME', dateColumnLabel, 'PHONE', 'ADDRESS']],
    body: rows.map((r, idx) => [
      String(idx + 1),
      r.name,
      formatReadableDate(r.date),
      r.phone || '',
      r.address || '',
    ]),
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: { top: 5, right: 6, bottom: 5, left: 6 },
      textColor: SLATE_900,
      lineColor: [203, 213, 225],
      lineWidth: 0.5,
      valign: 'middle',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: SLATE_900,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
      lineColor: [203, 213, 225],
      lineWidth: 0.5,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 36, halign: 'center' },
      1: { cellWidth: 150 },
      2: { cellWidth: 92, halign: 'center' },
      3: { cellWidth: 72, halign: 'center' },
    },
    margin: { left: margin, right: margin, bottom: 36 },
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...SLATE_500);
    doc.text(`${page}/${pageCount}`, pageWidth - margin, pageHeight - 16, {
      align: 'right',
    });
  }

  doc.save(filename);
}
