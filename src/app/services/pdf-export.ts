import {Injectable} from '@angular/core';
import {jsPDF} from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ChecklistCategory,
  FIXED_PROJECT_NAME,
  FIXED_SITE_LOCATION,
} from '../data/hse-checklist';
import {HseInspectionSubmission} from './hse-store';

interface JsPdfWithAutoTable extends jsPDF {
  lastAutoTable?: {
    finalY?: number;
  };
}

@Injectable({providedIn: 'root'})
export class PdfExport {
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
      tableBody.push([
        {
          content: `${cat.categoryCode}. ${cat.categoryName}`,
          colSpan: 4,
          styles: {
            fontStyle: 'bold',
            fillColor: [219, 234, 254], // soft sky blue
            textColor: [15, 76, 129],
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
}
