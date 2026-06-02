import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  appendAuditEvent,
  db,
  type BreachWorkflow,
  type ComplianceWorkflowStatus,
} from '@/db/db';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { Plus, ShieldAlert, ChevronLeft, Check, Pencil, Trash2, LayoutTemplate, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = ['Breach Details', 'NPC Assessment', 'Review'];
const STATUS_LABEL: Record<string, string> = { draft: 'Draft', active: 'Active', overdue: 'Overdue', completed: 'Completed', accepted_risk: 'Accepted Risk' };
const APPROVAL_LABEL: Record<string, string> = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' };

function toDateInput(v?: number) { return v ? new Date(v).toISOString().slice(0, 10) : ''; }
function fromDateInput(v: string) { return v ? new Date(v).getTime() : undefined; }

function daysUntil(ts?: number) {
  if (!ts) return null;
  const diff = Math.ceil((ts - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
}

function BreachDialog({ breach, trigger, onDone }: { breach?: BreachWorkflow; trigger: React.ReactNode; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const currentUser = useAuthStore((s) => s.user);
  const incidents = useLiveQuery(() => db.incidents.orderBy('reportedDate').reverse().toArray(), []) ?? [];

  const [f, setF] = useState({
    title: '', incidentId: 'none', owner: '',
    npcRequired: 'no', deadline: '', affectedCount: '0',
    thresholdAssessment: '', approver: '',
  });

  const handleOpen = (v: boolean) => {
    if (v && breach) {
      setF({
        title: breach.title, incidentId: breach.incidentId || 'none',
        owner: breach.owner, npcRequired: breach.npcNotificationRequired ? 'yes' : 'no',
        deadline: toDateInput(breach.npcNotificationDeadline),
        affectedCount: String(breach.affectedSubjectsCount),
        thresholdAssessment: breach.thresholdAssessment, approver: breach.approver,
      });
    } else if (v) {
      setF({ title: '', incidentId: 'none', owner: '', npcRequired: 'no', deadline: '', affectedCount: '0', thresholdAssessment: '', approver: '' });
    }
    if (v) setStep(0);
    setOpen(v);
  };

  const save = async () => {
    const data: Omit<BreachWorkflow, 'id'> = {
      workspaceId: 'ws-default',
      incidentId: f.incidentId !== 'none' ? f.incidentId : undefined,
      title: f.title,
      status: 'active' as ComplianceWorkflowStatus,
      owner: f.owner,
      detectedAt: breach?.detectedAt ?? Date.now(),
      riskToRights: true,
      affectedSubjectsCount: parseInt(f.affectedCount) || 0,
      npcNotificationRequired: f.npcRequired === 'yes',
      npcNotificationDeadline: f.npcRequired === 'yes' ? fromDateInput(f.deadline) : undefined,
      thresholdAssessment: f.thresholdAssessment || 'Pending threshold assessment',
      approver: f.approver,
      approvalStatus: 'pending',
      timeline: breach?.timeline ?? ['Workflow created'],
      evidenceIds: breach?.evidenceIds ?? [],
      createdAt: breach?.createdAt ?? Date.now(),
    };
    if (breach) {
      await db.breachWorkflows.update(breach.id, { ...data, timeline: [...(breach.timeline ?? []), `Updated at ${new Date().toLocaleString()}`] });
      toast.success('Breach workflow updated');
    } else {
      const id = crypto.randomUUID();
      await db.breachWorkflows.add({ id, ...data });
      await appendAuditEvent({ workspaceId: 'ws-default', entityType: 'breach_workflow', entityId: id, action: 'create', actorId: currentUser?.id ?? 'system', actorName: currentUser?.name ?? 'System', details: `Created breach workflow ${f.title}` });
      toast.success('Breach workflow started');
    }
    setOpen(false);
    setStep(0);
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="w-[min(100vw-1rem,1440px)] max-w-none h-[calc(100vh-1rem)] overflow-hidden p-0 sm:rounded-2xl">
        <div className="grid h-full min-h-0 lg:grid-cols-[300px_1fr]">
          <aside className="hidden min-h-0 flex-col border-r border-border/40 bg-background p-6 lg:flex">
            <div className="space-y-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                <LayoutTemplate className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-semibold tracking-tight">{breach ? 'Edit Breach Workflow' : 'New Breach Workflow'}</p>
                <p className="text-sm text-muted-foreground">Guided NPC breach assessment and notification workflow.</p>
              </div>
            </div>
            <div className="mt-8 space-y-2">
              {STEPS.map((label, index) => {
                const active = index === step;
                const complete = index < step;
                return (
                  <button key={label} onClick={() => complete && setStep(index)} className={cn('flex w-full items-center gap-3 border-l-2 px-3 py-2.5 text-left transition-colors', active ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-accent/20', !complete && 'opacity-75')}>
                    <span className={cn('flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium', complete ? 'bg-emerald-500 text-white' : active ? 'border border-primary/30 bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
                      {complete ? <Check className="h-4 w-4" /> : index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{index === 0 ? 'Core breach info' : index === 1 ? 'NPC notification assessment' : 'Final review'}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="flex min-h-0 flex-col">
            <div className="flex items-center justify-between border-b px-6 py-4 lg:px-8">
              <div>
                <p className="text-sm text-muted-foreground">Breach Workflow Builder</p>
                <h2 className="text-lg font-semibold tracking-tight">Step {step + 1} of {STEPS.length}</h2>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 lg:px-8">
              <div className="w-full space-y-6">
                {step === 0 && (
                  <div className="space-y-4">
                    <div className="space-y-2"><Label>Workflow Title</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Brief breach description" /></div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2"><Label>Owner</Label><Input value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })} placeholder="Breach manager" /></div>
                      <div className="space-y-2"><Label>Link Incident</Label>
                        <Select value={f.incidentId} onValueChange={(v) => setF({ ...f, incidentId: v })}>
                          <SelectTrigger><SelectValue placeholder="Link incident (optional)" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {incidents.map((i) => <SelectItem key={i.id} value={i.id}>{i.title}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2"><Label>Affected Data Subjects Count</Label><Input type="number" value={f.affectedCount} onChange={(e) => setF({ ...f, affectedCount: e.target.value })} /></div>
                  </div>
                )}
                {step === 1 && (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2"><Label>NPC Notification Required?</Label>
                        <Select value={f.npcRequired} onValueChange={(v) => setF({ ...f, npcRequired: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="yes">Yes — NPC notification required</SelectItem><SelectItem value="no">No notification needed</SelectItem></SelectContent>
                        </Select>
                      </div>
                      {f.npcRequired === 'yes' && (
                        <div className="space-y-2"><Label>NPC Notification Deadline</Label><Input type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} /></div>
                      )}
                    </div>
                    <div className="space-y-2"><Label>Threshold Assessment</Label><Input value={f.thresholdAssessment} onChange={(e) => setF({ ...f, thresholdAssessment: e.target.value })} placeholder="Assess if breach meets NPC notification thresholds" /></div>
                    <div className="space-y-2"><Label>Approver</Label><Input value={f.approver} onChange={(e) => setF({ ...f, approver: e.target.value })} placeholder="Person who approves NPC notification" /></div>
                  </div>
                )}
                {step === 2 && (
                  <div className="border-l border-border/40 pl-4 space-y-3">
                    {[
                      { label: 'Title', value: f.title || '—' },
                      { label: 'Owner', value: f.owner || 'Unassigned' },
                      { label: 'Linked Incident', value: f.incidentId === 'none' ? 'None' : incidents.find((i) => i.id === f.incidentId)?.title ?? f.incidentId },
                      { label: 'Affected Subjects', value: f.affectedCount },
                      { label: 'NPC Required', value: f.npcRequired === 'yes' ? 'Yes' : 'No' },
                      ...(f.npcRequired === 'yes' ? [{ label: 'NPC Deadline', value: f.deadline || 'Not set' }] : []),
                      { label: 'Approver', value: f.approver || 'Not assigned' },
                    ].map((row, index) => (
                      <div key={row.label}>
                        {index > 0 && <Separator className="mb-3" />}
                        <div className="flex justify-between items-center gap-3">
                          <span className="text-sm text-muted-foreground">{row.label}</span>
                          <span className="max-w-[320px] truncate text-right text-sm font-medium">{row.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <Button variant="outline" onClick={() => setStep((s) => Math.max(s - 1, 0))} disabled={step === 0}><ChevronLeft className="h-4 w-4" />Back</Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    {step === 2
                      ? <Button onClick={save} disabled={!f.title}>{breach ? 'Save' : 'Create Workflow'}</Button>
                      : <Button onClick={() => setStep((s) => Math.min(s + 1, STEPS.length - 1))} disabled={step === 0 ? !f.title : false}>Continue</Button>
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function BreachWorkflows() {
  const breachWorkflows = useLiveQuery(() => db.breachWorkflows.orderBy('createdAt').reverse().toArray(), []) ?? [];
  const incidents = useLiveQuery(() => db.incidents.toArray(), []) ?? [];
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return breachWorkflows;
    return breachWorkflows.filter((b) => b.approvalStatus === statusFilter);
  }, [breachWorkflows, statusFilter]);

  const pendingNPC = breachWorkflows.filter((b) => b.npcNotificationRequired && !b.npcNotificationSentAt).length;
  const activeCount = breachWorkflows.filter((b) => b.status === 'active').length;

  const del = async (id: string) => { await db.breachWorkflows.delete(id); toast.success('Breach workflow deleted'); };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Breach Workflows</h1>
          <p className="text-sm text-muted-foreground mt-1">PH data breach assessment, NPC notification, and response tracking.</p>
        </div>
        <BreachDialog trigger={<Button className="gap-2"><Plus className="h-4 w-4" /><span className="hidden sm:inline">New Workflow</span></Button>} onDone={() => {}} />
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Workflows</p><p className="text-2xl font-semibold tabular-nums">{breachWorkflows.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><div className="h-2 w-2 rounded-full bg-amber-500" /><p className="text-xs text-muted-foreground">Active</p></div><p className="text-2xl font-semibold tabular-nums">{activeCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><div className="h-2 w-2 rounded-full bg-red-500" /><p className="text-xs text-muted-foreground">Pending NPC</p></div><p className="text-2xl font-semibold tabular-nums text-red-500">{pendingNPC}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Completed</p><p className="text-2xl font-semibold tabular-nums">{breachWorkflows.filter((b) => b.status === 'completed').length}</p></CardContent></Card>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
        {[
          { value: 'all', label: 'All' },
          { value: 'pending', label: 'Pending Approval' },
          { value: 'approved', label: 'Approved' },
          { value: 'rejected', label: 'Rejected' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors shrink-0',
              statusFilter === tab.value ? 'bg-foreground text-background border-foreground' : 'bg-background text-muted-foreground border-border hover:bg-accent'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <EmptyState icon={ShieldAlert} title="No breach workflows" description="Start a new breach workflow to track a data breach response." className="py-16" />
        ) : (
          filtered.map((b) => {
            const incident = b.incidentId ? incidents.find((i) => i.id === b.incidentId) : null;
            const deadline = daysUntil(b.npcNotificationDeadline);
            return (
              <Card key={b.id}>
                <CardContent className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{b.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Owner: {b.owner || 'Unassigned'}
                        {incident && <> · Incident: {incident.title}</>}
                        {b.affectedSubjectsCount > 0 && <> · {b.affectedSubjectsCount} subjects affected</>}
                      </p>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <Badge variant={b.status === 'overdue' ? 'destructive' : 'secondary'}>{STATUS_LABEL[b.status] ?? b.status}</Badge>
                        <Badge variant={b.approvalStatus === 'pending' ? 'outline' : b.approvalStatus === 'approved' ? 'default' : 'destructive'}>{APPROVAL_LABEL[b.approvalStatus]}</Badge>
                        {b.npcNotificationRequired && (
                          <Badge variant={deadline !== null && deadline <= 0 ? 'destructive' : 'outline'} className="gap-1">
                            <Clock className="h-3 w-3" />
                            NPC {deadline !== null ? (deadline <= 0 ? 'OVERDUE' : `${deadline}d left`) : 'Required'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {b.timeline && b.timeline.length > 0 && (
                    <div className="rounded-md border p-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Timeline</p>
                      <div className="space-y-1">
                        {b.timeline.slice(-3).map((entry, i) => (
                          <p key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30 shrink-0" />
                            {entry}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-1 flex-wrap">
                    <BreachDialog breach={b} trigger={<Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs"><Pencil className="h-3 w-3" />Edit</Button>} onDone={() => {}} />
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive gap-1.5 h-8 text-xs" onClick={() => del(b.id)}><Trash2 className="h-3 w-3" />Delete</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
