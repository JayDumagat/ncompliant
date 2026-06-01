import Dexie, { type EntityTable } from 'dexie';

export interface Workspace {
  id: string;
  name: string;
  createdAt: number;
}

export interface Policy {
  id: string;
  workspaceId: string;
  title: string;
  status: 'draft' | 'active' | 'under_review' | 'archived';
  content: string;
  category: string;
  owner: string;
  department: string;
  purpose: string;
  scope: string;
  requirements: string;
  dataAssetIds: string[];
  reviewFrequency: 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | 'none';
  nextReviewDate?: number;
  lastUpdated: number;
  createdAt: number;
  tags: string[];
  versions: PolicyVersion[];
}

export interface PolicyVersion {
  version: number;
  content: string;
  updatedAt: number;
  note: string;
}

export interface Task {
  id: string;
  workspaceId: string;
  policyId?: string;
  assessmentId?: string;
  title: string;
  description: string;
  assignedTo: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  dueDate?: number;
  createdAt: number;
}

export interface RegulatoryUpdate {
  id: string;
  title: string;
  agency: string;
  date: number;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  affectedPolicies: string[];
  actions: string[];
}

export type AssessmentType = 'pia' | 'risk_assessment' | 'security_checklist';

export interface AssessmentAnswer {
  questionId: string;
  answer: 'yes' | 'no' | 'partial' | 'na';
  notes: string;
}

export interface Assessment {
  id: string;
  workspaceId: string;
  type: AssessmentType;
  title: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed';
  riskLevel: 'low' | 'medium' | 'high' | 'unassessed';
  // PIA-specific
  dataTypes: string[];
  dataAssetIds: string[];
  processingPurpose: string;
  dataSubjects: string;
  // Risk Assessment-specific
  assetsCovered: string;
  threatSources: string;
  // Security Checklist-specific
  systemsInScope: string;
  frameworkRef: string;
  // Shared
  answers: AssessmentAnswer[];
  findings: string;
  recommendations: string;
  score: number;
  createdAt: number;
  completedAt?: number;
  versions: AssessmentVersion[];
}

export interface AssessmentVersion {
  version: number;
  score: number;
  riskLevel: Assessment['riskLevel'];
  completedAt: number;
  note: string;
  findings?: string;
  recommendations?: string;
  answers?: AssessmentAnswer[];
}

// --- New entity types ---

export interface TemplateStep {
  id: string;
  text: string;
  completed: boolean;
}

export type TemplateKind = 'task' | 'policy' | 'assessment' | 'checklist' | 'incident' | 'training' | 'vendor' | 'custom';

export interface TaskTemplate {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  kind?: TemplateKind;
  category: 'audit' | 'policy_review' | 'pia' | 'incident' | 'training' | 'report' | 'custom';
  steps: TemplateStep[];
  recurrence?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  priority: 'low' | 'medium' | 'high';
  tags?: string[];
  payload?: string;
  createdAt: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  completedBy?: string;
  completedAt?: number;
  notes?: string;
}

export interface Checklist {
  id: string;
  workspaceId: string;
  title: string;
  type: 'audit' | 'incident' | 'training' | 'policy_adherence' | 'custom';
  items: ChecklistItem[];
  linkedPolicyId?: string;
  linkedAssessmentId?: string;
  status: 'not_started' | 'in_progress' | 'completed';
  createdAt: number;
  completedAt?: number;
}

export interface TrainingRecord {
  id: string;
  workspaceId: string;
  employeeName: string;
  courseName: string;
  category: 'privacy' | 'security' | 'compliance' | 'aml' | 'general';
  status: 'scheduled' | 'in_progress' | 'completed' | 'expired';
  scheduledDate?: number;
  completedDate?: number;
  expirationDate?: number;
  certificateRef: string;
  notes: string;
  createdAt: number;
}

export interface Incident {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  type: 'data_breach' | 'security' | 'compliance_violation' | 'operational' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  reportedBy: string;
  reportedDate: number;
  resolvedDate?: number;
  linkedPolicies: string[];
  linkedAssessments: string[];
  linkedTasks: string[];
  affectedDataAssetIds: string[];
  findings: string;
  mitigationSteps: string;
  isRecurring: boolean;
  createdAt: number;
}

