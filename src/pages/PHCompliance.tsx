import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  appendAuditEvent,
  db,
  permissionsForRole,
  type ApprovalWorkflow,
  type BreachWorkflow,
  type ComplianceObligation,
  type ComplianceWorkflowStatus,
  type DSRCase,
  type DSRRequestType,
  type PermissionKey,
  type RegulatoryChangeRecord,
  type RegulatorySource,
  type RegulatoryUpdateEvent,
  type RoleKey,
  type ROPARecord,
  type SubmissionPack,
  type TransferAssessment,
} from '@/db/db';
import { PH_OBLIGATIONS_LIBRARY, obligationFromTemplate } from '@/lib/phObligationsLibrary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';

const AUTHORITY_OPTIONS: RegulatorySource['authority'][] = ['NPC', 'AMLC', 'BSP', 'SEC', 'OTHER'];
const ROLE_OPTIONS: RoleKey[] = ['compliance_admin', 'compliance_manager', 'breach_manager', 'dsr_handler', 'auditor', 'approver', 'user'];
const HASH_DISPLAY_LENGTH = 18;

function toDateInput(value?: number) {
  return value ? new Date(value).toISOString().slice(0, 10) : '';
}

function fromDateInput(value: string) {
  return value ? new Date(value).getTime() : undefined;
}

