import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  appendAuditEvent,
  db,
  type ComplianceObligation,
  type ComplianceWorkflowStatus,
  type RegulatorySource,
} from '@/db/db';
import { PH_OBLIGATIONS_LIBRARY, obligationFromTemplate } from '@/lib/phObligationsLibrary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { Plus, Scale, AlertTriangle, ChevronLeft, Check, Pencil, Trash2, Download, LayoutTemplate, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const AUTHORITY_OPTIONS: RegulatorySource['authority'][] = ['NPC', 'AMLC', 'BSP', 'SEC', 'OTHER'];
const STATUS_OPTIONS: ComplianceWorkflowStatus[] = ['draft', 'active', 'overdue', 'completed', 'accepted_risk'];
const STATUS_LABEL: Record<string, string> = { draft: 'Draft', active: 'Active', overdue: 'Overdue', completed: 'Completed', accepted_risk: 'Accepted Risk' };
const STEPS = ['Details', 'Evidence & Links', 'Review'];

function toDateInput(value?: number) {
  return value ? new Date(value).toISOString().slice(0, 10) : '';
}

function fromDateInput(value: string) {
  return value ? new Date(value).getTime() : undefined;
}

function ObligationDialog({ obligation, trigger, onDone }: { obligation?: ComplianceObligation; trigger: React.ReactNode; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const currentUser = useAuthStore((s) => s.user);
  const [f, setF] = useState({
    code: '', title: '', authority: 'NPC' as RegulatorySource['authority'],
    owner: '', dueDate: '', status: 'draft' as ComplianceWorkflowStatus,
    requiredEvidence: '', applicability: '', trigger: '', cadence: '',
  });

  const handleOpen = (v: boolean) => {
    if (v && obligation) {
      setF({
        code: obligation.code, title: obligation.title, authority: obligation.authority,
        owner: obligation.owner, dueDate: toDateInput(obligation.dueDate),
        status: obligation.status, requiredEvidence: obligation.requiredEvidence.join(', '),
        applicability: obligation.applicability, trigger: obligation.trigger, cadence: obligation.cadence,
      });
    } else if (v) {
      setF({ code: '', title: '', authority: 'NPC', owner: '', dueDate: '', status: 'draft', requiredEvidence: '', applicability: '', trigger: '', cadence: '' });
    }
    if (v) setStep(0);
    setOpen(v);
  };

  const save = async () => {
    const data = {
      code: f.code || `OB-${Date.now()}`,
      authority: f.authority,
      title: f.title,
      applicability: f.applicability || 'Organization-specific',
      trigger: f.trigger || 'Periodic compliance monitoring',
      cadence: f.cadence || 'Monthly',
      owner: f.owner,
      status: f.status,
      dueDate: fromDateInput(f.dueDate),
      requiredEvidence: f.requiredEvidence.split(',').map((s) => s.trim()).filter(Boolean),
      updatedAt: Date.now(),
    };
    if (obligation) {
      await db.obligations.update(obligation.id, data);
      toast.success('Obligation updated');
    } else {
      const id = crypto.randomUUID();
      await db.obligations.add({
        id, workspaceId: 'ws-default', escalationLevel: 'none',
        linkedPolicyIds: [], linkedControlIds: [], linkedTaskIds: [], evidenceIds: [],
        createdAt: Date.now(), ...data,
      });
      await appendAuditEvent({ workspaceId: 'ws-default', entityType: 'obligation', entityId: id, action: 'create', actorId: currentUser?.id ?? 'system', actorName: currentUser?.name ?? 'System', details: `Created obligation ${data.code}` });
      toast.success('Obligation added');
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
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <LayoutTemplate className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-semibold tracking-tight">{obligation ? 'Edit Obligation' : 'New Obligation'}</p>
                <p className="text-sm text-muted-foreground">Define a regulatory obligation with owner, deadline, and evidence requirements.</p>
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
                      <p className="text-xs text-muted-foreground">{index === 0 ? 'Core details' : index === 1 ? 'Evidence & applicability' : 'Final review'}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="flex min-h-0 flex-col">
            <div className="flex items-center justify-between border-b px-6 py-4 lg:px-8">
              <div>
                <p className="text-sm text-muted-foreground">Obligation Builder</p>
                <h2 className="text-lg font-semibold tracking-tight">Step {step + 1} of {STEPS.length}</h2>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 lg:px-8">
              <div className="w-full space-y-6">
                {step === 0 && (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2"><Label>Code</Label><Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} placeholder="e.g. NPC-DPO-REG" /></div>
                      <div className="space-y-2"><Label>Authority</Label>
                        <Select value={f.authority} onValueChange={(v) => setF({ ...f, authority: v as RegulatorySource['authority'] })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{AUTHORITY_OPTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2"><Label>Title</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Obligation title" /></div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2"><Label>Owner</Label><Input value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })} placeholder="Responsible person" /></div>
                      <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} /></div>
                      <div className="space-y-2"><Label>Status</Label>
                        <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v as ComplianceWorkflowStatus })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
                {step === 1 && (
                  <div className="space-y-4">
                    <div className="space-y-2"><Label>Applicability</Label><Input value={f.applicability} onChange={(e) => setF({ ...f, applicability: e.target.value })} placeholder="Who does this apply to?" /></div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2"><Label>Trigger</Label><Input value={f.trigger} onChange={(e) => setF({ ...f, trigger: e.target.value })} placeholder="What triggers this obligation?" /></div>
                      <div className="space-y-2"><Label>Cadence</Label><Input value={f.cadence} onChange={(e) => setF({ ...f, cadence: e.target.value })} placeholder="e.g. Annual review" /></div>
                    </div>
                    <div className="space-y-2"><Label>Required Evidence (comma-separated)</Label><Textarea value={f.requiredEvidence} onChange={(e) => setF({ ...f, requiredEvidence: e.target.value })} placeholder="DPO appointment, Privacy framework, Training logs" /></div>
                  </div>
                )}
                {step === 2 && (
                  <div className="space-y-4">
                    <div className="border-l border-border/40 pl-4 space-y-3">
                      {[
                        { label: 'Code', value: f.code || '(auto)' },
                        { label: 'Title', value: f.title || '—' },
                        { label: 'Authority', value: f.authority },
                        { label: 'Owner', value: f.owner || 'Unassigned' },
                        { label: 'Status', value: STATUS_LABEL[f.status] },
                        { label: 'Due Date', value: f.dueDate || 'Not set' },
                        { label: 'Evidence items', value: f.requiredEvidence.split(',').filter(Boolean).length.toString() },
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
                  </div>
                )}
                <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <Button variant="outline" onClick={() => setStep((s) => Math.max(s - 1, 0))} disabled={step === 0}><ChevronLeft className="h-4 w-4" />Back</Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    {step === 2
                      ? <Button onClick={save} disabled={!f.title}>{obligation ? 'Save' : 'Add Obligation'}</Button>
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

export default function ObligationsRegister() {
  const currentUser = useAuthStore((s) => s.user);
  const obligations = useLiveQuery(() => db.obligations.orderBy('updatedAt').reverse().toArray(), []) ?? [];
  const [q, setQ] = useState('');
  const [authorityFilter, setAuthorityFilter] = useState<'all' | RegulatorySource['authority']>('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => {
    return obligations.filter((o) => {
      const matchQ = `${o.code} ${o.title} ${o.owner}`.toLowerCase().includes(q.toLowerCase());
      const matchAuth = authorityFilter === 'all' || o.authority === authorityFilter;
      const matchStatus = statusFilter === 'all' || o.status === statusFilter;
      return matchQ && matchAuth && matchStatus;
    });
  }, [obligations, q, authorityFilter, statusFilter]);

  const overdueCount = obligations.filter((o) => o.dueDate && o.dueDate < Date.now() && o.status !== 'completed').length;
  const byAuthority = AUTHORITY_OPTIONS.reduce((acc, a) => {
    acc[a] = obligations.filter((o) => o.authority === a).length;
    return acc;
  }, {} as Record<string, number>);

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
              id: sourceId, workspaceId: 'ws-default', authority: template.authority,
              legalBasis: template.legalBasis, title: template.sourceTitle,
              applicability: template.applicability, trigger: template.trigger,
              cadence: template.cadence, requiredEvidence: template.requiredEvidence,
              isActive: true, createdAt: now, updatedAt: now,
            });
          }
          sourceMap.set(key, sourceId);
        }
        const existingObligation = await db.obligations.where('code').equals(template.code).first();
        if (!existingObligation) {
          await db.obligations.add({ id: crypto.randomUUID(), ...obligationFromTemplate(template, sourceId) });
        }
      }
    });
    await appendAuditEvent({ workspaceId: 'ws-default', entityType: 'obligation_library', entityId: 'ph', action: 'seed', actorId: currentUser?.id ?? 'system', actorName: currentUser?.name ?? 'System', details: 'Seeded PH obligations library' });
    toast.success('PH obligations library seeded');
  }

  async function escalateOverdue() {
    const overdue = obligations.filter((o) => o.dueDate && o.dueDate < Date.now() && o.status !== 'completed');
    if (!overdue.length) return;
    await db.transaction('rw', [db.obligations], async () => {
      for (const item of overdue) {
        await db.obligations.update(item.id, { status: 'overdue', escalationLevel: 'manager', updatedAt: Date.now() });
      }
    });
    await appendAuditEvent({ workspaceId: 'ws-default', entityType: 'obligation', entityId: 'batch-overdue', action: 'escalate', actorId: currentUser?.id ?? 'system', actorName: currentUser?.name ?? 'System', details: `Escalated ${overdue.length} overdue obligations` });
    toast.success(`${overdue.length} overdue obligations escalated`);
  }

  const del = async (id: string) => {
    await db.obligations.delete(id);
    toast.success('Obligation deleted');
  };

  const exportJSON = (o: ComplianceObligation) => {
    const blob = new Blob([JSON.stringify(o, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `obligation-${o.code}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Obligations Register</h1>
          <p className="text-sm text-muted-foreground mt-1">Track regulatory obligations by authority, owner, deadline, and evidence status.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={seedLibrary}><Sparkles className="h-4 w-4" />Seed PH Library</Button>
          <ObligationDialog trigger={<Button className="gap-2"><Plus className="h-4 w-4" /><span className="hidden sm:inline">Add Obligation</span></Button>} onDone={() => {}} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-semibold tabular-nums">{obligations.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><div className="h-2 w-2 rounded-full bg-red-500" /><p className="text-xs text-muted-foreground">Overdue</p></div><p className="text-2xl font-semibold tabular-nums text-red-500">{overdueCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Completed</p><p className="text-2xl font-semibold tabular-nums">{obligations.filter((o) => o.status === 'completed').length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Authorities</p><p className="text-2xl font-semibold tabular-nums">{Object.values(byAuthority).filter(Boolean).length}</p></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Input aria-label="Search obligations" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search code, title, owner..." />
        <Select value={authorityFilter} onValueChange={(v) => setAuthorityFilter(v as typeof authorityFilter)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All authorities</SelectItem>
            {AUTHORITY_OPTIONS.map((a) => <SelectItem key={a} value={a}>{a} ({byAuthority[a] || 0})</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Escalation action */}
      {overdueCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-950/20">
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
          <p className="text-sm flex-1">{overdueCount} obligation{overdueCount > 1 ? 's are' : ' is'} past due.</p>
          <Button size="sm" variant="destructive" onClick={escalateOverdue}>Escalate All</Button>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <EmptyState icon={Scale} title="No obligations found" description="Add an obligation or seed the PH library to get started." className="py-16" />
        ) : (
          filtered.map((o) => (
            <Card key={o.id}>
              <CardContent className="p-4 sm:p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{o.code}</p>
                      <Badge variant="outline" className="text-[10px]">{o.authority}</Badge>
                    </div>
                    <p className="text-sm mt-0.5">{o.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {o.owner || 'Unassigned'} · due {toDateInput(o.dueDate) || 'n/a'} · {o.requiredEvidence.length} evidence req. · {o.evidenceIds.length} attached
                    </p>
                  </div>
                  <Badge variant={o.status === 'overdue' ? 'destructive' : o.status === 'completed' ? 'default' : 'secondary'}>
                    {STATUS_LABEL[o.status]}
                  </Badge>
                </div>
                <div className="flex gap-1 flex-wrap">
                  <ObligationDialog obligation={o} trigger={<Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs"><Pencil className="h-3 w-3" />Edit</Button>} onDone={() => {}} />
                  <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => exportJSON(o)}><Download className="h-3 w-3" />Export</Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive gap-1.5 h-8 text-xs" onClick={() => del(o.id)}><Trash2 className="h-3 w-3" />Delete</Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
