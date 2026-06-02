import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { appendAuditEvent, db, type DSRCase, type DSRRequestType, type DSRCaseStatus } from '@/db/db';
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
import { Plus, UserCheck, ChevronLeft, Check, Pencil, Trash2, LayoutTemplate, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const REQUEST_TYPES: { value: DSRRequestType; label: string }[] = [
  { value: 'access', label: 'Access' },
  { value: 'correction', label: 'Correction' },
  { value: 'erasure_blocking', label: 'Erasure / Blocking' },
  { value: 'objection', label: 'Objection' },
  { value: 'portability', label: 'Portability' },
];
const STATUS_OPTIONS: { value: DSRCaseStatus; label: string }[] = [
  { value: 'intake', label: 'Intake' },
  { value: 'in_review', label: 'In Review' },
  { value: 'awaiting_customer', label: 'Awaiting Customer' },
  { value: 'fulfilled', label: 'Fulfilled' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'closed', label: 'Closed' },
  { value: 'overdue', label: 'Overdue' },
];
const STEPS = ['Requester Info', 'Assignment', 'Review'];

function toDateInput(v?: number) { return v ? new Date(v).toISOString().slice(0, 10) : ''; }
function fromDateInput(v: string) { return v ? new Date(v).getTime() : undefined; }
function daysUntil(ts?: number) { if (!ts) return null; return Math.ceil((ts - Date.now()) / (1000 * 60 * 60 * 24)); }

function DSRDialog({ dsrCase, trigger, onDone }: { dsrCase?: DSRCase; trigger: React.ReactNode; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const currentUser = useAuthStore((s) => s.user);
  const [f, setF] = useState({
    requesterName: '', requesterEmail: '', requestType: 'access' as DSRRequestType,
    assignedTo: '', dueDate: '', status: 'intake' as DSRCaseStatus,
  });

  const handleOpen = (v: boolean) => {
    if (v && dsrCase) {
      setF({ requesterName: dsrCase.requesterName, requesterEmail: dsrCase.requesterEmail, requestType: dsrCase.requestType, assignedTo: dsrCase.assignedTo, dueDate: toDateInput(dsrCase.dueDate), status: dsrCase.status });
    } else if (v) {
      setF({ requesterName: '', requesterEmail: '', requestType: 'access', assignedTo: '', dueDate: '', status: 'intake' });
    }
    if (v) setStep(0);
    setOpen(v);
  };

  const save = async () => {
    const dueDate = fromDateInput(f.dueDate) ?? (Date.now() + 30 * 24 * 60 * 60 * 1000);
    if (dsrCase) {
      await db.dsrCases.update(dsrCase.id, { requesterName: f.requesterName, requesterEmail: f.requesterEmail, requestType: f.requestType, assignedTo: f.assignedTo, dueDate, status: f.status });
      toast.success('DSR case updated');
    } else {
      const id = crypto.randomUUID();
      const record: DSRCase = {
        id, workspaceId: 'ws-default', requestType: f.requestType, requesterName: f.requesterName,
        requesterEmail: f.requesterEmail, status: 'intake', assignedTo: f.assignedTo, receivedAt: Date.now(),
        dueDate, escalationLevel: 'none', evidenceIds: [], decisionLog: ['Case opened'],
      };
      await db.dsrCases.add(record);
      await appendAuditEvent({ workspaceId: 'ws-default', entityType: 'dsr_case', entityId: id, action: 'create', actorId: currentUser?.id ?? 'system', actorName: currentUser?.name ?? 'System', details: `Opened DSR case for ${f.requesterEmail}` });
      toast.success('DSR case created');
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
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
                <LayoutTemplate className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-semibold tracking-tight">{dsrCase ? 'Edit DSR Case' : 'New DSR Case'}</p>
                <p className="text-sm text-muted-foreground">Data subject rights request intake and tracking.</p>
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
                      <p className="text-xs text-muted-foreground">{index === 0 ? 'Who is requesting?' : index === 1 ? 'Handler and SLA' : 'Confirm details'}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="flex min-h-0 flex-col">
            <div className="flex items-center justify-between border-b px-6 py-4 lg:px-8">
              <div>
                <p className="text-sm text-muted-foreground">DSR Case Builder</p>
                <h2 className="text-lg font-semibold tracking-tight">Step {step + 1} of {STEPS.length}</h2>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 lg:px-8">
              <div className="w-full space-y-6">
                {step === 0 && (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2"><Label>Requester Name</Label><Input value={f.requesterName} onChange={(e) => setF({ ...f, requesterName: e.target.value })} placeholder="Full name" /></div>
                      <div className="space-y-2"><Label>Requester Email</Label><Input type="email" value={f.requesterEmail} onChange={(e) => setF({ ...f, requesterEmail: e.target.value })} placeholder="email@example.com" /></div>
                    </div>
                    <div className="space-y-2"><Label>Request Type</Label>
                      <Select value={f.requestType} onValueChange={(v) => setF({ ...f, requestType: v as DSRRequestType })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{REQUEST_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                {step === 1 && (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2"><Label>Assigned To</Label><Input value={f.assignedTo} onChange={(e) => setF({ ...f, assignedTo: e.target.value })} placeholder="Handler name" /></div>
                      <div className="space-y-2"><Label>SLA Due Date</Label><Input type="date" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} /></div>
                    </div>
                    {dsrCase && (
                      <div className="space-y-2"><Label>Status</Label>
                        <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v as DSRCaseStatus })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}
                {step === 2 && (
                  <div className="border-l border-border/40 pl-4 space-y-3">
                    {[
                      { label: 'Requester', value: `${f.requesterName} (${f.requesterEmail})` },
                      { label: 'Request Type', value: REQUEST_TYPES.find((t) => t.value === f.requestType)?.label ?? f.requestType },
                      { label: 'Assigned To', value: f.assignedTo || 'Unassigned' },
                      { label: 'SLA Due', value: f.dueDate || '30 days from now' },
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
                      ? <Button onClick={save} disabled={!f.requesterEmail}>{dsrCase ? 'Save' : 'Open Case'}</Button>
                      : <Button onClick={() => setStep((s) => Math.min(s + 1, STEPS.length - 1))} disabled={step === 0 ? !f.requesterEmail : false}>Continue</Button>
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

export default function DSRCases() {
  const dsrCases = useLiveQuery(() => db.dsrCases.orderBy('receivedAt').reverse().toArray(), []) ?? [];
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    return dsrCases.filter((c) => {
      const matchQ = `${c.requesterName} ${c.requesterEmail} ${c.assignedTo}`.toLowerCase().includes(q.toLowerCase());
      const matchType = typeFilter === 'all' || c.requestType === typeFilter;
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchQ && matchType && matchStatus;
    });
  }, [dsrCases, typeFilter, statusFilter, q]);

  const openCases = dsrCases.filter((c) => !['closed', 'fulfilled', 'rejected'].includes(c.status)).length;
  const overdueCases = dsrCases.filter((c) => c.dueDate < Date.now() && !['closed', 'fulfilled', 'rejected'].includes(c.status)).length;

  const del = async (id: string) => { await db.dsrCases.delete(id); toast.success('DSR case deleted'); };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Data Subject Rights</h1>
          <p className="text-sm text-muted-foreground mt-1">Intake, track, and resolve access, correction, erasure, objection, and portability requests.</p>
        </div>
        <DSRDialog trigger={<Button className="gap-2"><Plus className="h-4 w-4" /><span className="hidden sm:inline">New Request</span></Button>} onDone={() => {}} />
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Cases</p><p className="text-2xl font-semibold tabular-nums">{dsrCases.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><div className="h-2 w-2 rounded-full bg-amber-500" /><p className="text-xs text-muted-foreground">Open</p></div><p className="text-2xl font-semibold tabular-nums">{openCases}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><div className="h-2 w-2 rounded-full bg-red-500" /><p className="text-xs text-muted-foreground">Overdue SLA</p></div><p className="text-2xl font-semibold tabular-nums text-red-500">{overdueCases}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Fulfilled</p><p className="text-2xl font-semibold tabular-nums">{dsrCases.filter((c) => c.status === 'fulfilled').length}</p></CardContent></Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Input aria-label="Search DSR cases" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search requester, email, handler..." />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {REQUEST_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <EmptyState icon={UserCheck} title="No DSR cases" description="Open a new case to track a data subject rights request." className="py-16" />
        ) : (
          filtered.map((c) => {
            const deadline = daysUntil(c.dueDate);
            const isOverdue = deadline !== null && deadline <= 0 && !['closed', 'fulfilled', 'rejected'].includes(c.status);
            return (
              <Card key={c.id}>
                <CardContent className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{c.requesterName || c.requesterEmail}</p>
                        <Badge variant="outline" className="text-[10px]">{REQUEST_TYPES.find((t) => t.value === c.requestType)?.label ?? c.requestType}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {c.requesterEmail} · Assigned to {c.assignedTo || 'Unassigned'} · received {new Date(c.receivedAt).toLocaleDateString()}
                      </p>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <Badge variant={c.status === 'overdue' || isOverdue ? 'destructive' : c.status === 'fulfilled' ? 'default' : 'secondary'}>
                          {STATUS_OPTIONS.find((s) => s.value === c.status)?.label ?? c.status}
                        </Badge>
                        <Badge variant={isOverdue ? 'destructive' : 'outline'} className="gap-1">
                          <Clock className="h-3 w-3" />
                          {deadline !== null ? (isOverdue ? `${Math.abs(deadline)}d overdue` : `${deadline}d left`) : 'No deadline'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {c.decisionLog && c.decisionLog.length > 0 && (
                    <div className="rounded-md border p-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Decision Log</p>
                      <div className="space-y-1">
                        {c.decisionLog.slice(-3).map((entry, i) => (
                          <p key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30 shrink-0" />
                            {entry}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-1 flex-wrap">
                    <DSRDialog dsrCase={c} trigger={<Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs"><Pencil className="h-3 w-3" />Edit</Button>} onDone={() => {}} />
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive gap-1.5 h-8 text-xs" onClick={() => del(c.id)}><Trash2 className="h-3 w-3" />Delete</Button>
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
