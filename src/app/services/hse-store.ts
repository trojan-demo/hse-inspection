import {Injectable, signal} from '@angular/core';
import {
  ChecklistCategory,
  FIXED_PROJECT_NAME,
  FIXED_SITE_LOCATION,
  HSE_CHECKLIST_CATEGORIES,
  TASK_SUPERVISOR_LIST,
} from '../data/hse-checklist';

import {ObservationReportSubmission} from '../data/observation-report';


export interface InspectionStats {
  totalChecked: number;
  ratedCount: number;
  naCount: number;
  totalMarks: number;
  maxMarks: number;
  scorePercentage: number;
  flaggedItems: string[];
}

export interface HseInspectionSubmission {
  id: string;
  timestamp: string;
  formTitle: string;
  formCode: string;
  projectName: string;
  siteLocation: string;
  levelZone: string;
  date: string;
  supervisorName: string;
  supervisorCode: string;
  supervisorDesignation: string;
  supervisorSignature: string;
  supervisorSignatureImage?: string;
  hsoName: string;
  hsoSignature: string;
  hsoSignatureImage?: string;
  ppeAdherence: 'Yes' | 'No';
  checklist: Record<string, string>;
  remarks: Record<string, string>;
  correctiveActions: string;
  stats: InspectionStats;
}

export interface FormTemplate {
  id: string;
  title: string;
  code: string;
  category: string;
  isActive: boolean;
  totalItems: number;
  badge: string;
}

export interface SafetyTeamMember {
  id: string;
  name: string;
  role: string;
  experience: string;
  bio: string;
  certifications: string[];
  contact: string;
  initials: string;
}

export interface SiteDistrict {
  id: string;
  name: string;
  code: string;
  scope: string;
  status: string;
  safeHours: string;
}

const SUBMISSIONS_STORAGE_KEY = 'trojan_hse_inspections_v1';
const TEMPLATES_STORAGE_KEY = 'trojan_hse_templates_v2';

@Injectable({providedIn: 'root'})
export class HseStore {
  readonly checklistCategories: ChecklistCategory[] = HSE_CHECKLIST_CATEGORIES;
  readonly supervisors = TASK_SUPERVISOR_LIST;

  readonly recentSubmissions = signal<HseInspectionSubmission[]>([]);
  readonly formTemplates = signal<FormTemplate[]>(this.getDefaultForms());

  readonly teamMembers: SafetyTeamMember[] = [
    {
      id: 'team-01',
      name: 'Awais Asghar',
      role: 'HSE Manager',
      experience: '16+ Years HSE Leadership',
      bio: 'Oversees site-wide HSE governance, ISO 45001 compliance, and daily audit verification across Maysan Development Phase I TG2164.',
      certifications: ['NEBOSH Diploma', 'ISO 45001 Lead Auditor', 'IOSH Managing Safely'],
      contact: 'awais.asghar@trojan.ae',
      initials: 'AA',
    },
    
    {
      id: 'team-03',
      name: 'Savad Mohamed Salim',
      role: 'HSE Officer',
      experience: '10+ Years Site Inspection',
      bio: 'Leads daily site HSE inspections, morning toolbox briefings, and immediate corrective action closeouts across Mayar and Thoraya.',
      certifications: ['NEBOSH Certified', 'First Aid & Fire Warden', 'ISO 14001 Auditor'],
      contact: 'savad.salim@trojan.ae',
      initials: 'SM',
    },
    {
      id: 'team-04',
      name: 'Trojan Site Supervision',
      role: 'Task Foremen & Supervisors',
      experience: '10 Authorized Leads',
      bio: 'Frontline task supervisors verifying pre-task safety, PPE adherence, scaffold tags, and housekeeping at every active work front.',
      certifications: ['TGC Certified Foremen', 'PTW Receivers', 'Zero-Harm Champions'],
      contact: 'hse@trojan.ae',
      initials: 'TS',
    },
  ];

  constructor() {
    this.restoreFromStorage();
  }