export interface ThirdPartyVendor {
  id: string;
  workspaceId: string;
  name: string;
  serviceCategory: string;
  contactName: string;
  contactEmail: string;
  status: 'active' | 'under_review' | 'offboarded';
  riskTier: 'low' | 'medium' | 'high' | 'critical';
  dataAccess: 'none' | 'limited' | 'full';
  dataAssetIds: string[];
  notes: string;
  tags: string[];
  createdAt: number;
  lastAssessmentAt?: number;
}

export interface VendorAssessment {
  id: string;
  workspaceId: string;
  vendorId: string;
  title: string;
  assessmentType: 'security' | 'privacy' | 'compliance' | 'operational';
  status: 'not_started' | 'in_progress' | 'completed';
  riskLevel: 'low' | 'medium' | 'high' | 'critical' | 'unassessed';
  score: number;
  summary: string;
  recommendations: string;
  assessedAt?: number;
  nextReviewDate?: number;
  createdAt: number;
}

export interface DataAsset {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  dataType: string;
  classification: 'public' | 'internal' | 'confidential' | 'restricted';
  group: string;
  tags: string[];
  owner: string;
  retentionPolicy: string;
  status: 'active' | 'archived';
  createdAt: number;
  lastReviewedAt?: number;
}

export type ComplianceWorkflowStatus = 'draft' | 'active' | 'overdue' | 'completed' | 'accepted_risk';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type DSRRequestType = 'access' | 'correction' | 'erasure_blocking' | 'objection' | 'portability';
export type DSRCaseStatus = 'intake' | 'in_review' | 'awaiting_customer' | 'fulfilled' | 'rejected' | 'closed' | 'overdue';
export type ChangeType = 'new' | 'amended' | 'repealed';
export type ReviewStatus = 'queued' | 'in_review' | 'confirmed' | 'dismissed';
export type RoleKey = 'admin' | 'user' | 'compliance_admin' | 'compliance_manager' | 'breach_manager' | 'dsr_handler' | 'auditor' | 'approver';
export type PermissionKey =
  | 'obligations.manage'
  | 'obligations.review'
  | 'updates.ingest'
  | 'incidents.breach'
  | 'dsr.manage'
  | 'ropa.manage'
  | 'transfers.manage'
  | 'evidence.manage'
  | 'approvals.approve'
  | 'submissions.manage'
  | 'audit.export';

