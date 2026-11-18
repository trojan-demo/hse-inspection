import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {MatIconModule} from '@angular/material/icon';
import {DomSanitizer, SafeResourceUrl} from '@angular/platform-browser';
import {ActivatedRoute} from '@angular/router';
import {ObservationReport} from '../components/observation-report';
import {SignaturePad} from '../components/signature-pad';
import {
  FIXED_PROJECT_NAME,
  FIXED_SITE_LOCATION,
  LEVEL_ZONE_OPTIONS,
  TASK_SUPERVISOR_LIST,
} from '../data/hse-checklist';
import {HseInspectionSubmission, HseStore} from '../services/hse-store';
import {PdfExport} from '../services/pdf-export';

@Component({
  selector: 'app-inspection-portal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatIconModule, SignaturePad,ObservationReport],
  templateUrl: './inspection-portal.html',
})
export class InspectionPortal {
  readonly store = inject(HseStore);
  private readonly pdfExport = inject(PdfExport);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly route = inject(ActivatedRoute);

  readonly fixedProject = FIXED_PROJECT_NAME;
  readonly fixedLocation = FIXED_SITE_LOCATION;
  readonly levelZoneOptions = LEVEL_ZONE_OPTIONS;
  readonly supervisorList = TASK_SUPERVISOR_LIST;
  readonly ratingOptions = ['1', '2', '3', '4', '5', 'NA'];

  readonly activeTab = signal<'active-form' | 'submissions' | 'forms-catalog' | 'observation-form'>('active-form');
  readonly checklistAnswers = signal<Record<string, string>>({});
  readonly checklistRemarks = signal<Record<string, string>>({});
  readonly supervisorSignatureImage = signal('');
  readonly hsoSignatureImage = signal('');
  readonly validationMessage = signal('');

  readonly submittedRecord = signal<HseInspectionSubmission | null>(null);
  readonly showDispatchModal = signal(false);
  readonly savedPdfFilename = signal('');
  readonly pdfPreviewUrl = signal<SafeResourceUrl | null>(null);
  private rawPreviewBlobUrl = '';
  private previewRecord: HseInspectionSubmission | null = null;

  readonly canNativeShare = signal(false);