  private restoreFromStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    try {
      const savedSubs = window.localStorage.getItem(SUBMISSIONS_STORAGE_KEY);
      if (savedSubs) {
        const parsed = JSON.parse(savedSubs) as HseInspectionSubmission[];
        if (Array.isArray(parsed)) {
          this.recentSubmissions.set(parsed);
        }
      }
      
    } catch {
      // Ignore corrupt storage entries
    }
  }

  saveSubmission(submission: HseInspectionSubmission): HseInspectionSubmission {
    const next = [submission, ...this.recentSubmissions()];
    this.recentSubmissions.set(next);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(next.slice(0, 50)));
      } catch {
        // Storage quota safe fallback
      }
    }
    return submission;
  }

  deleteSubmission(id: string): void {
    const next = this.recentSubmissions().filter((item) => item.id !== id);
    this.recentSubmissions.set(next);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore
      }
    }
  }

  // addNewFormTemplate(template: FormTemplate): void {
  //   const next = [...this.formTemplates(), template];
  //   this.formTemplates.set(next);
  //   if (typeof window !== 'undefined' && window.localStorage) {
  //     try {
  //       window.localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(next));
  //     } catch {
  //       // Ignore
  //     }
  //   }
  // }

  generateWhatsAppUrl(submission: HseInspectionSubmission, filename?: string): string {
    const pdfName =
      filename ||
      `HSE_Inspection_${submission.date.replace(/-/g, '')}_${submission.levelZone}.pdf`;
    const flagged =
      submission.stats.flaggedItems.length > 0
        ? submission.stats.flaggedItems.join(', ')
        : 'None (Compliant)';

    const text = [
      '*Daily Site HSE Inspection / Performance Evaluation*',
      `Project: ${submission.projectName || FIXED_PROJECT_NAME}`,
      `Location: ${submission.siteLocation || FIXED_SITE_LOCATION}`,
      `Level/Zone: ${submission.levelZone}`,
      `Date: ${submission.date}`,
      `Task Supervisor: ${submission.supervisorName} (${submission.supervisorCode})`,
      `Task Supervisor Signature: ${submission.supervisorSignature}`,
      `HSO/I Name: ${submission.hsoName}`,
      `HSO/I Signature: ${submission.hsoSignature}`,
      `PPE Adherence: ${submission.ppeAdherence}`,
      `Total Marks: ${submission.stats.totalMarks} / ${submission.stats.maxMarks} (${submission.stats.scorePercentage}%)`,
      `Low-Rated Items (1-2): ${flagged}`,
      `Remarks: ${submission.correctiveActions || 'All inspected parameters verified.'}`,
      `PDF File: ${pdfName}`,
    ].join('\n');

    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }

  generateMailtoUrl(submission: HseInspectionSubmission, filename?: string): string {
    const pdfName =
      filename ||
      `HSE_Inspection_${submission.date.replace(/-/g, '')}_${submission.levelZone}.pdf`;
    const subject = encodeURIComponent(
      `[Daily HSE Inspection] ${submission.projectName} - ${submission.levelZone} - ${submission.date}`,
    );
    const body = encodeURIComponent(
      [
        'Daily Site HSE Inspection / Performance Evaluation Summary',
        '',
        `Project: ${submission.projectName}`,
        `Location: ${submission.siteLocation}`,
        `Level/Zone: ${submission.levelZone}`,
        `Date: ${submission.date}`,
        `Task Supervisor Name: ${submission.supervisorName} (${submission.supervisorCode})`,
        `Task Supervisor Signature: ${submission.supervisorSignature}`,
        `HSO/I Name: ${submission.hsoName}`,
        `HSO/I Signature: ${submission.hsoSignature}`,
        `PPE Adherence: ${submission.ppeAdherence}`,
        `Total Marks: ${submission.stats.totalMarks} / ${submission.stats.maxMarks} (${submission.stats.scorePercentage}%)`,
        `Low-Rated Items (1-2): ${submission.stats.flaggedItems.join(', ') || 'None'}`,
        '',
        `Remarks / Corrective Actions: ${submission.correctiveActions || 'All inspected parameters meet company and ISO 45001 standards.'}`,
        '',
        `Attached PDF Filename: ${pdfName}`,
      ].join('\n'),
    );
    return `mailto:savad.salim@trojan.ae?subject=${subject}&body=${body}`;
  }

  generateObservationWhatsAppUrl(report: ObservationReportSubmission, filename?: string): string {
    const pdfName = filename || `HSE_Observation_Report_${report.reportNo || 'DRAFT'}.pdf`;
    const obsLines = report.observations.map((obs, idx) => {
      const code = obs.secondaryHazardCode
        ? `${obs.hazardCode || '—'}&${obs.secondaryHazardCode}`
        : (obs.hazardCode || '—');
      return `${obs.sn || idx + 1}. [${code}] ${obs.hazardHeading || obs.hazardDetails || 'Observation'} (${obs.category || 'Unrated'})`;
    });

    const text = [
      '*HSE OBSERVATION REPORT*',
      `Report No.: ${report.reportNo || '—'}`,
      `Project: ${report.project || '—'}`,
      `Location: ${report.location || '—'}`,
      `Date / Time: ${report.preparedByDate || '—'} ${report.time || ''}`.trim(),
      `Prepared By: ${report.preparedByName || '—'} (${report.preparedByCompany || '—'})`,
      `Submitted To: ${report.submittedToName || '—'} (${report.submittedToCompany || '—'})`,
      '',
      ...obsLines,
      '',
      `PDF File: ${pdfName}`,
    ].join('\n');

    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }

  generateObservationMailtoUrl(report: ObservationReportSubmission, filename?: string): string {
    const pdfName = filename || `HSE_Observation_Report_${report.reportNo || 'DRAFT'}.pdf`;
    const subject = encodeURIComponent(
      `[HSE Observation Report ${report.reportNo || ''}] ${report.project || 'Trojan Construction'} - ${report.location || ''}`.trim(),
    );
    const obsLines = report.observations.map((obs, idx) => {
      const code = obs.secondaryHazardCode
        ? `${obs.hazardCode || '—'}&${obs.secondaryHazardCode}`
        : (obs.hazardCode || '—');
      return [
        `SN ${obs.sn || String(idx + 1).padStart(2, '0')} | Hazard Code: ${code} | Category: ${obs.category || '—'} | Target Date: ${obs.completionDate || '—'}`,
        `Hazards/Aspects: ${[obs.hazardHeading, obs.hazardDetails].filter(Boolean).join(' - ') || '—'}`,
        `Risk/Impact: ${obs.riskImpact || '—'}`,
        `Recommended Action: ${obs.correctiveAction || '—'}`,
        `Responsible Person: ${obs.responsiblePerson || '—'}`,
      ].join('\n');
    });

    const body = encodeURIComponent(
      [
        'TROJAN GENERAL CONTRACTING LLC - HSE OBSERVATION REPORT',
        `Form: ${report.formCode} (${report.revision})`,
        `Report No.: ${report.reportNo || '—'}`,
        `Project: ${report.project || '—'}`,
        `Location: ${report.location || '—'}`,
        `Time: ${report.time || '—'}`,
        `Prepared By: ${report.preparedByName || '—'} (${report.preparedByJobTitle || '—'}, ${report.preparedByCompany || '—'}) · ${report.preparedByDate || '—'}`,
        `Submitted To: ${report.submittedToName || '—'} (${report.submittedToJobTitle || '—'}, ${report.submittedToCompany || '—'}) · ${report.submittedToDate || '—'}`,
        '',
        ...obsLines,
        '',
        `Attached PDF Filename: ${pdfName}`,
      ].join('\n\n'),
    );

    return `mailto:?subject=${subject}&body=${body}`;
  }


  private getDefaultForms(): FormTemplate[] {
    return [
      {
        id: 'hse-inspection-daily',
        title: 'Daily Site HSE Inspection / Performance Evaluation',
        code: 'HSE-FRM-01',
        category: 'Daily Operations & Safety Auditing',
        
        isActive: true,
        totalItems: 47,
        badge: 'Default Form',
         },
      {
        id: 'hse-observation-report',
        title: 'HSE Observation Report',
        code: 'TGC/FRM/HSE/019',
        category: 'Hazard Observation & Corrective Action',
       
        isActive: true,
        totalItems: 9,
        badge: 'Rev:-01',
      },
    ];
  }
}