export default function PHCompliance() {
  const currentUser = useAuthStore((s) => s.user);
  const obligations = useLiveQuery(() => db.obligations.orderBy('updatedAt').reverse().toArray(), []) ?? [];
  const updates = useLiveQuery(() => db.regulatoryEvents.orderBy('ingestedAt').reverse().toArray(), []) ?? [];
  const feeds = useLiveQuery(() => db.regulatoryFeeds.orderBy('createdAt').reverse().toArray(), []) ?? [];
  const changeRecords = useLiveQuery(() => db.regulatoryChanges.orderBy('updateEventId').toArray(), []) ?? [];
  const breachWorkflows = useLiveQuery(() => db.breachWorkflows.orderBy('createdAt').reverse().toArray(), []) ?? [];
  const dsrCases = useLiveQuery(() => db.dsrCases.orderBy('receivedAt').reverse().toArray(), []) ?? [];
  const ropaRecords = useLiveQuery(() => db.ropaRecords.orderBy('updatedAt').reverse().toArray(), []) ?? [];
  const transferAssessments = useLiveQuery(() => db.transferAssessments.orderBy('updatedAt').reverse().toArray(), []) ?? [];
  const evidence = useLiveQuery(() => db.evidenceRecords.orderBy('capturedAt').reverse().toArray(), []) ?? [];
  const approvals = useLiveQuery(() => db.approvalWorkflows.orderBy('submittedAt').reverse().toArray(), []) ?? [];
  const submissionPacks = useLiveQuery(() => db.submissionPacks.orderBy('updatedAt').reverse().toArray(), []) ?? [];
  const users = useLiveQuery(() => db.users.orderBy('createdAt').reverse().toArray(), []) ?? [];
  const incidents = useLiveQuery(() => db.incidents.orderBy('reportedDate').reverse().toArray(), []) ?? [];
  const auditEvents = useLiveQuery(() => db.auditEvents.orderBy('happenedAt').reverse().limit(20).toArray(), []) ?? [];

  const [obligationForm, setObligationForm] = useState({
    title: '',
    code: '',
    authority: 'NPC' as RegulatorySource['authority'],
    owner: '',
    dueDate: '',
    status: 'draft' as ComplianceWorkflowStatus,
    requiredEvidence: '',
  });
  const [updateForm, setUpdateForm] = useState({ authority: 'NPC' as RegulatorySource['authority'], title: '', summary: '', publishedAt: '' });
  const [feedForm, setFeedForm] = useState({ authority: 'NPC' as RegulatorySource['authority'], connectorType: 'manual' as 'rss' | 'manual' | 'api', endpoint: '' });
  const [breachForm, setBreachForm] = useState({ title: '', incidentId: 'none', owner: '', npcRequired: 'no', deadline: '' });
  const [dsrForm, setDsrForm] = useState({ requesterName: '', requesterEmail: '', requestType: 'access' as DSRRequestType, assignedTo: '', dueDate: '' });
  const [ropaForm, setRopaForm] = useState({ activityName: '', owner: '', legalBasis: '', retentionPeriod: '' });
  const [transferForm, setTransferForm] = useState({ transferName: '', destinationCountry: '', mechanism: '', legalBasis: '', nextReviewDate: '' });
  const [evidenceForm, setEvidenceForm] = useState({ title: '', description: '', uri: '', checksum: '', capturedBy: '' });
  const [approvalForm, setApprovalForm] = useState({ module: 'obligation' as ApprovalWorkflow['module'], entityId: '', action: '', maker: '', checker: '' });
  const [submissionForm, setSubmissionForm] = useState({
    regulator: 'NPC' as RegulatorySource['authority'],
    title: '',
    dueDate: '',
    checklist: '',
    obligationIds: '',
    incidentIds: '',
    dsrCaseIds: '',
    ropaIds: '',
    evidenceIds: '',
  });

  const overdueObligations = obligations.filter((item) => item.dueDate && item.dueDate < Date.now() && item.status !== 'completed');

  async function audit(entityType: string, entityId: string, action: string, details: string) {
    const actorId = currentUser?.id ?? 'system';
    const actorName = currentUser?.name ?? 'System';
    await appendAuditEvent({
      workspaceId: 'ws-default',
      entityType,
      entityId,
      action,
      actorId,
      actorName,
      details,
    });
  }

  async function seedLibrary() {
    const now = Date.now();
    const sourceMap = new Map<string, string>();
    await db.transaction('rw', [db.regulatorySources, db.obligations], async () => {
      const existingSources = await db.regulatorySources.where('workspaceId').equals('ws-default').toArray();
      for (const template of PH_OBLIGATIONS_LIBRARY) {
        const key = `${template.authority}|${template.legalBasis}|${template.sourceTitle}`;
        let sourceId = sourceMap.get(key);
        if (!sourceId) {
          const match = existingSources.find((source) =>
            source.authority === template.authority &&
            source.legalBasis === template.legalBasis &&
            source.title === template.sourceTitle
          );
          if (match) {
            sourceId = match.id;
          } else {
            sourceId = crypto.randomUUID();
            await db.regulatorySources.add({
              id: sourceId,
              workspaceId: 'ws-default',
              authority: template.authority,
              legalBasis: template.legalBasis,
              title: template.sourceTitle,
              applicability: template.applicability,
              trigger: template.trigger,
              cadence: template.cadence,
              requiredEvidence: template.requiredEvidence,
              isActive: true,
              createdAt: now,
              updatedAt: now,
            });
          }
          sourceMap.set(key, sourceId);
        }

        const existingObligation = await db.obligations.where('code').equals(template.code).first();
        if (!existingObligation) {
          await db.obligations.add({
            id: crypto.randomUUID(),
            ...obligationFromTemplate(template, sourceId),
          });
        }
      }
    });
    await audit('obligation_library', 'ph', 'seed', 'Seeded PH obligations library');
    toast.success('PH obligations library seeded');
  }

  async function addObligation() {
    const record: ComplianceObligation = {
      id: crypto.randomUUID(),
      workspaceId: 'ws-default',
      code: obligationForm.code || `OB-${Date.now()}`,
      authority: obligationForm.authority,
      title: obligationForm.title,
      applicability: 'Organization-specific',
      trigger: 'Periodic compliance monitoring',
      cadence: 'Monthly',
      owner: obligationForm.owner,
      status: obligationForm.status,
      dueDate: fromDateInput(obligationForm.dueDate),
      escalationLevel: 'none',
      requiredEvidence: obligationForm.requiredEvidence.split(',').map((item) => item.trim()).filter(Boolean),
      linkedPolicyIds: [],
      linkedControlIds: [],
      linkedTaskIds: [],
      evidenceIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.obligations.add(record);
    await audit('obligation', record.id, 'create', `Created obligation ${record.code}`);
    setObligationForm((prev) => ({ ...prev, title: '', code: '', requiredEvidence: '' }));
    toast.success('Obligation added');
  }

  async function escalateOverdue() {
    if (!overdueObligations.length) return;
    await db.transaction('rw', [db.obligations], async () => {
      for (const item of overdueObligations) {
        await db.obligations.update(item.id, { status: 'overdue', escalationLevel: 'manager', updatedAt: Date.now() });
      }
    });
    await audit('obligation', 'batch-overdue', 'escalate', `Escalated ${overdueObligations.length} overdue obligations`);
    toast.success('Overdue obligations escalated');
  }

  async function ingestUpdate() {
    const event: RegulatoryUpdateEvent = {
      id: crypto.randomUUID(),
      workspaceId: 'ws-default',
      authority: updateForm.authority,
      title: updateForm.title,
      summary: updateForm.summary,
      publishedAt: fromDateInput(updateForm.publishedAt) ?? Date.now(),
      ingestedAt: Date.now(),
    };
    await db.regulatoryEvents.add(event);

    const impacted = obligations.filter((item) => item.authority === event.authority);
    const change: RegulatoryChangeRecord = {
      id: crypto.randomUUID(),
      workspaceId: 'ws-default',
      updateEventId: event.id,
      obligationCode: impacted.length === 1 ? impacted[0]?.code : undefined,
      changeType: 'amended',
      impactSummary: `${event.title} mapped to ${impacted.length} obligation(s)`,
      impactedObligationIds: impacted.map((item) => item.id),
      impactedControlIds: [],
      owner: new Set(impacted.map((item) => item.owner).filter(Boolean)).size === 1
        ? (impacted[0]?.owner ?? 'Unassigned')
        : 'Multiple owners',
      reviewStatus: 'queued',
    };
    await db.regulatoryChanges.add(change);
    await audit('regulatory_update', event.id, 'ingest', `Ingested ${event.authority} update`);
    setUpdateForm({ authority: 'NPC', title: '', summary: '', publishedAt: '' });
    toast.success('Regulatory update ingested and mapped');
  }

  async function addFeed() {
    const feedId = crypto.randomUUID();
    await db.regulatoryFeeds.add({
      id: feedId,
      workspaceId: 'ws-default',
      authority: feedForm.authority,
      connectorType: feedForm.connectorType,
      endpoint: feedForm.endpoint,
      status: 'active',
      lastCheckedAt: Date.now(),
      createdAt: Date.now(),
    });
    await audit('regulatory_feed', feedId, 'create', `Configured ${feedForm.authority} ${feedForm.connectorType} connector`);
    setFeedForm({ authority: 'NPC', connectorType: 'manual', endpoint: '' });
    toast.success('Regulatory feed connector saved');
  }

  async function addBreachWorkflow() {
    const data: BreachWorkflow = {
      id: crypto.randomUUID(),
      workspaceId: 'ws-default',
      incidentId: breachForm.incidentId !== 'none' ? breachForm.incidentId : undefined,
      title: breachForm.title,
      status: 'active',
      owner: breachForm.owner,
      detectedAt: Date.now(),
      riskToRights: true,
      affectedSubjectsCount: 0,
      npcNotificationRequired: breachForm.npcRequired === 'yes',
      npcNotificationDeadline: breachForm.npcRequired === 'yes' ? fromDateInput(breachForm.deadline) : undefined,
      thresholdAssessment: 'Pending threshold assessment',
      approver: '',
      approvalStatus: 'pending',
      timeline: ['Workflow created'],
      evidenceIds: [],
      createdAt: Date.now(),
    };
    await db.breachWorkflows.add(data);
    await audit('breach_workflow', data.id, 'create', `Created breach workflow ${data.title}`);
    setBreachForm({ title: '', incidentId: 'none', owner: '', npcRequired: 'no', deadline: '' });
    toast.success('Breach workflow started');
  }

  async function addDsrCase() {
    const dueDate = fromDateInput(dsrForm.dueDate) ?? Date.now();
    const record: DSRCase = {
      id: crypto.randomUUID(),
      workspaceId: 'ws-default',
      requestType: dsrForm.requestType,
      requesterName: dsrForm.requesterName,
      requesterEmail: dsrForm.requesterEmail,
      status: 'intake',
      assignedTo: dsrForm.assignedTo,
      receivedAt: Date.now(),
      dueDate,
      escalationLevel: 'none',
      evidenceIds: [],
      decisionLog: ['Case opened'],
    };
    await db.dsrCases.add(record);
    await audit('dsr_case', record.id, 'create', `Opened DSR case for ${record.requesterEmail}`);
    setDsrForm({ requesterName: '', requesterEmail: '', requestType: 'access', assignedTo: '', dueDate: '' });
    toast.success('DSR case created');
  }

  async function addRopaRecord() {
    const item: ROPARecord = {
      id: crypto.randomUUID(),
      workspaceId: 'ws-default',
      activityName: ropaForm.activityName,
      owner: ropaForm.owner,
      status: 'active',
      legalBasis: ropaForm.legalBasis,
      dataSubjects: '',
      dataCategories: '',
      recipients: '',
      transferBasis: '',
      retentionPeriod: ropaForm.retentionPeriod,
      disposalMethod: '',
      linkedIncidentIds: [],
      linkedAssessmentIds: [],
      linkedVendorIds: [],
      linkedPolicyIds: [],
      evidenceIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.ropaRecords.add(item);
    await audit('ropa_record', item.id, 'create', `Created ROPA record ${item.activityName}`);
    setRopaForm({ activityName: '', owner: '', legalBasis: '', retentionPeriod: '' });
    toast.success('ROPA record added');
  }

  async function addTransferAssessment() {
    const item: TransferAssessment = {
      id: crypto.randomUUID(),
      workspaceId: 'ws-default',
      transferName: transferForm.transferName,
      destinationCountry: transferForm.destinationCountry,
      mechanism: transferForm.mechanism,
      legalBasis: transferForm.legalBasis,
      safeguardStatus: 'valid',
      status: 'active',
      reviewDate: Date.now(),
      nextReviewDate: fromDateInput(transferForm.nextReviewDate),
      remediationTaskIds: [],
      evidenceIds: [],
      notes: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.transferAssessments.add(item);
    await audit('transfer_assessment', item.id, 'create', `Created transfer assessment ${item.transferName}`);
    setTransferForm({ transferName: '', destinationCountry: '', mechanism: '', legalBasis: '', nextReviewDate: '' });
    toast.success('Transfer assessment added');
  }

  async function addEvidence() {
    const itemId = crypto.randomUUID();
    await db.evidenceRecords.add({
      id: itemId,
      workspaceId: 'ws-default',
      title: evidenceForm.title,
      type: 'document',
      description: evidenceForm.description,
      uri: evidenceForm.uri,
      checksum: evidenceForm.checksum,
      hashAlgorithm: 'sha256',
      immutable: true,
      chainOfCustody: [`Captured by ${evidenceForm.capturedBy || 'Unknown'}`],
      capturedAt: Date.now(),
      capturedBy: evidenceForm.capturedBy || 'Unknown',
    });
    await audit('evidence_record', itemId, 'create', `Added evidence ${evidenceForm.title}`);
    setEvidenceForm({ title: '', description: '', uri: '', checksum: '', capturedBy: '' });
    toast.success('Evidence saved');
  }

  async function addApproval() {
    const itemId = crypto.randomUUID();
    await db.approvalWorkflows.add({
      id: itemId,
      workspaceId: 'ws-default',
      module: approvalForm.module,
      entityId: approvalForm.entityId,
      action: approvalForm.action,
      maker: approvalForm.maker,
      checker: approvalForm.checker,
      status: 'pending',
      submittedAt: Date.now(),
    });
    await audit('approval_workflow', itemId, 'create', `Created maker-checker request for ${approvalForm.module}`);
    setApprovalForm({ module: 'obligation', entityId: '', action: '', maker: '', checker: '' });
    toast.success('Approval workflow created');
  }

  async function updateUserRole(userId: string, role: RoleKey) {
    const permissions: PermissionKey[] = permissionsForRole(role);
    await db.users.update(userId, { role, permissions });
    await audit('user_role', userId, 'update', `Updated user role to ${role}`);
    toast.success('Role updated');
  }

  async function addSubmissionPack() {
    const parseIds = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean);
    const pack: SubmissionPack = {
      id: crypto.randomUUID(),
      workspaceId: 'ws-default',
      regulator: submissionForm.regulator,
      title: submissionForm.title,
      status: 'draft',
      dueDate: fromDateInput(submissionForm.dueDate),
      checklist: submissionForm.checklist.split(',').map((item) => item.trim()).filter(Boolean),
      includedObligationIds: parseIds(submissionForm.obligationIds),
      includedIncidentIds: parseIds(submissionForm.incidentIds),
      includedDSRCaseIds: parseIds(submissionForm.dsrCaseIds),
      includedROPAIds: parseIds(submissionForm.ropaIds),
      evidenceIds: parseIds(submissionForm.evidenceIds),
      notes: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.submissionPacks.add(pack);
    await audit('submission_pack', pack.id, 'create', `Created ${pack.regulator} submission pack`);
    setSubmissionForm({
      regulator: 'NPC',
      title: '',
      dueDate: '',
      checklist: '',
      obligationIds: '',
      incidentIds: '',
      dsrCaseIds: '',
      ropaIds: '',
      evidenceIds: '',
    });
    toast.success('Submission pack created');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">PH Compliance Hub</h1>
          <p className="text-sm text-muted-foreground mt-1">Obligations, regulatory updates, breach/DSR workflows, ROPA, transfers, evidence, access control, and regulator submissions.</p>
        </div>
        <Button onClick={seedLibrary}>Seed PH Obligations Library</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Obligations</p><p className="text-xl font-semibold">{obligations.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Overdue</p><p className="text-xl font-semibold text-red-500">{overdueObligations.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Open DSR Cases</p><p className="text-xl font-semibold">{dsrCases.filter((item) => !['closed', 'fulfilled'].includes(item.status)).length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Audit Events</p><p className="text-xl font-semibold">{auditEvents.length}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="obligations">
        <TabsList>
          <TabsTrigger value="obligations">Obligations</TabsTrigger>
          <TabsTrigger value="updates">Updates</TabsTrigger>
          <TabsTrigger value="breach-dsr">Breach / DSR</TabsTrigger>
          <TabsTrigger value="ropa-transfer">ROPA / Transfers</TabsTrigger>
          <TabsTrigger value="evidence-access">Evidence / Access</TabsTrigger>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
        </TabsList>

        <TabsContent value="obligations" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Compliance Obligations Register</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                <Input placeholder="Code" value={obligationForm.code} onChange={(e) => setObligationForm((prev) => ({ ...prev, code: e.target.value }))} />
                <Input placeholder="Owner" value={obligationForm.owner} onChange={(e) => setObligationForm((prev) => ({ ...prev, owner: e.target.value }))} />
                <Input type="date" value={obligationForm.dueDate} onChange={(e) => setObligationForm((prev) => ({ ...prev, dueDate: e.target.value }))} />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Input className="md:col-span-2" placeholder="Obligation title" value={obligationForm.title} onChange={(e) => setObligationForm((prev) => ({ ...prev, title: e.target.value }))} />
                <Select value={obligationForm.authority} onValueChange={(value) => setObligationForm((prev) => ({ ...prev, authority: value as RegulatorySource['authority'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{AUTHORITY_OPTIONS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Textarea placeholder="Required evidence (comma-separated)" value={obligationForm.requiredEvidence} onChange={(e) => setObligationForm((prev) => ({ ...prev, requiredEvidence: e.target.value }))} />
              <div className="flex flex-wrap gap-2">
                <Button onClick={addObligation} disabled={!obligationForm.title}>Add obligation</Button>
                <Button variant="outline" onClick={escalateOverdue} disabled={!overdueObligations.length}>Escalate overdue</Button>
              </div>
              <div className="space-y-2">
                {obligations.slice(0, 8).map((item) => (
                  <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm">
                    <div>
                      <p className="font-medium">{item.code} — {item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.owner || 'Unassigned'} · due {toDateInput(item.dueDate) || 'n/a'} · evidence {item.evidenceIds.length}</p>
                    </div>
                    <Badge variant={item.status === 'overdue' ? 'destructive' : 'secondary'}>{item.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="updates" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Regulatory Feed Connectors</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                <Select value={feedForm.authority} onValueChange={(value) => setFeedForm((prev) => ({ ...prev, authority: value as RegulatorySource['authority'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{AUTHORITY_OPTIONS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={feedForm.connectorType} onValueChange={(value) => setFeedForm((prev) => ({ ...prev, connectorType: value as 'rss' | 'manual' | 'api' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="manual">manual</SelectItem><SelectItem value="rss">rss</SelectItem><SelectItem value="api">api</SelectItem></SelectContent>
                </Select>
                <Input placeholder="Endpoint / source URL" value={feedForm.endpoint} onChange={(e) => setFeedForm((prev) => ({ ...prev, endpoint: e.target.value }))} />
              </div>
              <Button onClick={addFeed} disabled={!feedForm.endpoint}>Save feed connector</Button>
              <div className="space-y-2">
                {feeds.slice(0, 5).map((feed) => (
                  <div key={feed.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                    <div>
                      <p className="font-medium">{feed.authority} · {feed.connectorType}</p>
                      <p className="text-xs text-muted-foreground">{feed.endpoint}</p>
                    </div>
                    <Badge variant="secondary">{feed.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Regulatory Update Ingestion + Impact Mapping</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                <Select value={updateForm.authority} onValueChange={(value) => setUpdateForm((prev) => ({ ...prev, authority: value as RegulatorySource['authority'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{AUTHORITY_OPTIONS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="date" value={updateForm.publishedAt} onChange={(e) => setUpdateForm((prev) => ({ ...prev, publishedAt: e.target.value }))} />
                <Input placeholder="Update title" value={updateForm.title} onChange={(e) => setUpdateForm((prev) => ({ ...prev, title: e.target.value }))} />
              </div>
              <Textarea placeholder="Change summary" value={updateForm.summary} onChange={(e) => setUpdateForm((prev) => ({ ...prev, summary: e.target.value }))} />
              <Button onClick={ingestUpdate} disabled={!updateForm.title}>Ingest and map</Button>
              <div className="space-y-2">
                {updates.slice(0, 6).map((event) => {
                  const mapped = changeRecords.find((item) => item.updateEventId === event.id);
                  return (
                    <div key={event.id} className="rounded-md border p-2 text-sm">
                      <p className="font-medium">{event.authority} · {event.title}</p>
                      <p className="text-xs text-muted-foreground">{event.summary}</p>
                      {mapped && <p className="text-xs mt-1">Impact: {mapped.impactSummary}</p>}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breach-dsr" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">PH Data Breach Legal Workflow</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <Input placeholder="Workflow title" value={breachForm.title} onChange={(e) => setBreachForm((prev) => ({ ...prev, title: e.target.value }))} />
                <Input placeholder="Owner" value={breachForm.owner} onChange={(e) => setBreachForm((prev) => ({ ...prev, owner: e.target.value }))} />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Select value={breachForm.incidentId} onValueChange={(value) => setBreachForm((prev) => ({ ...prev, incidentId: value }))}>
                  <SelectTrigger><SelectValue placeholder="Link incident (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {incidents.map((item) => <SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={breachForm.npcRequired} onValueChange={(value) => setBreachForm((prev) => ({ ...prev, npcRequired: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="yes">NPC notification required</SelectItem><SelectItem value="no">No notification</SelectItem></SelectContent>
                </Select>
                <Input type="date" value={breachForm.deadline} onChange={(e) => setBreachForm((prev) => ({ ...prev, deadline: e.target.value }))} />
              </div>
              <Button onClick={addBreachWorkflow} disabled={!breachForm.title}>Create breach workflow</Button>
              <div className="space-y-2">
                {breachWorkflows.slice(0, 6).map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">Owner: {item.owner || 'Unassigned'} · NPC deadline: {toDateInput(item.npcNotificationDeadline) || 'n/a'}</p>
                    </div>
                    <Badge variant={item.approvalStatus === 'pending' ? 'outline' : 'secondary'}>{item.approvalStatus}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Data Subject Rights Case Management</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <Input placeholder="Requester name" value={dsrForm.requesterName} onChange={(e) => setDsrForm((prev) => ({ ...prev, requesterName: e.target.value }))} />
                <Input placeholder="Requester email" value={dsrForm.requesterEmail} onChange={(e) => setDsrForm((prev) => ({ ...prev, requesterEmail: e.target.value }))} />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Select value={dsrForm.requestType} onValueChange={(value) => setDsrForm((prev) => ({ ...prev, requestType: value as DSRRequestType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="access">Access</SelectItem>
                    <SelectItem value="correction">Correction</SelectItem>
                    <SelectItem value="erasure_blocking">Erasure/Blocking</SelectItem>
                    <SelectItem value="objection">Objection</SelectItem>
                    <SelectItem value="portability">Portability</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Assigned to" value={dsrForm.assignedTo} onChange={(e) => setDsrForm((prev) => ({ ...prev, assignedTo: e.target.value }))} />
                <Input type="date" value={dsrForm.dueDate} onChange={(e) => setDsrForm((prev) => ({ ...prev, dueDate: e.target.value }))} />
              </div>
              <Button onClick={addDsrCase} disabled={!dsrForm.requesterEmail}>Open DSR case</Button>
              <div className="space-y-2">
                {dsrCases.slice(0, 6).map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                    <div>
                      <p className="font-medium">{item.requestType} · {item.requesterEmail}</p>
                      <p className="text-xs text-muted-foreground">Assigned to {item.assignedTo || 'Unassigned'} · due {toDateInput(item.dueDate)}</p>
                    </div>
                    <Badge variant={item.status === 'overdue' ? 'destructive' : 'secondary'}>{item.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ropa-transfer" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">ROPA + Lawful Basis Governance</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <Input placeholder="Processing activity" value={ropaForm.activityName} onChange={(e) => setRopaForm((prev) => ({ ...prev, activityName: e.target.value }))} />
                <Input placeholder="Owner" value={ropaForm.owner} onChange={(e) => setRopaForm((prev) => ({ ...prev, owner: e.target.value }))} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Input placeholder="Legal basis" value={ropaForm.legalBasis} onChange={(e) => setRopaForm((prev) => ({ ...prev, legalBasis: e.target.value }))} />
                <Input placeholder="Retention / disposal" value={ropaForm.retentionPeriod} onChange={(e) => setRopaForm((prev) => ({ ...prev, retentionPeriod: e.target.value }))} />
              </div>
              <Button onClick={addRopaRecord} disabled={!ropaForm.activityName}>Add ROPA record</Button>
              <div className="space-y-2">
                {ropaRecords.slice(0, 6).map((item) => (
                  <div key={item.id} className="rounded-md border p-2 text-sm">
                    <p className="font-medium">{item.activityName}</p>
                    <p className="text-xs text-muted-foreground">{item.legalBasis || 'No legal basis'} · retention {item.retentionPeriod || 'n/a'}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Cross-Border Transfer Controls</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <Input placeholder="Transfer name" value={transferForm.transferName} onChange={(e) => setTransferForm((prev) => ({ ...prev, transferName: e.target.value }))} />
                <Input placeholder="Destination country" value={transferForm.destinationCountry} onChange={(e) => setTransferForm((prev) => ({ ...prev, destinationCountry: e.target.value }))} />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Input placeholder="Mechanism / contract" value={transferForm.mechanism} onChange={(e) => setTransferForm((prev) => ({ ...prev, mechanism: e.target.value }))} />
                <Input placeholder="Lawful basis" value={transferForm.legalBasis} onChange={(e) => setTransferForm((prev) => ({ ...prev, legalBasis: e.target.value }))} />
                <Input type="date" value={transferForm.nextReviewDate} onChange={(e) => setTransferForm((prev) => ({ ...prev, nextReviewDate: e.target.value }))} />
              </div>
              <Button onClick={addTransferAssessment} disabled={!transferForm.transferName}>Add transfer assessment</Button>
              <div className="space-y-2">
                {transferAssessments.slice(0, 6).map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                    <div>
                      <p className="font-medium">{item.transferName}</p>
                      <p className="text-xs text-muted-foreground">{item.destinationCountry} · review {toDateInput(item.nextReviewDate) || 'n/a'}</p>
                    </div>
                    <Badge variant={item.safeguardStatus === 'missing' ? 'destructive' : 'secondary'}>{item.safeguardStatus}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evidence-access" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Audit-Grade Evidence + Immutable Trail</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <Input placeholder="Evidence title" value={evidenceForm.title} onChange={(e) => setEvidenceForm((prev) => ({ ...prev, title: e.target.value }))} />
                <Input placeholder="Captured by" value={evidenceForm.capturedBy} onChange={(e) => setEvidenceForm((prev) => ({ ...prev, capturedBy: e.target.value }))} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Input placeholder="Storage URI" value={evidenceForm.uri} onChange={(e) => setEvidenceForm((prev) => ({ ...prev, uri: e.target.value }))} />
                <Input placeholder="Checksum" value={evidenceForm.checksum} onChange={(e) => setEvidenceForm((prev) => ({ ...prev, checksum: e.target.value }))} />
              </div>
              <Textarea placeholder="Description" value={evidenceForm.description} onChange={(e) => setEvidenceForm((prev) => ({ ...prev, description: e.target.value }))} />
              <Button onClick={addEvidence} disabled={!evidenceForm.title}>Add evidence</Button>
              <div className="space-y-2">
                {evidence.slice(0, 6).map((item) => (
                  <div key={item.id} className="rounded-md border p-2 text-sm">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.capturedBy} · {new Date(item.capturedAt).toLocaleString()} · {item.checksum}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Advanced Access Control + Maker-Checker</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Role assignments</Label>
                {users.map((user) => (
                  <div key={user.id} className="grid items-center gap-2 rounded-md border p-2 text-sm md:grid-cols-[1fr_220px_1fr]">
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <Select value={user.role} onValueChange={(value) => void updateUserRole(user.id, value as RoleKey)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{ROLE_OPTIONS.map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}</SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">{(user.permissions ?? []).join(', ') || 'No permissions'}</p>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Input placeholder="Entity ID" value={approvalForm.entityId} onChange={(e) => setApprovalForm((prev) => ({ ...prev, entityId: e.target.value }))} />
                <Input placeholder="Action" value={approvalForm.action} onChange={(e) => setApprovalForm((prev) => ({ ...prev, action: e.target.value }))} />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Select value={approvalForm.module} onValueChange={(value) => setApprovalForm((prev) => ({ ...prev, module: value as ApprovalWorkflow['module'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="obligation">obligation</SelectItem>
                    <SelectItem value="breach">breach</SelectItem>
                    <SelectItem value="submission">submission</SelectItem>
                    <SelectItem value="transfer">transfer</SelectItem>
                    <SelectItem value="dsr">dsr</SelectItem>
                    <SelectItem value="ropa">ropa</SelectItem>
                    <SelectItem value="other">other</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Maker" value={approvalForm.maker} onChange={(e) => setApprovalForm((prev) => ({ ...prev, maker: e.target.value }))} />
                <Input placeholder="Checker" value={approvalForm.checker} onChange={(e) => setApprovalForm((prev) => ({ ...prev, checker: e.target.value }))} />
              </div>
              <Button onClick={addApproval} disabled={!approvalForm.entityId || !approvalForm.checker}>Create maker-checker request</Button>
              <div className="space-y-2">
                {approvals.slice(0, 6).map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                    <div>
                      <p className="font-medium">{item.module} · {item.action || 'Approval'}</p>
                      <p className="text-xs text-muted-foreground">Maker {item.maker || 'n/a'} · Checker {item.checker || 'n/a'}</p>
                    </div>
                    <Badge variant={item.status === 'pending' ? 'outline' : 'secondary'}>{item.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submissions" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Regulator-Ready Submission Packs</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                <Select value={submissionForm.regulator} onValueChange={(value) => setSubmissionForm((prev) => ({ ...prev, regulator: value as RegulatorySource['authority'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{AUTHORITY_OPTIONS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="Pack title" value={submissionForm.title} onChange={(e) => setSubmissionForm((prev) => ({ ...prev, title: e.target.value }))} />
                <Input type="date" value={submissionForm.dueDate} onChange={(e) => setSubmissionForm((prev) => ({ ...prev, dueDate: e.target.value }))} />
              </div>
              <Textarea placeholder="Checklist (comma-separated)" value={submissionForm.checklist} onChange={(e) => setSubmissionForm((prev) => ({ ...prev, checklist: e.target.value }))} />
              <div className="grid gap-3 md:grid-cols-2">
                <Input placeholder="Obligation IDs (comma-separated)" value={submissionForm.obligationIds} onChange={(e) => setSubmissionForm((prev) => ({ ...prev, obligationIds: e.target.value }))} />
                <Input placeholder="Incident IDs (comma-separated)" value={submissionForm.incidentIds} onChange={(e) => setSubmissionForm((prev) => ({ ...prev, incidentIds: e.target.value }))} />
                <Input placeholder="DSR case IDs (comma-separated)" value={submissionForm.dsrCaseIds} onChange={(e) => setSubmissionForm((prev) => ({ ...prev, dsrCaseIds: e.target.value }))} />
                <Input placeholder="ROPA IDs (comma-separated)" value={submissionForm.ropaIds} onChange={(e) => setSubmissionForm((prev) => ({ ...prev, ropaIds: e.target.value }))} />
                <Input className="md:col-span-2" placeholder="Evidence IDs (comma-separated)" value={submissionForm.evidenceIds} onChange={(e) => setSubmissionForm((prev) => ({ ...prev, evidenceIds: e.target.value }))} />
              </div>
              <Button onClick={addSubmissionPack} disabled={!submissionForm.title}>Create submission pack</Button>
              <div className="space-y-2">
                {submissionPacks.slice(0, 8).map((pack) => (
                  <div key={pack.id} className="rounded-md border p-2 text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{pack.regulator} · {pack.title}</p>
                      <Badge variant={pack.status === 'submitted' ? 'default' : 'secondary'}>{pack.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      obligations {pack.includedObligationIds.length} · incidents {pack.includedIncidentIds.length} · dsr {pack.includedDSRCaseIds.length} · ropa {pack.includedROPAIds.length} · evidence {pack.evidenceIds.length}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Recent Immutable Audit Trail</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {auditEvents.map((item) => (
                <div key={item.id} className="rounded-md border p-2 text-xs">
                  <p className="font-medium">{item.entityType} · {item.action}</p>
                  <p className="text-muted-foreground">{item.actorName} · {new Date(item.happenedAt).toLocaleString()}</p>
                  <p className="text-muted-foreground">hash {item.integrityHash.slice(0, HASH_DISPLAY_LENGTH)}… prev {item.prevHash.slice(0, HASH_DISPLAY_LENGTH)}…</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
