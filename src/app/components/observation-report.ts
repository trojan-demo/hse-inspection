import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {MatIconModule} from '@angular/material/icon';
import {DomSanitizer, SafeResourceUrl} from '@angular/platform-browser';
import {
  FIXED_PROJECT_NAME,
  FIXED_SITE_LOCATION,
} from '../data/hse-checklist';

import {
  HAZARD_CODE_OPTIONS,
  OBSERVATION_CATEGORIES,
  ObservationPhoto,
  ObservationReportSubmission,
  ObservationRow,
} from '../data/observation-report';
import {HseStore} from '../services/hse-store';
import {PdfExport} from '../services/pdf-export';
import {SignaturePad} from './signature-pad';

@Component({
  selector: 'app-observation-report',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatIconModule, SignaturePad],
  templateUrl: './observation-report.html',
})
export class ObservationReport {
  readonly store = inject(HseStore);
  private readonly pdfExport = inject(PdfExport);
  private readonly sanitizer = inject(DomSanitizer);

  readonly backToTemplates = output<void>();

  readonly hazardOptions = HAZARD_CODE_OPTIONS;
  readonly categoryOptions = OBSERVATION_CATEGORIES;
  readonly showHazardLegend = signal(true);

  readonly headerForm = new FormGroup({
    reportNo: new FormControl('', {nonNullable: true}),
    formCode: new FormControl('TGC/FRM/HSE/019', {nonNullable: true}),
    revision: new FormControl('Rev:-01', {nonNullable: true}),
    project: new FormControl(FIXED_PROJECT_NAME, {nonNullable: true}),
    location: new FormControl(FIXED_SITE_LOCATION, {nonNullable: true}),
    time: new FormControl('', {nonNullable: true}),
    preparedByJobTitle: new FormControl('', {nonNullable: true}),
    preparedByName: new FormControl('', {nonNullable: true}),
    preparedByCompany: new FormControl('', {nonNullable: true}),
    preparedByDate: new FormControl('', {nonNullable: true}),
    submittedToJobTitle: new FormControl('', {nonNullable: true}),
    submittedToName: new FormControl('', {nonNullable: true}),
    submittedToCompany: new FormControl('', {nonNullable: true}),
    submittedToDate: new FormControl('', {nonNullable: true}),
    footerPreparedByName: new FormControl('', {nonNullable: true}),
    footerPreparedByTitle: new FormControl('', {nonNullable: true}),
    footerApprovedByName: new FormControl('', {nonNullable: true}),
    footerApprovedByTitle: new FormControl('', {nonNullable: true}),
  });

  readonly preparedBySigImage = signal('');
  readonly submittedToSigImage = signal('');
  readonly footerPreparedBySigImage = signal('');
  readonly footerApprovedBySigImage = signal('');

  readonly preparedByNameSignal = signal('');
  readonly submittedToNameSignal = signal('');
  readonly footerPreparedByNameSignal = signal('');
  readonly footerApprovedByNameSignal = signal('');

  readonly observations = signal<ObservationRow[]>([this.createEmptyRow(1)]);

  readonly isGeneratingPdf = signal(false);
  readonly showSendModal = signal(false);
  readonly savedPdfFilename = signal('');
  readonly pdfPreviewUrl = signal<SafeResourceUrl | null>(null);
  private rawPreviewBlobUrl = '';
  readonly canNativeShare = signal(false);

  readonly whatsappUrl = computed(() =>
    this.store.generateObservationWhatsAppUrl(
      this.buildReportPayload(),
      this.savedPdfFilename() || undefined,
    ),
  );

  readonly mailtoUrl = computed(() =>
    this.store.generateObservationMailtoUrl(
      this.buildReportPayload(),
      this.savedPdfFilename() || undefined,
    ),
  );

  constructor() {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      this.canNativeShare.set(true);
    }

