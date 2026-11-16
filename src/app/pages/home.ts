import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {RouterLink} from '@angular/router';
import {HseStore} from '../services/hse-store';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule],
  templateUrl: './home.html',
})
export class Home {
  readonly store = inject(HseStore);

  readonly partners = [
    {
      role: 'Employer',
      name: 'Modon Properties',
      image: 'assets/images/modon.jpg',
      

      detail: 'Master Developer · Maysan Al Reem Island',
    },
    {
      role: 'PMC',
      name: 'EllisDon',
      image: 'assets/images/ellisdon.png',
      detail: 'Project Management Consultancy',
    },
    {
      role: 'Consultant',
      name: 'Khatib & Alami',
      image: 'assets/images/khatib.png',
      detail: 'Lead Engineering & Supervision Consultant',
    },
    {
      role: 'Contractor',
      name: 'Trojan Construction Holding',
      image: 'assets/images/trojan.png',
      detail: 'Main Building & Civil Contractor (TGC)',
    },
  ];

  readonly safetyPillars = [
    {
      icon: 'assignment_turned_in',
      title: 'Daily Supervisor Audits',
      description:
        'Every shift conducts a structured checklist inspection across housekeeping, scaffolding tags, machinery, fire safety, and electrical ELCBs.',
      tag: 'Instant PDF Export & Dispatch',
    },
    {
      icon: 'stairs',
      title: 'Working at Height & Scaffolds',
      description:
        'Strict Green Tag (Safe) and Red Tag (Incomplete) control, 1-in-4 ladder angles, full toe boards, edge protection, and 100% harness tie-off.',
      tag: '7-Day Scaffold Re-Certification',
    },
    {
      icon: 'precision_manufacturing',
      title: 'Plant & Certified Lifting Gear',
      description:
        'Cranes, excavators, and lifting accessories undergo third-party inspection, pre-operation checks, and strict exclusion zone controls.',
      tag: 'Authorized & Licensed Operators',
    },
    {
      icon: 'engineering',
      title: '5-Point PPE & COSHH',
      description:
        'Hard hats, safety footwear, high-vis vests, eye protection, and gloves enforced at gate entry with SDS and bunded chemical storage.',
      tag: 'Zero-Tolerance Gate Enforcement',
    },
    {
      icon: 'local_fire_department',
      title: 'Hot Work & Fire Safety',
      description:
        'Mandatory Hot Work PTW, flashback arresters, certified extinguishers within 5 meters, and continuous 30-minute post-work fire watch.',
      tag: 'Mapped Assembly Points',
    },
    {
      icon: 'bolt',
      title: 'Site Electrical & ELCB',
      description:
        '30 mA RCD/ELCB protection on all distribution boards, 220V colour-coded PAT-tested power tools, and elevated cable routing.',
      tag: 'Daily Isolation & Integrity Checks',
    },
  ];
}
