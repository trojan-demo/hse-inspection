import {Injectable} from '@angular/core';
import {jsPDF} from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ChecklistCategory,
  FIXED_PROJECT_NAME,
  FIXED_SITE_LOCATION,
} from '../data/hse-checklist';
import {
  HAZARD_CODE_OPTIONS,
  ObservationReportSubmission,
} from '../data/observation-report';

import {HseInspectionSubmission} from './hse-store';

interface JsPdfWithAutoTable extends jsPDF {
  lastAutoTable?: {
    finalY?: number;
  };
}

@Injectable({providedIn: 'root'})
export class PdfExport {
    private cachedLogoDataUrl: string | null = null;

  buildDocument(
    submission: HseInspectionSubmission,
    categories: ChecklistCategory[],
  ): jsPDF {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    }) as JsPdfWithAutoTable;

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 13;

    // Header band in clean Ocean Blue & Emerald Green on White
    doc.setFillColor(15, 76, 129); // #0F4C81
    doc.rect(margin, 10, pageWidth - margin * 2, 14, 'F');
    doc.setFillColor(5, 150, 105); // #059669 green accent stripe
    doc.rect(margin, 24, pageWidth - margin * 2, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text(
      'Daily Site HSE Inspection / Performance Evaluation',
      pageWidth / 2,
      19,
      {align: 'center'},
    );

    doc.setFontSize(7.6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 76, 129);
    doc.text(
      'Rating: 5 - Excellent | 4 - Good | 3 - Fair / Needs Improvement | 2 - Poor | 1 - Unsatisfactory | NA - Not Applicable',
      pageWidth / 2,
      30,
      {align: 'center'},
    );

    // Checklist table
    const tableBody: (string | Record<string, unknown>)[][] = [];
    let computedMarks = 0;
    let computedMax = 0;

    categories.forEach((cat) => {
         const allCategoryNa =
        cat.items.length > 0 &&
        cat.items.every((item) => submission.checklist[item.id] === 'NA');

      tableBody.push([
        {
          content: allCategoryNa
            ? `${cat.categoryCode}. ${cat.categoryName}  [NA]`
            : `${cat.categoryCode}. ${cat.categoryName}`,
          colSpan: 4,
          styles: {
            fontStyle: 'bold',
            fillColor: allCategoryNa ? [241, 245, 249] : [219, 234, 254],
            textColor: allCategoryNa ? [71, 85, 105] : [15, 76, 129],
          },
        },
      ]);

      cat.items.forEach((item) => {
        const rating = submission.checklist[item.id] || '';
        const remark = submission.remarks[item.id] || '';
        const numeric = Number(rating);
        if (!Number.isNaN(numeric) && numeric >= 1 && numeric <= 5) {
          computedMarks += numeric;
          computedMax += 5;
        }

        let ratingColor: [number, number, number] = [30, 41, 59];
        if (rating === '5' || rating === '4') {
          ratingColor = [4, 120, 87]; // emerald green
        } else if (rating === '3') {
          ratingColor = [15, 76, 129]; // ocean blue
        } else if (rating === '2' || rating === '1') {
          ratingColor = [185, 28, 28]; // crimson alert
        } else if (rating === 'NA') {
          ratingColor = [100, 116, 139];
        }

        tableBody.push([
          `${item.id}.`,
          item.text,
          {
            content: rating || '—',
            styles: {
              fontStyle: 'bold',
              halign: 'center',
              textColor: ratingColor,
            },
          },
          {
            content: remark,
            styles: {textColor: [51, 65, 85]},
          },
        ]);
      });
    });

    const totalMarks = submission.stats?.totalMarks ?? computedMarks;
    const maxMarks = submission.stats?.maxMarks ?? computedMax;
    const pct =
      submission.stats?.scorePercentage ??
      (maxMarks > 0 ? Math.round((totalMarks / maxMarks) * 100) : 100);

    tableBody.push([
      {
        content: 'Total Marks',
        colSpan: 2,
        styles: {
          fontStyle: 'bold',
          fillColor: [240, 253, 244],
          textColor: [15, 23, 42],
        },
      },
      {
        content: `${totalMarks} / ${maxMarks}`,
        styles: {
          fontStyle: 'bold',
          halign: 'center',
          fillColor: [240, 253, 244],
          textColor: [15, 76, 129],
        },
      },
      {
        content: `Overall Performance Score: ${pct}%`,
        styles: {
          fontStyle: 'bold',
          fillColor: [240, 253, 244],
          textColor: [4, 120, 87],
        },
      },
    ]);

    autoTable(doc, {
      startY: 33,
      margin: {left: margin, right: margin, bottom: 16},
      head: [
        [
          {content: 'Sl. No.', styles: {fontStyle: 'bold', halign: 'center'}},
          {content: 'HSE Inspection / Performance Criteria', styles: {fontStyle: 'bold'}},
          {content: 'Rating (1-5/NA)', styles: {fontStyle: 'bold', halign: 'center'}},
          {content: 'Remarks', styles: {fontStyle: 'bold'}},
        ],
      ],
      body: tableBody as never,
      theme: 'grid',
      styles: {
        fontSize: 7.2,
        cellPadding: 1.7,
        lineColor: [148, 163, 184],
        lineWidth: 0.2,
        textColor: [30, 41, 59],
        valign: 'middle',
      },
      headStyles: {
        fillColor: [15, 76, 129],
        textColor: [255, 255, 255],
        lineColor: [15, 76, 129],
        lineWidth: 0.25,
      },
      columnStyles: {
        0: {cellWidth: 13, halign: 'center'},
        1: {cellWidth: 97},
        2: {cellWidth: 23, halign: 'center'},
        3: {cellWidth: 'auto'},
      },
      didDrawPage: () => {
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(
          `${FIXED_PROJECT_NAME} · ${FIXED_SITE_LOCATION}`,
          margin,
          pageHeight - 7,
        );
        doc.text(
          `Page ${doc.getNumberOfPages()}`,
          pageWidth - margin,
          pageHeight - 7,
          {align: 'right'},
        );
      },
    });

    // Single Inspection Site Details & Signatures block below checklist
    const supervisorSigText = submission.supervisorSignature || submission.supervisorName || '—';
    const hsoSigText = submission.hsoSignature || submission.hsoName || '—';
    const afterTableY = (doc.lastAutoTable?.finalY ?? 200) + 5;
    const footerStartY = afterTableY > 230 ? (doc.addPage(), 15) : afterTableY;

    autoTable(doc, {
      startY: footerStartY,
      margin: {left: margin, right: margin},
      theme: 'grid',
      styles: {
        fontSize: 7.8,
        cellPadding: 2.5,
        lineColor: [100, 116, 139],
        lineWidth: 0.25,
        textColor: [15, 23, 42],
        valign: 'middle',
      },
      body: [
        [
          {
            content: `Project: ${submission.projectName || FIXED_PROJECT_NAME}`,
            styles: {fontStyle: 'bold', cellWidth: 92, fillColor: [248, 250, 252]},
          },
          {
            content: `Location: ${submission.siteLocation || FIXED_SITE_LOCATION}`,
            styles: {fontStyle: 'bold', cellWidth: 92, fillColor: [248, 250, 252]},
          },
        ],
        [
          {
            content: `Level/Zone: ${submission.levelZone || 'MAYAR'}`,
            styles: {fontStyle: 'bold'},
          },
          {
            content: `Date: ${submission.date || '—'}`,
            styles: {fontStyle: 'bold'},
          },
        ],
        [
          {
            content: `Task Supervisor Name: ${submission.supervisorName || '—'}`,
            styles: {fontStyle: 'bold'},
          },
          {
            content: `Signature: ${supervisorSigText}`,
            styles: {
              fontStyle: 'bold',
              textColor: [4, 120, 87],
              minCellHeight: submission.supervisorSignatureImage ? 14 : 7,
            },
          },
        ],
        [
          {
            content: `HSO/I Name: ${submission.hsoName || '—'}`,
            styles: {fontStyle: 'bold'},
          },
          {
            content: `Signature: ${hsoSigText}`,
            styles: {
              fontStyle: 'bold',
              textColor: [15, 76, 129],
              minCellHeight: submission.hsoSignatureImage ? 14 : 7,
            },
          },
        ],
        [
          {
            content: `PPE Adherence: ${submission.ppeAdherence === 'Yes' ? '[X] Yes  [ ] No' : '[ ] Yes  [X] No'}   |   Total Marks: ${totalMarks}/${maxMarks} (${pct}%)   |   NA Items: ${submission.stats?.naCount ?? 0}`,
            colSpan: 2,
            styles: {fontSize: 7.5, fillColor: [248, 250, 252]},
          },
        ],
        [
          {
            content: `Corrective Actions / Overall Remarks: ${submission.correctiveActions || 'Site safety conditions verified according to ISO 45001 standards.'}`,
            colSpan: 2,
            styles: {fontSize: 7.5, textColor: [51, 65, 85]},
          },
        ],
      ],
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 1) {
          if (data.row.index === 2 && submission.supervisorSignatureImage) {
            try {
              doc.addImage(
                submission.supervisorSignatureImage,
                'PNG',
                data.cell.x + 24,
                data.cell.y + 4.5,
                28,
                8.5,
              );
            } catch {
              // Ignore
            }
          }
          if (data.row.index === 3 && submission.hsoSignatureImage) {
            try {
              doc.addImage(
                submission.hsoSignatureImage,
                'PNG',
                data.cell.x + 24,
                data.cell.y + 4.5,
                28,
                8.5,
              );
            } catch {
              // Ignore
            }
          }
        }
      },
    });

    return doc;
  }

  getFilename(submission: HseInspectionSubmission): string {
    const cleanDate = (submission.date || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
    const cleanZone = (submission.levelZone || 'SITE').replace(/[^a-zA-Z0-9_-]/g, '');
    const cleanSup = (submission.supervisorName || 'SUP')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 20);
    return `HSE_Inspection_${cleanDate}_${cleanZone}_${cleanSup}.pdf`;
  }

  downloadPdf(
    submission: HseInspectionSubmission,
    categories: ChecklistCategory[],
  ): string {
    const doc = this.buildDocument(submission, categories);
    const filename = this.getFilename(submission);
    doc.save(filename);
    return filename;
  }

  getPdfBlobUrl(
    submission: HseInspectionSubmission,
    categories: ChecklistCategory[],
  ): string {
    const doc = this.buildDocument(submission, categories);
    const blob = doc.output('blob');
    return URL.createObjectURL(blob);
  }

  async sharePdfNative(
    submission: HseInspectionSubmission,
    categories: ChecklistCategory[],
  ): Promise<boolean> {
    if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
      return false;
    }
    try {
      const doc = this.buildDocument(submission, categories);
      const blob = doc.output('blob');
      const filename = this.getFilename(submission);
      const file = new File([blob], filename, {type: 'application/pdf'});
      if (navigator.canShare && navigator.canShare({files: [file]})) {
        await navigator.share({
          title: 'Daily Site HSE Inspection Report',
          text: `${submission.projectName} · ${submission.levelZone} (${submission.date})`,
          files: [file],
        });
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }
  private async loadLogoDataUrl(): Promise<string | undefined> {
    if (this.cachedLogoDataUrl) {
      return this.cachedLogoDataUrl;
    }
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return undefined;
    }
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const loaded = await new Promise<HTMLImageElement>((resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load logo'));
        img.src = 'trojanlogo.png';
      });
      const canvas = document.createElement('canvas');
      canvas.width = loaded.naturalWidth || 200;
      canvas.height = loaded.naturalHeight || 200;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return undefined;
      }
      ctx.drawImage(loaded, 0, 0);
      this.cachedLogoDataUrl = canvas.toDataURL('image/png');
      return this.cachedLogoDataUrl;
    } catch {
      return undefined;
    }
  }

  private drawObservationPageHeader(
    doc: JsPdfWithAutoTable,
    reportNo: string,
    logoDataUrl?: string,
  ): void {
    const margin = 10;
    const usableW = doc.internal.pageSize.getWidth() - margin * 2; // 277mm
    const topY = 8;
    const totalH = 16.5;
    const logoW = 28;
    const reportNoW = 55;
    const centerW = usableW - logoW;

    // Outer frame
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.3);
    doc.rect(margin, topY, usableW, totalH);

    // Logo box
    doc.line(margin + logoW, topY, margin + logoW, topY + totalH);
    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, 'PNG', margin + 6.5, topY + 1, 15, 14.5);
      } catch {
        // Ignore logo error
      }
    }

    // 3 Title rows
    const rowH = totalH / 3;
    doc.line(margin + logoW, topY + rowH, margin + usableW, topY + rowH);
    doc.line(margin + logoW, topY + rowH * 2, margin + usableW, topY + rowH * 2);

    // Report No divider on bottom row
    const reportBoxX = margin + usableW - reportNoW;
    doc.line(reportBoxX, topY + rowH * 2, reportBoxX, topY + totalH);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9.5);
    doc.text(
      'TROJAN GENERAL CONTRACTING LLC',
      margin + logoW + centerW / 2,
      topY + 4.1,
      {align: 'center'},
    );
    doc.setFontSize(8.8);
    doc.text(
      'HEALTH, SAFETY AND ENVIRONMENT',
      margin + logoW + centerW / 2,
      topY + rowH + 4.0,
      {align: 'center'},
    );

    const titleCenterW = centerW - reportNoW;
    doc.setFontSize(9.2);
    doc.setTextColor(15, 76, 129);
    doc.text(
      'HSE OBSERVATION REPORT',
      margin + logoW + titleCenterW / 2,
      topY + rowH * 2 + 4.1,
      {align: 'center'},
    );

    doc.setFontSize(8.2);
    doc.setTextColor(15, 23, 42);
    doc.text(
      `Report No.: ${reportNo || '—'}`,
      reportBoxX + 2.5,
      topY + rowH * 2 + 4.0,
    );
  }

  buildObservationDocument(
    report: ObservationReportSubmission,
    logoDataUrl?: string,
  ): jsPDF {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    }) as JsPdfWithAutoTable;

    const pageWidth = doc.internal.pageSize.getWidth(); // 297
    const pageHeight = doc.internal.pageSize.getHeight(); // 210
    const margin = 10;

    // 1. Project / Routing / Signatures Header Table
    autoTable(doc, {
      startY: 26.5,
      margin: {left: margin, right: margin, top: 26.5, bottom: 13},
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 1.8,
        lineColor: [51, 65, 85],
        lineWidth: 0.25,
        textColor: [15, 23, 42],
        valign: 'middle',
      },
      body: [
        [
          {
            content: `Project: ${report.project || '—'}`,
            colSpan: 3,
            styles: {fontStyle: 'bold', fillColor: [248, 250, 252]},
          },
          {
            content: `Location: ${report.location || '—'}`,
            colSpan: 2,
            styles: {fontStyle: 'bold', fillColor: [248, 250, 252]},
          },
          {
            content: `Time: ${report.time || '—'}`,
            styles: {fontStyle: 'bold', fillColor: [248, 250, 252]},
          },
        ],
        [
          {content: 'REPORT', styles: {fontStyle: 'bold', fillColor: [219, 234, 254], textColor: [15, 76, 129]}},
          {content: 'JOB TITLE/ DESIGNATION', styles: {fontStyle: 'bold', fillColor: [219, 234, 254], textColor: [15, 76, 129]}},
          {content: 'NAME', styles: {fontStyle: 'bold', fillColor: [219, 234, 254], textColor: [15, 76, 129]}},
          {content: 'COMPANY', styles: {fontStyle: 'bold', fillColor: [219, 234, 254], textColor: [15, 76, 129]}},
          {content: 'SIGNATURE', styles: {fontStyle: 'bold', halign: 'center', fillColor: [219, 234, 254], textColor: [15, 76, 129]}},
          {content: 'DATE', styles: {fontStyle: 'bold', halign: 'center', fillColor: [219, 234, 254], textColor: [15, 76, 129]}},
        ],
        [
          {content: 'PREPARED BY:', styles: {fontStyle: 'bold'}},
          report.preparedByJobTitle || '—',
          report.preparedByName || '—',
          report.preparedByCompany || '—',
          {
            content: report.preparedBySignatureImage
              ? ''
              : (report.preparedByName || '—'),
            styles: {
              halign: 'center',
              fontStyle: 'italic',
              textColor: [15, 76, 129],
              minCellHeight: report.preparedBySignatureImage ? 11 : 6,
            },
          },
          {content: report.preparedByDate || '—', styles: {halign: 'center'}},
        ],
        [
          {content: 'SUBMITTED TO:', styles: {fontStyle: 'bold'}},
          report.submittedToJobTitle || '—',
          report.submittedToName || '—',
          report.submittedToCompany || '—',
          {
            content: report.submittedToSignatureImage
              ? ''
              : (report.submittedToName || '—'),
            styles: {
              halign: 'center',
              fontStyle: 'italic',
              textColor: [4, 120, 87],
              minCellHeight: report.submittedToSignatureImage ? 11 : 6,
            },
          },
          {content: report.submittedToDate || '—', styles: {halign: 'center'}},
        ],
      ],
      columnStyles: {
        0: {cellWidth: 34},
        1: {cellWidth: 52},
        2: {cellWidth: 68},
        3: {cellWidth: 36},
        4: {cellWidth: 55},
        5: {cellWidth: 32},
      },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          if (data.row.index === 2 && report.preparedBySignatureImage) {
            try {
              doc.addImage(
                report.preparedBySignatureImage,
                'PNG',
                data.cell.x + 12,
                data.cell.y + 1.2,
                30,
                8.5,
              );
            } catch {
              // Ignore
            }
          }
          if (data.row.index === 3 && report.submittedToSignatureImage) {
            try {
              doc.addImage(
                report.submittedToSignatureImage,
                'PNG',
                data.cell.x + 12,
                data.cell.y + 1.2,
                30,
                8.5,
              );
            } catch {
              // Ignore
            }
          }
        }
      },
    });

    // 2. Hazard Code Reference Strip (A–S)
    const hazardCodesRow = HAZARD_CODE_OPTIONS.map((h) => ({
      content: `${h.code}.`,
      styles: {fontStyle: 'bold' as const, halign: 'center' as const, fillColor: [241, 245, 249] as [number, number, number]},
    }));
    const hazardLabelsRow = HAZARD_CODE_OPTIONS.map((h) => ({
      content: h.label,
      styles: {fontSize: 5.1, halign: 'center' as const, cellPadding: 1},
    }));

    autoTable(doc, {
      startY: (doc.lastAutoTable?.finalY ?? 56) + 2,
      margin: {left: margin, right: margin, top: 26.5, bottom: 13},
      theme: 'grid',
      styles: {
        fontSize: 6.2,
        cellPadding: 1.1,
        lineColor: [71, 85, 105],
        lineWidth: 0.2,
        textColor: [15, 23, 42],
        valign: 'middle',
      },
      body: [
        [
          {
            content: 'HAZARD CODE',
            colSpan: 19,
            styles: {
              fontStyle: 'bold',
              fontSize: 6.8,
              fillColor: [219, 234, 254],
              textColor: [15, 76, 129],
            },
          },
        ],
        hazardCodesRow,
        hazardLabelsRow,
      ] as never,
    });

    // 3. Main Observation Table
    const observationRows = report.observations.length > 0 ? report.observations : [];
    const tableBody = observationRows.map((row, idx) => {
      const codeCombined = row.secondaryHazardCode
        ? `${row.hazardCode || '—'}&${row.secondaryHazardCode}`
        : (row.hazardCode || '—');

      const hazardsFull = [row.hazardHeading.trim(), row.hazardDetails.trim()]
        .filter(Boolean)
        .join('\n\n');

      let categoryColor: [number, number, number] = [15, 23, 42];
      if (row.category === 'High') {
        categoryColor = [185, 28, 28];
      } else if (row.category === 'Medium') {
        categoryColor = [180, 83, 9];
      } else if (row.category === 'Low') {
        categoryColor = [4, 120, 87];
      }

      const photoCount = row.photos.length;
      const minPhotoCellH = photoCount === 0 ? 18 : photoCount === 1 ? 44 : Math.min(photoCount, 3) * 34;

      return [
        {
          content: row.sn || String(idx + 1).padStart(2, '0'),
          styles: {halign: 'center', fontStyle: 'bold'},
        },
        {
          content: codeCombined,
          styles: {halign: 'center', fontStyle: 'bold', textColor: [15, 76, 129]},
        },
        {
          content: photoCount === 0 ? 'No photo attached' : '',
          styles: {
            halign: 'center',
            textColor: [148, 163, 184],
            minCellHeight: minPhotoCellH,
          },
        },
        {
          content: hazardsFull || '—',
          styles: {
            textColor: row.hazardHeading.trim() ? [153, 27, 27] : [30, 41, 59],
          },
        },
        row.riskImpact.trim() || '—',
        row.correctiveAction.trim() || '—',
        {
          content: row.responsiblePerson.trim() || '—',
          styles: {halign: 'center'},
        },
        {
          content: row.category || '—',
          styles: {halign: 'center', fontStyle: 'bold', textColor: categoryColor},
        },
        {
          content: row.completionDate || '—',
          styles: {halign: 'center'},
        },
      ];
    });

    autoTable(doc, {
      startY: (doc.lastAutoTable?.finalY ?? 76) + 2.5,
      margin: {left: margin, right: margin, top: 26.5, bottom: 13},
      head: [
        [
          {content: 'SN', styles: {halign: 'center'}},
          {content: 'Hazard\ncode', styles: {halign: 'center'}},
          {content: 'PHOTO\n(Initial Inspection)', styles: {halign: 'center'}},
          {
            content:
              'HAZARDS/ ASPECTS\n(Unsafe Action/ condition/ Plant /Tools/ equipment/ Environmental)',
            styles: {halign: 'center'},
          },
          {content: 'RISK/\nIMPACT', styles: {halign: 'center'}},
          {content: 'RECOMMENDED\nCORRECTIVE ACTION', styles: {halign: 'center'}},
          {content: 'RESPONSIBLE\nPERSON', styles: {halign: 'center'}},
          {
            content: 'CATEGORY\n1 (High) Immediate\n2 (Medium) a day\n3 (Low) in a week',
            styles: {halign: 'center', fontSize: 6.0},
          },
          {content: 'DATE\n(To be completed)', styles: {halign: 'center'}},
        ],
      ],
      body: tableBody as never,
      theme: 'grid',
      styles: {
        fontSize: 7.0,
        cellPadding: 2.0,
        lineColor: [71, 85, 105],
        lineWidth: 0.25,
        textColor: [15, 23, 42],
        valign: 'middle',
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [219, 234, 254],
        textColor: [15, 76, 129],
        fontStyle: 'bold',
        fontSize: 6.7,
        lineColor: [51, 65, 85],
        lineWidth: 0.25,
      },
      columnStyles: {
        0: {cellWidth: 9},
        1: {cellWidth: 14},
        2: {cellWidth: 68},
        3: {cellWidth: 48},
        4: {cellWidth: 38},
        5: {cellWidth: 48},
        6: {cellWidth: 20},
        7: {cellWidth: 15},
        8: {cellWidth: 17},
      },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 2) {
          const row = observationRows[data.row.index];
          if (!row || row.photos.length === 0) {
            return;
          }
          const photos = row.photos.slice(0, 3);
          const pad = 2;
          const availW = data.cell.width - pad * 2;
          const availH = data.cell.height - pad * 2;
          const gap = photos.length > 1 ? 1.5 : 0;
          const slotH = (availH - gap * (photos.length - 1)) / photos.length;

          photos.forEach((photo, idx) => {
            const natRatio = photo.width > 0 && photo.height > 0 ? photo.width / photo.height : 4 / 3;
            let drawW = availW;
            let drawH = drawW / natRatio;
            if (drawH > slotH) {
              drawH = slotH;
              drawW = drawH * natRatio;
            }
            const x = data.cell.x + (data.cell.width - drawW) / 2;
            const slotTop = data.cell.y + pad + idx * (slotH + gap);
            const y = slotTop + (slotH - drawH) / 2;
            try {
              const format = photo.dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
              doc.addImage(photo.dataUrl, format, x, y, drawW, drawH);
            } catch {
              // Ignore broken image
            }
          });
        }
      },
    });

    // 4. Bottom Sign-Off Block (Prepared By/TGC & Approved By/TGC)
    const afterObsY = (doc.lastAutoTable?.finalY ?? 150) + 5;
    const signOffStartY = afterObsY > pageHeight - 42 ? (doc.addPage(), 28) : afterObsY;

    autoTable(doc, {
      startY: signOffStartY,
      margin: {left: margin, right: margin, top: 26.5, bottom: 13},
      theme: 'grid',
      styles: {
        fontSize: 8.0,
        cellPadding: 3.0,
        lineColor: [51, 65, 85],
        lineWidth: 0.25,
        textColor: [15, 23, 42],
        valign: 'middle',
      },
      head: [
        [
          {content: '', styles: {fillColor: [219, 234, 254]}},
          {content: 'Name', styles: {halign: 'center', fontStyle: 'bold', fillColor: [219, 234, 254], textColor: [15, 76, 129]}},
          {content: 'Title/Position', styles: {halign: 'center', fontStyle: 'bold', fillColor: [219, 234, 254], textColor: [15, 76, 129]}},
          {content: 'Signature', styles: {halign: 'center', fontStyle: 'bold', fillColor: [219, 234, 254], textColor: [15, 76, 129]}},
        ],
      ],
      body: [
        [
          {content: 'Prepared By/TGC', styles: {fontStyle: 'bold', fillColor: [241, 245, 249]}},
          {content: report.footerPreparedByName || report.preparedByName || '—', styles: {halign: 'center'}},
          {content: report.footerPreparedByTitle || report.preparedByJobTitle || '—', styles: {halign: 'center'}},
          {
            content: report.footerPreparedBySignatureImage
              ? ''
              : (report.footerPreparedByName || report.preparedByName || '—'),
            styles: {
              halign: 'center',
              fontStyle: 'italic',
              textColor: [15, 76, 129],
              minCellHeight: report.footerPreparedBySignatureImage ? 14 : 9,
            },
          },
        ],
        [
          {content: 'Approved By/TGC', styles: {fontStyle: 'bold', fillColor: [241, 245, 249]}},
          {content: report.footerApprovedByName || '—', styles: {halign: 'center'}},
          {content: report.footerApprovedByTitle || '—', styles: {halign: 'center'}},
          {
            content: report.footerApprovedBySignatureImage
              ? ''
              : (report.footerApprovedByName || '—'),
            styles: {
              halign: 'center',
              fontStyle: 'italic',
              textColor: [4, 120, 87],
              minCellHeight: report.footerApprovedBySignatureImage ? 14 : 9,
            },
          },
        ],
      ],
      columnStyles: {
        0: {cellWidth: 46},
        1: {cellWidth: 85},
        2: {cellWidth: 76},
        3: {cellWidth: 70},
      },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          if (data.row.index === 0 && report.footerPreparedBySignatureImage) {
            try {
              doc.addImage(
                report.footerPreparedBySignatureImage,
                'PNG',
                data.cell.x + 18,
                data.cell.y + 1.8,
                34,
                10,
              );
            } catch {
              // Ignore
            }
          }
          if (data.row.index === 1 && report.footerApprovedBySignatureImage) {
            try {
              doc.addImage(
                report.footerApprovedBySignatureImage,
                'PNG',
                data.cell.x + 18,
                data.cell.y + 1.8,
                34,
                10,
              );
            } catch {
              // Ignore
            }
          }
        }
      },
    });

    // Stamp consistent header & Page X of Y footer across every page
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      this.drawObservationPageHeader(doc, report.reportNo, logoDataUrl);
      doc.setDrawColor(100, 116, 139);
      doc.setLineWidth(0.4);
      doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(report.formCode || 'TGC/FRM/HSE/019', margin, pageHeight - 5.5);
      doc.setFont('helvetica', 'bold');
      doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 5.5, {
        align: 'center',
      });
      doc.setFont('helvetica', 'normal');
      doc.text(report.revision || 'Rev:-01', pageWidth - margin, pageHeight - 5.5, {
        align: 'right',
      });
    }

    return doc;
  }

  getObservationFilename(report: ObservationReportSubmission): string {
    const cleanNo = (report.reportNo || 'DRAFT').replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanDate = (report.preparedByDate || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
    return `HSE_Observation_Report_${cleanNo}_${cleanDate}.pdf`;
  }

  async downloadObservationPdf(report: ObservationReportSubmission): Promise<string> {
    const logo = await this.loadLogoDataUrl();
    const doc = this.buildObservationDocument(report, logo);
    const filename = this.getObservationFilename(report);
    doc.save(filename);
    return filename;
  }

  async getObservationPdfBlobUrl(report: ObservationReportSubmission): Promise<string> {
    const logo = await this.loadLogoDataUrl();
    const doc = this.buildObservationDocument(report, logo);
    const blob = doc.output('blob');
    return URL.createObjectURL(blob);
  }

  async shareObservationPdfNative(report: ObservationReportSubmission): Promise<boolean> {
    if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
      return false;
    }
    try {
      const logo = await this.loadLogoDataUrl();
      const doc = this.buildObservationDocument(report, logo);
      const blob = doc.output('blob');
      const filename = this.getObservationFilename(report);
      const file = new File([blob], filename, {type: 'application/pdf'});
      if (navigator.canShare && navigator.canShare({files: [file]})) {
        await navigator.share({
          title: `HSE Observation Report ${report.reportNo || ''}`.trim(),
          text: `${report.project || 'Trojan Construction'} · ${report.location || ''}`.trim(),
          files: [file],
        });
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }
}