export interface RegulatorySource {
  id: string;
  workspaceId: string;
  authority: 'NPC' | 'AMLC' | 'BSP' | 'SEC' | 'OTHER';
  legalBasis: string;
  title: string;
  applicability: string;
  trigger: string;
  cadence: string;
  requiredEvidence: string[];
  sourceUrl?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ComplianceObligation {
  id: string;
  workspaceId: string;
  sourceId?: string;
  code: string;
  authority: RegulatorySource['authority'];
  title: string;
  applicability: string;
  trigger: string;
  cadence: string;
  owner: string;
  status: ComplianceWorkflowStatus;
  dueDate?: number;
  escalationLevel: 'none' | 'manager' | 'executive' | 'board';
  exceptionReason?: string;
  requiredEvidence: string[];
  linkedPolicyIds: string[];
  linkedControlIds: string[];
  linkedTaskIds: string[];
  evidenceIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface RegulatoryFeed {
  id: string;
  workspaceId: string;
  authority: RegulatorySource['authority'];
  connectorType: 'rss' | 'manual' | 'api';
  endpoint: string;
  status: 'active' | 'disabled';
  lastCheckedAt?: number;
  createdAt: number;
}

export interface RegulatoryUpdateEvent {
  id: string;
  workspaceId: string;
  feedId?: string;
  authority: RegulatorySource['authority'];
  title: string;
  summary: string;
  publishedAt: number;
  ingestedAt: number;
  referenceUrl?: string;
}

export interface RegulatoryChangeRecord {
  id: string;
  workspaceId: string;
  updateEventId: string;
  obligationCode?: string;
  changeType: ChangeType;
  impactSummary: string;
  impactedObligationIds: string[];
  impactedControlIds: string[];
  owner: string;
  reviewStatus: ReviewStatus;
  reviewedAt?: number;
}

export interface DSRCase {
  id: string;
  workspaceId: string;
  requestType: DSRRequestType;
  requesterName: string;
  requesterEmail: string;
  status: DSRCaseStatus;
  assignedTo: string;
  receivedAt: number;
  dueDate: number;
  decision?: 'approved' | 'partially_approved' | 'rejected';
  decisionReason?: string;
  closedAt?: number;
  closureReason?: string;
  escalationLevel: 'none' | 'manager' | 'legal';
  evidenceIds: string[];
  decisionLog: string[];
}

export interface BreachWorkflow {
  id: string;
  workspaceId: string;
  incidentId?: string;
  title: string;
  status: ComplianceWorkflowStatus;
  owner: string;
  detectedAt: number;
  riskToRights: boolean;
  affectedSubjectsCount: number;
  npcNotificationRequired: boolean;
  npcNotificationDeadline?: number;
  npcNotificationSentAt?: number;
  notificationReference?: string;
  thresholdAssessment: string;
  approver: string;
  approvalStatus: ApprovalStatus;
  timeline: string[];
  evidenceIds: string[];
  submissionPackId?: string;
  createdAt: number;
}

export interface ROPARecord {
  id: string;
  workspaceId: string;
  activityName: string;
  owner: string;
  status: ComplianceWorkflowStatus;
  legalBasis: string;
  dataSubjects: string;
  dataCategories: string;
  recipients: string;
  transferBasis: string;
  retentionPeriod: string;
  disposalMethod: string;
  linkedIncidentIds: string[];
  linkedAssessmentIds: string[];
  linkedVendorIds: string[];
  linkedPolicyIds: string[];
  evidenceIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface TransferAssessment {
  id: string;
  workspaceId: string;
  transferName: string;
  destinationCountry: string;
  mechanism: string;
  legalBasis: string;
  safeguardStatus: 'valid' | 'expiring' | 'missing';
  status: ComplianceWorkflowStatus;
  reviewDate?: number;
  nextReviewDate?: number;
  remediationTaskIds: string[];
  evidenceIds: string[];
  notes: string;
  createdAt: number;
  updatedAt: number;
}

export interface EvidenceRecord {
  id: string;
  workspaceId: string;
  title: string;
  type: 'document' | 'screenshot' | 'log' | 'approval' | 'submission' | 'other';
  description: string;
  uri: string;
  checksum: string;
  hashAlgorithm: 'sha256';
  immutable: boolean;
  chainOfCustody: string[];
  capturedAt: number;
  capturedBy: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

export interface ApprovalWorkflow {
  id: string;
  workspaceId: string;
  module: 'breach' | 'obligation' | 'submission' | 'transfer' | 'dsr' | 'ropa' | 'other';
  entityId: string;
  action: string;
  maker: string;
  checker: string;
  status: ApprovalStatus;
  submittedAt: number;
  decidedAt?: number;
  decisionNote?: string;
}

export interface SubmissionPack {
  id: string;
  workspaceId: string;
  regulator: RegulatorySource['authority'];
  title: string;
  status: 'draft' | 'ready' | 'submitted' | 'follow_up' | 'closed';
  dueDate?: number;
  submittedAt?: number;
  referenceNumber?: string;
  followUpDate?: number;
  checklist: string[];
  includedObligationIds: string[];
  includedIncidentIds: string[];
  includedDSRCaseIds: string[];
  includedROPAIds: string[];
  evidenceIds: string[];
  notes: string;
  createdAt: number;
  updatedAt: number;
}

export interface AuditEvent {
  id: string;
  workspaceId: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string;
  actorName: string;
  details: string;
  happenedAt: number;
  prevHash: string;
  integrityHash: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: RoleKey;
  permissions: PermissionKey[];
  createdAt: number;
}

export type DataMapNodeType = 'organization' | 'department' | 'process' | 'data_item';
export type DataMapProcessType = 'collection' | 'processing' | 'storage' | 'transfer' | 'deletion';
export type DataMapClassification = 'public' | 'internal' | 'confidential' | 'restricted';
export type DataMapSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface DataMapNode {
  id: string;
  workspaceId: string;
  type: DataMapNodeType;
  parentId: string | null;
  label: string;
  description: string;
  positionX: number;
  positionY: number;
  color: string;
  icon: string;
  metadata: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface DataMapEdge {
  id: string;
  workspaceId: string;
  sourceNodeId: string;
  targetNodeId: string;
  label: string;
  dataTypes: string[];
  animated: boolean;
  level: DataMapNodeType;
  parentId: string | null;
  createdAt: number;
}

export interface ReportSnapshot {
  totalPolicies: number;
  activePolicies: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  totalAssessments: number;
  completedAssessments: number;
  highRiskAssessments: number;
  openIncidents: number;
  trainingCompliance: number;
}

export interface Report {
  id: string;
  workspaceId: string;
  title: string;
  type: 'internal' | 'regulatory';
  template: 'compliance_summary' | 'risk_assessment' | 'training_compliance' | 'incident_summary' | 'regulatory_submission';
  period: 'monthly' | 'quarterly' | 'annual' | 'custom';
  periodStart?: number;
  periodEnd?: number;
  data: ReportSnapshot;
  notes: string;
  status: 'draft' | 'final';
  generatedAt: number;
}

// Keep legacy PIA types for backward compat during migration
export interface PIAAnswer {
  questionId: string;
  answer: 'yes' | 'no' | 'partial' | 'na';
  notes: string;
}

export interface PIA {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed';
  riskLevel: 'low' | 'medium' | 'high' | 'unassessed';
  dataTypes: string[];
  processingPurpose: string;
  dataSubjects: string;
  answers: PIAAnswer[];
  score: number;
  createdAt: number;
  completedAt?: number;
}

export const WS_DEFAULT_ID = 'ws-default';
export const ROLE_PERMISSIONS: Record<RoleKey, PermissionKey[]> = {
  admin: ['obligations.manage', 'obligations.review', 'updates.ingest', 'incidents.breach', 'dsr.manage', 'ropa.manage', 'transfers.manage', 'evidence.manage', 'approvals.approve', 'submissions.manage', 'audit.export'],
  user: ['obligations.review'],
  compliance_admin: ['obligations.manage', 'obligations.review', 'updates.ingest', 'incidents.breach', 'dsr.manage', 'ropa.manage', 'transfers.manage', 'evidence.manage', 'approvals.approve', 'submissions.manage', 'audit.export'],
  compliance_manager: ['obligations.manage', 'obligations.review', 'updates.ingest', 'dsr.manage', 'ropa.manage', 'transfers.manage', 'evidence.manage', 'submissions.manage'],
  breach_manager: ['incidents.breach', 'evidence.manage', 'submissions.manage'],
  dsr_handler: ['dsr.manage', 'evidence.manage'],
  auditor: ['obligations.review', 'audit.export'],
  approver: ['approvals.approve', 'submissions.manage'],
};

export function permissionsForRole(role: RoleKey): PermissionKey[] {
  return ROLE_PERMISSIONS[role];
}

const db = new Dexie('NCompliantDB') as Dexie & {
  workspaces: EntityTable<Workspace, 'id'>;
  policies: EntityTable<Policy, 'id'>;
  tasks: EntityTable<Task, 'id'>;
  updates: EntityTable<RegulatoryUpdate, 'id'>;
  pias: EntityTable<PIA, 'id'>;
  assessments: EntityTable<Assessment, 'id'>;
  taskTemplates: EntityTable<TaskTemplate, 'id'>;
  checklists: EntityTable<Checklist, 'id'>;
  trainingRecords: EntityTable<TrainingRecord, 'id'>;
  incidents: EntityTable<Incident, 'id'>;
  vendors: EntityTable<ThirdPartyVendor, 'id'>;
  vendorAssessments: EntityTable<VendorAssessment, 'id'>;
  dataAssets: EntityTable<DataAsset, 'id'>;
  reports: EntityTable<Report, 'id'>;
  users: EntityTable<User, 'id'>;
  dataMapNodes: EntityTable<DataMapNode, 'id'>;
  dataMapEdges: EntityTable<DataMapEdge, 'id'>;
  regulatorySources: EntityTable<RegulatorySource, 'id'>;
  obligations: EntityTable<ComplianceObligation, 'id'>;
  regulatoryFeeds: EntityTable<RegulatoryFeed, 'id'>;
  regulatoryEvents: EntityTable<RegulatoryUpdateEvent, 'id'>;
  regulatoryChanges: EntityTable<RegulatoryChangeRecord, 'id'>;
  dsrCases: EntityTable<DSRCase, 'id'>;
  breachWorkflows: EntityTable<BreachWorkflow, 'id'>;
  ropaRecords: EntityTable<ROPARecord, 'id'>;
  transferAssessments: EntityTable<TransferAssessment, 'id'>;
  evidenceRecords: EntityTable<EvidenceRecord, 'id'>;
  approvalWorkflows: EntityTable<ApprovalWorkflow, 'id'>;
  submissionPacks: EntityTable<SubmissionPack, 'id'>;
  auditEvents: EntityTable<AuditEvent, 'id'>;
};

db.version(3).stores({
  workspaces: 'id, name',
  policies: 'id, workspaceId, status, category, lastUpdated',
  tasks: 'id, workspaceId, policyId, status, priority, dueDate',
  updates: 'id, agency, severity, date',
  pias: 'id, workspaceId, status, riskLevel, createdAt',
});

db.version(4).stores({
  workspaces: 'id, name',
  policies: 'id, workspaceId, status, category, lastUpdated',
  tasks: 'id, workspaceId, policyId, assessmentId, status, priority, dueDate',
  updates: 'id, agency, severity, date',
  pias: 'id, workspaceId, status, riskLevel, createdAt',
  assessments: 'id, workspaceId, type, status, riskLevel, createdAt',
}).upgrade(async (tx) => {
  const pias = await tx.table('pias').toArray();
  const assessments = pias.map((p: PIA): Assessment => ({
    id: p.id, workspaceId: p.workspaceId, type: 'pia', title: p.title, description: p.description,
    status: p.status, riskLevel: p.riskLevel, dataTypes: p.dataTypes, processingPurpose: p.processingPurpose,
    dataAssetIds: [],
    dataSubjects: p.dataSubjects, assetsCovered: '', threatSources: '', systemsInScope: '', frameworkRef: '',
    answers: p.answers, findings: '', recommendations: '', score: p.score, createdAt: p.createdAt,
    completedAt: p.completedAt, versions: [],
  }));
  await tx.table('assessments').bulkAdd(assessments);
  await tx.table('policies').toCollection().modify((p: Policy) => {
    if (!p.department) p.department = '';
    if (!p.purpose) p.purpose = '';
    if (!p.scope) p.scope = '';
    if (!p.requirements) p.requirements = '';
    if (!p.reviewFrequency) p.reviewFrequency = 'none';
  });
  await tx.table('tasks').toCollection().modify((t: Task) => {
    if (!t.assignedTo) t.assignedTo = '';
  });
});

db.version(5).stores({
  workspaces: 'id, name',
  policies: 'id, workspaceId, status, category, lastUpdated',
  tasks: 'id, workspaceId, policyId, assessmentId, status, priority, dueDate',
  updates: 'id, agency, severity, date',
  pias: 'id, workspaceId, status, riskLevel, createdAt',
  assessments: 'id, workspaceId, type, status, riskLevel, createdAt',
  taskTemplates: 'id, workspaceId, category, createdAt',
  checklists: 'id, workspaceId, type, status, createdAt',
  trainingRecords: 'id, workspaceId, status, category, expirationDate, createdAt',
  incidents: 'id, workspaceId, type, severity, status, reportedDate, createdAt',
  reports: 'id, workspaceId, type, template, period, status, generatedAt',
});

db.version(6).stores({
  workspaces: 'id, name',
  policies: 'id, workspaceId, status, category, lastUpdated',
  tasks: 'id, workspaceId, policyId, assessmentId, status, priority, dueDate',
  updates: 'id, agency, severity, date',
  pias: 'id, workspaceId, status, riskLevel, createdAt',
  assessments: 'id, workspaceId, type, status, riskLevel, createdAt',
  taskTemplates: 'id, workspaceId, category, createdAt',
  checklists: 'id, workspaceId, type, status, createdAt',
  trainingRecords: 'id, workspaceId, status, category, expirationDate, createdAt',
  incidents: 'id, workspaceId, type, severity, status, reportedDate, createdAt',
  vendors: 'id, workspaceId, status, riskTier, serviceCategory, createdAt, lastAssessmentAt',
  vendorAssessments: 'id, workspaceId, vendorId, assessmentType, status, riskLevel, assessedAt, nextReviewDate, createdAt',
  dataAssets: 'id, workspaceId, classification, group, status, createdAt, lastReviewedAt',
  reports: 'id, workspaceId, type, template, period, status, generatedAt',
});

db.version(7).stores({
  workspaces: 'id, name',
  policies: 'id, workspaceId, status, category, lastUpdated',
  tasks: 'id, workspaceId, policyId, assessmentId, status, priority, dueDate',
  updates: 'id, agency, severity, date',
  pias: 'id, workspaceId, status, riskLevel, createdAt',
  assessments: 'id, workspaceId, type, status, riskLevel, createdAt',
  taskTemplates: 'id, workspaceId, category, createdAt',
  checklists: 'id, workspaceId, type, status, createdAt',
  trainingRecords: 'id, workspaceId, status, category, expirationDate, createdAt',
  incidents: 'id, workspaceId, type, severity, status, reportedDate, createdAt',
  vendors: 'id, workspaceId, status, riskTier, serviceCategory, createdAt, lastAssessmentAt',
  vendorAssessments: 'id, workspaceId, vendorId, assessmentType, status, riskLevel, assessedAt, nextReviewDate, createdAt',
  dataAssets: 'id, workspaceId, classification, group, status, createdAt, lastReviewedAt',
  reports: 'id, workspaceId, type, template, period, status, generatedAt',
  users: 'id, &email, createdAt',
});

db.version(8).stores({
  workspaces: 'id, name',
  policies: 'id, workspaceId, status, category, lastUpdated',
  tasks: 'id, workspaceId, policyId, assessmentId, status, priority, dueDate',
  updates: 'id, agency, severity, date',
  pias: 'id, workspaceId, status, riskLevel, createdAt',
  assessments: 'id, workspaceId, type, status, riskLevel, createdAt',
  taskTemplates: 'id, workspaceId, category, createdAt',
  checklists: 'id, workspaceId, type, status, createdAt',
  trainingRecords: 'id, workspaceId, status, category, expirationDate, createdAt',
  incidents: 'id, workspaceId, type, severity, status, reportedDate, createdAt',
  vendors: 'id, workspaceId, status, riskTier, serviceCategory, createdAt, lastAssessmentAt',
  vendorAssessments: 'id, workspaceId, vendorId, assessmentType, status, riskLevel, assessedAt, nextReviewDate, createdAt',
  dataAssets: 'id, workspaceId, classification, group, status, createdAt, lastReviewedAt',
  reports: 'id, workspaceId, type, template, period, status, generatedAt',
  users: 'id, &email, createdAt',
  dataMapNodes: 'id, workspaceId, type, parentId, createdAt',
  dataMapEdges: 'id, workspaceId, sourceNodeId, targetNodeId, level, parentId, createdAt',
});

db.version(9).stores({
  workspaces: 'id, name',
  policies: 'id, workspaceId, status, category, lastUpdated',
  tasks: 'id, workspaceId, policyId, assessmentId, status, priority, dueDate',
  updates: 'id, agency, severity, date',
  pias: 'id, workspaceId, status, riskLevel, createdAt',
  assessments: 'id, workspaceId, type, status, riskLevel, createdAt',
  taskTemplates: 'id, workspaceId, category, createdAt',
  checklists: 'id, workspaceId, type, status, createdAt',
  trainingRecords: 'id, workspaceId, status, category, expirationDate, createdAt',
  incidents: 'id, workspaceId, type, severity, status, reportedDate, createdAt',
  vendors: 'id, workspaceId, status, riskTier, serviceCategory, createdAt, lastAssessmentAt',
  vendorAssessments: 'id, workspaceId, vendorId, assessmentType, status, riskLevel, assessedAt, nextReviewDate, createdAt',
  dataAssets: 'id, workspaceId, classification, group, status, createdAt, lastReviewedAt',
  reports: 'id, workspaceId, type, template, period, status, generatedAt',
  users: 'id, &email, createdAt',
  dataMapNodes: 'id, workspaceId, type, parentId, createdAt',
  dataMapEdges: 'id, workspaceId, sourceNodeId, targetNodeId, level, parentId, createdAt',
}).upgrade(async (tx) => {
  await tx.table('policies').toCollection().modify((p: Policy) => {
    if (!Array.isArray(p.dataAssetIds)) p.dataAssetIds = [];
  });
  await tx.table('assessments').toCollection().modify((a: Assessment) => {
    if (!Array.isArray(a.dataAssetIds)) a.dataAssetIds = [];
  });
  await tx.table('incidents').toCollection().modify((i: Incident) => {
    if (!Array.isArray(i.affectedDataAssetIds)) i.affectedDataAssetIds = [];
  });
  await tx.table('vendors').toCollection().modify((v: ThirdPartyVendor) => {
    if (!Array.isArray(v.dataAssetIds)) v.dataAssetIds = [];
  });
});

db.version(10).stores({
  workspaces: 'id, name',
  policies: 'id, workspaceId, status, category, lastUpdated',
  tasks: 'id, workspaceId, policyId, assessmentId, status, priority, dueDate',
  updates: 'id, agency, severity, date',
  pias: 'id, workspaceId, status, riskLevel, createdAt',
  assessments: 'id, workspaceId, type, status, riskLevel, createdAt',
  taskTemplates: 'id, workspaceId, category, createdAt',
  checklists: 'id, workspaceId, type, status, createdAt',
  trainingRecords: 'id, workspaceId, status, category, expirationDate, createdAt',
  incidents: 'id, workspaceId, type, severity, status, reportedDate, createdAt',
  vendors: 'id, workspaceId, status, riskTier, serviceCategory, createdAt, lastAssessmentAt',
  vendorAssessments: 'id, workspaceId, vendorId, assessmentType, status, riskLevel, assessedAt, nextReviewDate, createdAt',
  dataAssets: 'id, workspaceId, classification, group, status, createdAt, lastReviewedAt',
  reports: 'id, workspaceId, type, template, period, status, generatedAt',
  users: 'id, &email, role, createdAt',
  dataMapNodes: 'id, workspaceId, type, parentId, createdAt',
  dataMapEdges: 'id, workspaceId, sourceNodeId, targetNodeId, level, parentId, createdAt',
  regulatorySources: 'id, workspaceId, authority, isActive, updatedAt',
  obligations: 'id, workspaceId, authority, status, owner, dueDate, updatedAt',
  regulatoryFeeds: 'id, workspaceId, authority, status, lastCheckedAt, createdAt',
  regulatoryEvents: 'id, workspaceId, authority, publishedAt, ingestedAt',
  regulatoryChanges: 'id, workspaceId, updateEventId, changeType, owner, reviewStatus',
  dsrCases: 'id, workspaceId, requestType, status, assignedTo, dueDate, receivedAt',
  breachWorkflows: 'id, workspaceId, incidentId, status, owner, npcNotificationDeadline, createdAt',
  ropaRecords: 'id, workspaceId, status, owner, activityName, updatedAt',
  transferAssessments: 'id, workspaceId, status, safeguardStatus, nextReviewDate, updatedAt',
  evidenceRecords: 'id, workspaceId, type, capturedAt, capturedBy, relatedEntityType, relatedEntityId',
  approvalWorkflows: 'id, workspaceId, module, entityId, status, submittedAt, decidedAt',
  submissionPacks: 'id, workspaceId, regulator, status, dueDate, submittedAt, updatedAt',
  auditEvents: 'id, workspaceId, entityType, entityId, happenedAt, actorId',
}).upgrade(async (tx) => {
  await tx.table('users').toCollection().modify((u: User) => {
    const role = (u.role in ROLE_PERMISSIONS ? u.role : 'compliance_admin') as RoleKey;
    u.role = role;
    if (!Array.isArray(u.permissions) || u.permissions.length === 0) {
      u.permissions = permissionsForRole(role);
    }
  });
});

async function digestToHex(payload: string): Promise<string> {
  const encoded = new TextEncoder().encode(payload);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function appendAuditEvent(input: Omit<AuditEvent, 'id' | 'happenedAt' | 'prevHash' | 'integrityHash'>) {
  const history = await db.auditEvents
    .where('workspaceId')
    .equals(input.workspaceId)
    .sortBy('happenedAt');
  const last = history.at(-1);
  const happenedAt = Date.now();
  const prevHash = last?.integrityHash ?? 'GENESIS';
  const integrityHash = await digestToHex([
    prevHash,
    input.workspaceId,
    input.entityType,
    input.entityId,
    input.action,
    input.actorId,
    input.actorName,
    input.details,
    String(happenedAt),
  ].join('|'));

  await db.auditEvents.add({
    id: crypto.randomUUID(),
    ...input,
    happenedAt,
    prevHash,
    integrityHash,
  });
}

/** Hash a password string using SHA-256 (client-side demo only). */
export async function hashPassword(password: string): Promise<string> {
  return digestToHex(password);
}

export { db };
