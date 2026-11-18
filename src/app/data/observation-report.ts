export interface HazardCodeOption {
  code: string;
  label: string;
}

export const HAZARD_CODE_OPTIONS: HazardCodeOption[] = [
  {code: 'A', label: 'Working at heights'},
  {code: 'B', label: 'Ladders / scaffold'},
  {code: 'C', label: 'Lifting Plant & Equip.'},
  {code: 'D', label: 'Mobile plant & Vehicle'},
  {code: 'E', label: 'Hot Works'},
  {code: 'F', label: 'Portable Electrical Equip'},
  {code: 'G', label: 'Power tools / machinery'},
  {code: 'H', label: 'Fire & explosion'},
  {code: 'I', label: 'Chemicals'},
  {code: 'J', label: 'Environmental aspect'},
  {code: 'K', label: 'Access Egress'},
  {code: 'L', label: 'Slips, trips, falls'},
  {code: 'M', label: 'Manual handling'},
  {code: 'N', label: 'Hand tools'},
  {code: 'O', label: 'Excavation'},
  {code: 'P', label: 'Emergencies equip'},
  {code: 'Q', label: 'Personal Protective Equip'},
  {code: 'R', label: 'Confined space'},
  {code: 'S', label: 'Others'},
];

export const OBSERVATION_CATEGORIES = [
  {value: 'High', label: '1 (High) Immediate'},
  {value: 'Medium', label: '2 (Medium) a day'},
  {value: 'Low', label: '3 (Low) in a week'},
] as const;

export interface ObservationPhoto {
  id: string;
  name: string;
  dataUrl: string;
  width: number;
  height: number;
}

export interface ObservationRow {
  id: string;
  sn: string;
  hazardCode: string;
  secondaryHazardCode: string;
  photos: ObservationPhoto[];
  hazardHeading: string;
  hazardDetails: string;
  riskImpact: string;
  correctiveAction: string;
  responsiblePerson: string;
  category: string;
  completionDate: string;
}

export interface ObservationReportSubmission {
  reportNo: string;
  formCode: string;
  revision: string;
  project: string;
  location: string;
  time: string;
  preparedByJobTitle: string;
  preparedByName: string;
  preparedByCompany: string;
  preparedBySignatureImage?: string;
  preparedByDate: string;
  submittedToJobTitle: string;
  submittedToName: string;
  submittedToCompany: string;
  submittedToSignatureImage?: string;
  submittedToDate: string;
  observations: ObservationRow[];
  footerPreparedByName: string;
  footerPreparedByTitle: string;
  footerPreparedBySignatureImage?: string;
  footerApprovedByName: string;
  footerApprovedByTitle: string;
  footerApprovedBySignatureImage?: string;
}