    this.headerForm.controls.preparedByName.valueChanges.subscribe((val) => {
      this.preparedByNameSignal.set(val);
    });
    this.headerForm.controls.submittedToName.valueChanges.subscribe((val) => {
      this.submittedToNameSignal.set(val);
    });
    this.headerForm.controls.footerPreparedByName.valueChanges.subscribe((val) => {
      this.footerPreparedByNameSignal.set(val);
    });
    this.headerForm.controls.footerApprovedByName.valueChanges.subscribe((val) => {
      this.footerApprovedByNameSignal.set(val);
    });
  }

  private createEmptyRow(index: number): ObservationRow {
    return {
      id: `obs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sn: String(index).padStart(2, '0'),
      hazardCode: '',
      secondaryHazardCode: '',
      photos: [],
      hazardHeading: '',
      hazardDetails: '',
      riskImpact: '',
      correctiveAction: '',
      responsiblePerson: '',
      category: '',
      completionDate: '',
    };
  }

  addObservationRow(): void {
    this.observations.update((rows) => [...rows, this.createEmptyRow(rows.length + 1)]);
  }

  removeObservationRow(rowId: string): void {
    this.observations.update((rows) => {
      if (rows.length <= 1) {
        return rows;
      }
      return rows
        .filter((r) => r.id !== rowId)
        .map((r, idx) => ({...r, sn: String(idx + 1).padStart(2, '0')}));
    });
  }

  updateRowField(
    rowId: string,
    field:
      | 'sn'
      | 'hazardCode'
      | 'secondaryHazardCode'
      | 'hazardHeading'
      | 'hazardDetails'
      | 'riskImpact'
      | 'correctiveAction'
      | 'responsiblePerson'
      | 'category'
      | 'completionDate',
    event: Event,
  ): void {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
    const value = target ? target.value : '';
    this.observations.update((rows) =>
      rows.map((r) => {
        if (r.id !== rowId) {
          return r;
        }
        const updated = {...r, [field]: value};
        if (field === 'hazardCode' && !value) {
          updated.secondaryHazardCode = '';
        }
        return updated;
      }),
    );
  }

  async onPhotosSelected(rowId: string, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const files = input?.files;
    if (!files || files.length === 0) {
      return;
    }

    const processed: ObservationPhoto[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files.item(i);
      if (!file || !file.type.startsWith('image/')) {
        continue;
      }
      try {
        const photo = await this.compressImageFile(file);
        processed.push(photo);
      } catch {
        // Skip unreadable image
      }
    }

    if (processed.length > 0) {
      this.observations.update((rows) =>
        rows.map((r) =>
          r.id === rowId ? {...r, photos: [...r.photos, ...processed]} : r,
        ),
      );
    }

    if (input) {
      input.value = '';
    }
  }

  removePhoto(rowId: string, photoId: string): void {
    this.observations.update((rows) =>
      rows.map((r) =>
        r.id === rowId
          ? {...r, photos: r.photos.filter((p) => p.id !== photoId)}
          : r,
      ),
    );
  }

  private compressImageFile(file: File): Promise<ObservationPhoto> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read image'));
      reader.onload = () => {
        const src = typeof reader.result === 'string' ? reader.result : '';
        if (!src) {
          reject(new Error('Empty image data'));
          return;
        }
        const img = new Image();
        img.onerror = () => reject(new Error('Invalid image'));
        img.onload = () => {
          const maxDim = 1100;
          let targetW = img.naturalWidth || 800;
          let targetH = img.naturalHeight || 600;
          if (targetW > maxDim || targetH > maxDim) {
            if (targetW >= targetH) {
              targetH = Math.round((targetH / targetW) * maxDim);
              targetW = maxDim;
            } else {
              targetW = Math.round((targetW / targetH) * maxDim);
              targetH = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({
              id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              name: file.name,
              dataUrl: src,
              width: img.naturalWidth || 800,
              height: img.naturalHeight || 600,
            });
            return;
          }
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, targetW, targetH);
          ctx.drawImage(img, 0, 0, targetW, targetH);
          const compressed = canvas.toDataURL('image/jpeg', 0.84);
          resolve({
            id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            dataUrl: compressed,
            width: targetW,
            height: targetH,
          });
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
    });
  }

  getCombinedHazardLabel(row: ObservationRow): string {
    if (!row.hazardCode) {
      return 'Unselected';
    }
    return row.secondaryHazardCode
      ? `${row.hazardCode}&${row.secondaryHazardCode}`
      : row.hazardCode;
  }

  buildReportPayload(): ObservationReportSubmission {
    const raw = this.headerForm.getRawValue();
    return {
      reportNo: raw.reportNo.trim(),
      formCode: raw.formCode.trim() || 'TGC/FRM/HSE/019',
      revision: raw.revision.trim() || 'Rev:-01',
      project: FIXED_PROJECT_NAME,
      location: FIXED_SITE_LOCATION,
      time: raw.time.trim(),
      preparedByJobTitle: raw.preparedByJobTitle.trim(),
      preparedByName: raw.preparedByName.trim(),
      preparedByCompany: raw.preparedByCompany.trim(),
      preparedBySignatureImage: this.preparedBySigImage() || undefined,
      preparedByDate: raw.preparedByDate,
      submittedToJobTitle: raw.submittedToJobTitle.trim(),
      submittedToName: raw.submittedToName.trim(),
      submittedToCompany: raw.submittedToCompany.trim(),
      submittedToSignatureImage: this.submittedToSigImage() || undefined,
      submittedToDate: raw.submittedToDate,
      observations: this.observations(),
      footerPreparedByName: raw.footerPreparedByName.trim(),
      footerPreparedByTitle: raw.footerPreparedByTitle.trim(),
      footerPreparedBySignatureImage: this.footerPreparedBySigImage() || undefined,
      footerApprovedByName: raw.footerApprovedByName.trim(),
      footerApprovedByTitle: raw.footerApprovedByTitle.trim(),
      footerApprovedBySignatureImage: this.footerApprovedBySigImage() || undefined,
    };
  }

  async openPdfPreview(): Promise<void> {
    this.isGeneratingPdf.set(true);
    try {
      const payload = this.buildReportPayload();
      if (this.rawPreviewBlobUrl) {
        URL.revokeObjectURL(this.rawPreviewBlobUrl);
      }
      this.savedPdfFilename.set(this.pdfExport.getObservationFilename(payload));
      const url = await this.pdfExport.getObservationPdfBlobUrl(payload);
      this.rawPreviewBlobUrl = url;
      this.pdfPreviewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
    } finally {
      this.isGeneratingPdf.set(false);
    }
  }

  closePdfPreview(): void {
    this.pdfPreviewUrl.set(null);
    if (this.rawPreviewBlobUrl) {
      URL.revokeObjectURL(this.rawPreviewBlobUrl);
      this.rawPreviewBlobUrl = '';
    }
  }

  async downloadPdf(): Promise<void> {
    this.isGeneratingPdf.set(true);
    try {
      const payload = this.buildReportPayload();
      const filename = await this.pdfExport.downloadObservationPdf(payload);
      this.savedPdfFilename.set(filename);
    } finally {
      this.isGeneratingPdf.set(false);
    }
  }

  openSendOptions(): void {
    const payload = this.buildReportPayload();
    this.savedPdfFilename.set(this.pdfExport.getObservationFilename(payload));
    this.showSendModal.set(true);
  }

  async shareNative(): Promise<void> {
    this.isGeneratingPdf.set(true);
    try {
      await this.pdfExport.shareObservationPdfNative(this.buildReportPayload());
    } finally {
      this.isGeneratingPdf.set(false);
    }
  }

  resetForm(): void {
    this.headerForm.reset({
      reportNo: '',
      formCode: 'TGC/FRM/HSE/019',
      revision: 'Rev:-01',
      project: '',
      location: '',
      time: '',
      preparedByJobTitle: '',
      preparedByName: '',
      preparedByCompany: '',
      preparedByDate: '',
      submittedToJobTitle: '',
      submittedToName: '',
      submittedToCompany: '',
      submittedToDate: '',
      footerPreparedByName: '',
      footerPreparedByTitle: '',
      footerApprovedByName: '',
      footerApprovedByTitle: '',
    });
    this.preparedBySigImage.set('');
    this.submittedToSigImage.set('');
    this.footerPreparedBySigImage.set('');
    this.footerApprovedBySigImage.set('');
    this.preparedByNameSignal.set('');
    this.submittedToNameSignal.set('');
    this.footerPreparedByNameSignal.set('');
    this.footerApprovedByNameSignal.set('');
    this.observations.set([this.createEmptyRow(1)]);
    this.savedPdfFilename.set('');
  }
}
