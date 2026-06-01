import type { ComplianceObligation, RegulatorySource } from '@/db/db';

export interface PHObligationTemplate {
  authority: RegulatorySource['authority'];
  legalBasis: string;
  sourceTitle: string;
  code: string;
  title: string;
  applicability: string;
  trigger: string;
  cadence: string;
  requiredEvidence: string[];
}

export const PH_OBLIGATIONS_LIBRARY: PHObligationTemplate[] = [
  {
    authority: 'NPC',
    legalBasis: 'Data Privacy Act of 2012 (RA 10173)',
    sourceTitle: 'Data Privacy Act',
    code: 'NPC-DPO-REG',
    title: 'Maintain DPO registration and privacy management program',
    applicability: 'All personal information controllers/processors',
    trigger: 'Handling personal information',
    cadence: 'Annual review',
    requiredEvidence: ['DPO appointment', 'Privacy management framework', 'Training logs'],
  },
  {
    authority: 'NPC',
    legalBasis: 'NPC Circular 16-03',
    sourceTitle: 'Personal Data Breach Management',
    code: 'NPC-BREACH-72H',
    title: 'Assess and notify NPC for notifiable personal data breaches',
    applicability: 'PIC/PIP with breach impacting rights and freedoms',
    trigger: 'Detected breach',
    cadence: 'Within statutory window',
    requiredEvidence: ['Breach assessment', 'Notification template', 'Submission reference'],
  },
  {
    authority: 'AMLC',
    legalBasis: 'Anti-Money Laundering Act (RA 9160, as amended)',
    sourceTitle: 'AMLA Compliance',
    code: 'AMLC-CDD-STR',
    title: 'Implement CDD and suspicious transaction reporting',
    applicability: 'Covered institutions',
    trigger: 'Customer onboarding and suspicious transactions',
    cadence: 'Ongoing',
    requiredEvidence: ['CDD records', 'STR filings', 'Monitoring procedures'],
  },
  {
    authority: 'BSP',
    legalBasis: 'BSP Circulars on IT Risk and Cybersecurity',
    sourceTitle: 'BSP IT/Cybersecurity Governance',
    code: 'BSP-CYBER-GOV',
    title: 'Maintain cybersecurity and incident governance controls',
    applicability: 'BSP-supervised institutions',
    trigger: 'Operation of digital/IT systems',
    cadence: 'Quarterly review',
    requiredEvidence: ['Risk assessments', 'Incident reports', 'Board approvals'],
  },
  {
    authority: 'SEC',
    legalBasis: 'SEC Corporate Governance and Disclosure Rules',
    sourceTitle: 'SEC Disclosure Controls',
    code: 'SEC-DISC-CONTROLS',
    title: 'Maintain records and disclosures for governance obligations',
    applicability: 'SEC-registered entities',
    trigger: 'Regulatory reporting cycles',
    cadence: 'Periodic filings',
    requiredEvidence: ['Submission packs', 'Approval records', 'Disclosure attachments'],
  },
];

export function obligationFromTemplate(template: PHObligationTemplate, sourceId?: string): Omit<ComplianceObligation, 'id'> {
  const now = Date.now();
  return {
    workspaceId: 'ws-default',
    sourceId,
    code: template.code,
    authority: template.authority,
    title: template.title,
    applicability: template.applicability,
    trigger: template.trigger,
    cadence: template.cadence,
    owner: '',
    status: 'draft',
    escalationLevel: 'none',
    requiredEvidence: template.requiredEvidence,
    linkedPolicyIds: [],
    linkedControlIds: [],
    linkedTaskIds: [],
    evidenceIds: [],
    createdAt: now,
    updatedAt: now,
  };
}