  readonly inspectionForm = new FormGroup({
    projectName: new FormControl(FIXED_PROJECT_NAME, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    siteLocation: new FormControl(FIXED_SITE_LOCATION, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    levelZone: new FormControl<string>('MAYAR', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    date: new FormControl(new Date().toISOString().split('T')[0], {
      nonNullable: true,
      validators: [Validators.required],
    }),
    supervisorName: new FormControl(TASK_SUPERVISOR_LIST[0].name, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    hsoName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    ppeAdherence: new FormControl<'Yes' | 'No'>('Yes', {
      nonNullable: true,
    }),
    correctiveActions: new FormControl('', {nonNullable: true}),
  });

  

  readonly supervisorNameSignal = signal(TASK_SUPERVISOR_LIST[0].name);
  readonly hsoNameSignal = signal('');

  readonly supervisorSignatureText = computed(() => this.supervisorNameSignal().trim());
  readonly hsoSignatureText = computed(() => this.hsoNameSignal().trim());

  readonly stats = computed(() => {
    const answers = this.checklistAnswers();
    const remarks = this.checklistRemarks();
    let total = 0;
    let ratedCount = 0;
    let naCount = 0;
    let unratedCount = 0;
    let totalMarks = 0;
    let maxMarks = 0;
    let remarksCount = 0;
    const flaggedItems: string[] = [];

    this.store.checklistCategories.forEach((cat) => {
      cat.items.forEach((item) => {
        total++;
        const rating = answers[item.id] || '';
        if (remarks[item.id]?.trim()) {
          remarksCount++;
        }
        if (rating === 'NA') {
          naCount++;
        } else if (rating === '') {
          unratedCount++;
        } else {
          const num = Number(rating);
          if (!Number.isNaN(num) && num >= 1 && num <= 5) {
            ratedCount++;
            totalMarks += num;
            maxMarks += 5;
            if (num <= 2) {
              flaggedItems.push(`#${item.id} (${rating}/5) - ${item.text}`);
            }
          }
        }
      });
    });

    const scorePercentage = maxMarks > 0 ? Math.round((totalMarks / maxMarks) * 100) : 100;
    return {
      total,
      ratedCount,
      naCount,
      unratedCount,
      totalMarks,
      maxMarks,
      scorePercentage,
      remarksCount,
      flaggedItems,
    };
  });

  constructor() {
    this.initChecklistAnswers();
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      this.canNativeShare.set(true);
    }

    const zoneParam = this.route.snapshot.queryParamMap.get('zone');
    if (zoneParam === 'MAYAR' || zoneParam === 'THORAYA') {
      this.inspectionForm.controls.levelZone.setValue(zoneParam);
    }

    this.inspectionForm.controls.supervisorName.valueChanges.subscribe((val) => {
      this.supervisorNameSignal.set(val);
    });
    this.inspectionForm.controls.hsoName.valueChanges.subscribe((val) => {
      this.hsoNameSignal.set(val);
    });
  }

  private initChecklistAnswers(): void {
    const defaults: Record<string, string> = {};
    this.store.checklistCategories.forEach((cat) => {
      cat.items.forEach((item) => {
        defaults[item.id] = '5';
      });
    });
    this.checklistAnswers.set(defaults);
    this.checklistRemarks.set({});
  }

  // onSupervisorChanged(): void {
  //   const selected = this.inspectionForm.controls.supervisorName.value;
  //   this.supervisorNameSignal.set(selected);
  // }

  setAnswer(itemId: string, rating: string): void {
    this.checklistAnswers.update((curr) => ({...curr, [itemId]: rating}));
  }

  onRemarkInput(itemId: string, event: Event): void {
    const target = event.target as HTMLInputElement | null;
    const value = target ? target.value : '';
    this.checklistRemarks.update((curr) => ({...curr, [itemId]: value}));
  }

  markAll(value: string): void {
    const next: Record<string, string> = {};
    this.store.checklistCategories.forEach((cat) => {
      cat.items.forEach((item) => {
        next[item.id] = value;
      });
    });
    this.checklistAnswers.set(next);
    if (value === '') {
      this.checklistRemarks.set({});
    }
  }

  isSectionAllNa(category: {items: {id: string}[]}): boolean {
    const answers = this.checklistAnswers();
    return category.items.length > 0 && category.items.every((item) => answers[item.id] === 'NA');
  }

  toggleSectionNa(category: {items: {id: string}[]}): void {
    const allNa = this.isSectionAllNa(category);
    const nextValue = allNa ? '5' : 'NA';
    this.checklistAnswers.update((curr) => {
      const updated = {...curr};
      category.items.forEach((item) => {
        updated[item.id] = nextValue;
      });
      return updated;
    });
  }

  getCategoryScoreLabel(category: {items: {id: string}[]}): string {
    if (this.isSectionAllNa(category)) {
      return 'Section NA';
    }
    const answers = this.checklistAnswers();
    let earned = 0;
    let possible = 0;
    let naItems = 0;
    category.items.forEach((item) => {
      const val = answers[item.id] || '';
      if (val === 'NA') {
        naItems++;
      } else {
        const num = Number(val);
        if (!Number.isNaN(num) && num >= 1 && num <= 5) {
          earned += num;
          possible += 5;
        }
      }
    });
    if (possible === 0) {
      return naItems > 0 ? 'NA' : `${category.items.length} items`;
    }
    return `${earned} / ${possible} marks`;
  }
  getRatingButtonClass(current: string | undefined, option: string): string {
    if (current !== option) {
      return 'bg-white text-slate-600 border-slate-300 hover:border-blue-400 hover:text-blue-900';
    }
    switch (option) {
      case '5':
        return 'bg-emerald-600 text-white border-emerald-700';
      case '4':
        return 'bg-teal-600 text-white border-teal-700';
      case '3':
        return 'bg-blue-700 text-white border-blue-800';
      case '2':
        return 'bg-amber-600 text-white border-amber-700';
      case '1':
        return 'bg-red-600 text-white border-red-700';
      case 'NA':
        return 'bg-slate-600 text-white border-slate-700';
      default:
        return 'bg-white text-slate-600 border-slate-300';
    }
  }

  buildSubmissionObject(): HseInspectionSubmission {
    const raw = this.inspectionForm.getRawValue();
    const matchedSup = this.supervisorList.find((s) => s.name === raw.supervisorName);
    const currentStats = this.stats();
    const hsoTrimmed = raw.hsoName.trim();

    return {
      id: `HSE-${Date.now()}`,
      timestamp: new Date().toISOString(),
      formTitle: 'Daily Site HSE Inspection / Performance Evaluation',
      formCode: 'HSE-FRM-01',
      projectName: FIXED_PROJECT_NAME,
      siteLocation: FIXED_SITE_LOCATION,
      levelZone: raw.levelZone,
      date: raw.date,
      supervisorName: raw.supervisorName,
      supervisorCode: matchedSup?.computerNo ?? 'SUP',
      supervisorDesignation: matchedSup?.designation ?? 'Task Supervisor',
      supervisorSignature: raw.supervisorName,
      supervisorSignatureImage: this.supervisorSignatureImage() || undefined,
      hsoName: hsoTrimmed || '—',
      hsoSignature: hsoTrimmed || '—',
      hsoSignatureImage: this.hsoSignatureImage() || undefined,
      ppeAdherence: raw.ppeAdherence,
      checklist: this.checklistAnswers(),
      remarks: this.checklistRemarks(),
      correctiveActions: raw.correctiveActions.trim(),
      stats: {
        totalChecked: currentStats.total,
        ratedCount: currentStats.ratedCount,
        naCount: currentStats.naCount,
        totalMarks: currentStats.totalMarks,
        maxMarks: currentStats.maxMarks,
        scorePercentage: currentStats.scorePercentage,
        flaggedItems: currentStats.flaggedItems,
      },
    };
  }

  submitInspection(): void {
    this.validationMessage.set('');
    if (this.inspectionForm.invalid || !this.inspectionForm.controls.hsoName.value.trim()) {
      this.inspectionForm.markAllAsTouched();
      this.validationMessage.set(
        'Please complete Level/Zone, Date, Task Supervisor Name, and HSO/I Name before saving.',
      );
      return;
    }

    const record = this.buildSubmissionObject();
    this.store.saveSubmission(record);
    this.submittedRecord.set(record);
    const filename = this.pdfExport.downloadPdf(record, this.store.checklistCategories);
    this.savedPdfFilename.set(filename);
    this.showDispatchModal.set(true);
  }

  openPdfPreview(): void {
    const record = this.buildSubmissionObject();
    this.openPdfPreviewForRecord(record);
  }

  openPdfPreviewForRecord(record: HseInspectionSubmission): void {
    if (this.rawPreviewBlobUrl) {
      URL.revokeObjectURL(this.rawPreviewBlobUrl);
    }
    this.previewRecord = record;
    this.savedPdfFilename.set(this.pdfExport.getFilename(record));
    const url = this.pdfExport.getPdfBlobUrl(record, this.store.checklistCategories);
    this.rawPreviewBlobUrl = url;
    this.pdfPreviewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
  }

  downloadCurrentPreview(): void {
    const rec = this.previewRecord || this.submittedRecord() || this.buildSubmissionObject();
    this.downloadSubmissionPdf(rec);
  }

  closePdfPreview(): void {
    this.pdfPreviewUrl.set(null);
    if (this.rawPreviewBlobUrl) {
      URL.revokeObjectURL(this.rawPreviewBlobUrl);
      this.rawPreviewBlobUrl = '';
    }
  }

  downloadSubmissionPdf(record: HseInspectionSubmission): void {
    const filename = this.pdfExport.downloadPdf(record, this.store.checklistCategories);
    this.savedPdfFilename.set(filename);
  }

  async shareNative(record: HseInspectionSubmission): Promise<void> {
    await this.pdfExport.sharePdfNative(record, this.store.checklistCategories);
  }

  openTemplate(templateId: string): void {
    if (templateId === 'hse-observation-report') {
      this.activeTab.set('observation-form');
      return;
    }
    this.activeTab.set('active-form');
  }
}
