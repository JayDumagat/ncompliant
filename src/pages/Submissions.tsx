import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { appendAuditEvent, db, type SubmissionPack, type RegulatorySource } from '@/db/db';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { Plus, Send, Pencil, Trash2, Download, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const AUTHORITY_OPTIONS: RegulatorySource['authority'][] = ['NPC', 'AMLC', 'BSP', 'SEC', 'OTHER'];
const STATUS_OPTIONS: SubmissionPack['status'][] = ['draft', 'ready', 'submitted', 'follow_up', 'closed'];
const STATUS_LABEL: Record<string, string> = { draft: 'Draft', ready: 'Ready', submitted: 'Submitted', follow_up: 'Follow-Up', closed: 'Closed' };

function toDateInput(v?: number) { return v ? new Date(v).toISOString().slice(0, 10) : ''; }
function fromDateInput(v: string) { return v ? new Date(v).getTime() : undefined; }
function daysUntil(ts?: number) { if (!ts) return null; return Math.ceil((ts - Date.now()) / (1000 * 60 * 60 * 24)); }

function SubmissionDialog({ pack, trigger, onDone }: { pack?: SubmissionPack; trigger: React.ReactNode; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const currentUser = useAuthStore((s) => s.user);
  const [f, setF] = useState({
    regulator: 'NPC' as RegulatorySource['authority'], title: '', dueDate: '',
    checklist: '', notes: '', status: 'draft' as SubmissionPack['status'],
    referenceNumber: '', followUpDate: '',
  });

  const handleOpen = (v: boolean) => {
    if (v && pack) {
      setF({
        regulator: pack.regulator, title: pack.title, dueDate: toDateInput(pack.dueDate),
        checklist: pack.checklist.join(', '), notes: pack.notes,
        status: pack.status, referenceNumber: pack.referenceNumber ?? '',
        followUpDate: toDateInput(pack.followUpDate),
      });
    } else if (v) {
      setF({ regulator: 'NPC', title: '', dueDate: '', checklist: '', notes: '', status: 'draft', referenceNumber: '', followUpDate: '' });
    }
    setOpen(v);
  };

  const save = async () => {
    const now = Date.now();
    const data = {
      regulator: f.regulator, title: f.title,
      status: f.status, dueDate: fromDateInput(f.dueDate),
      checklist: f.checklist.split(',').map((s) => s.trim()).filter(Boolean),
      notes: f.notes, referenceNumber: f.referenceNumber || undefined,
      followUpDate: fromDateInput(f.followUpDate),
      submittedAt: f.status === 'submitted' ? (pack?.submittedAt ?? now) : undefined,
      updatedAt: now,
    };
    if (pack) {
      await db.submissionPacks.update(pack.id, data);
      toast.success('Submission pack updated');
    } else {
      const id = crypto.randomUUID();
      await db.submissionPacks.add({
        id, workspaceId: 'ws-default', ...data,
        includedObligationIds: [], includedIncidentIds: [],
        includedDSRCaseIds: [], includedROPAIds: [], evidenceIds: [],
        createdAt: now,
      });
      await appendAuditEvent({ workspaceId: 'ws-default', entityType: 'submission_pack', entityId: id, action: 'create', actorId: currentUser?.id ?? 'system', actorName: currentUser?.name ?? 'System', details: `Created ${f.regulator} submission pack` });
      toast.success('Submission pack created');
    }
    setOpen(false);
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{pack ? 'Edit Submission Pack' : 'New Submission Pack'}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Regulator</Label>
              <Select value={f.regulator} onValueChange={(v) => setF({ ...f, regulator: v as RegulatorySource['authority'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{AUTHORITY_OPTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Status</Label>
              <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v as SubmissionPack['status'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2"><Label>Pack Title</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. NPC Annual Compliance Report 2026" /></div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} /></div>
            <div className="space-y-2"><Label>Reference Number</Label><Input value={f.referenceNumber} onChange={(e) => setF({ ...f, referenceNumber: e.target.value })} placeholder="Regulator ref #" /></div>
          </div>
          {f.status === 'follow_up' && (
            <div className="space-y-2"><Label>Follow-Up Date</Label><Input type="date" value={f.followUpDate} onChange={(e) => setF({ ...f, followUpDate: e.target.value })} /></div>
          )}
          <div className="space-y-2"><Label>Checklist Items (comma-separated)</Label><Textarea value={f.checklist} onChange={(e) => setF({ ...f, checklist: e.target.value })} placeholder="Cover letter, Data inventory, Risk assessment..." className="min-h-[60px]" /></div>
          <div className="space-y-2"><Label>Notes</Label><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Additional notes..." className="min-h-[60px]" /></div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save} disabled={!f.title}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Submissions() {
  const packs = useLiveQuery(() => db.submissionPacks.orderBy('updatedAt').reverse().toArray(), []) ?? [];
  const [regulatorFilter, setRegulatorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => {
    return packs.filter((p) => {
      const matchReg = regulatorFilter === 'all' || p.regulator === regulatorFilter;
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchReg && matchStatus;
    });
  }, [packs, regulatorFilter, statusFilter]);

  const del = async (id: string) => { await db.submissionPacks.delete(id); toast.success('Submission pack deleted'); };

  const exportJSON = (p: SubmissionPack) => {
    const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `submission-${p.title.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Regulator Submissions</h1>
          <p className="text-sm text-muted-foreground mt-1">Build and track submission packs for NPC, AMLC, BSP, and SEC.</p>
        </div>
        <SubmissionDialog trigger={<Button className="gap-2"><Plus className="h-4 w-4" /><span className="hidden sm:inline">New Pack</span></Button>} onDone={() => {}} />
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Packs</p><p className="text-2xl font-semibold tabular-nums">{packs.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Submitted</p><p className="text-2xl font-semibold tabular-nums">{packs.filter((p) => p.status === 'submitted').length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><div className="h-2 w-2 rounded-full bg-amber-500" /><p className="text-xs text-muted-foreground">Drafts</p></div><p className="text-2xl font-semibold tabular-nums">{packs.filter((p) => p.status === 'draft').length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Follow-Up</p><p className="text-2xl font-semibold tabular-nums">{packs.filter((p) => p.status === 'follow_up').length}</p></CardContent></Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Select value={regulatorFilter} onValueChange={setRegulatorFilter}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All regulators</SelectItem>
            {AUTHORITY_OPTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
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

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <EmptyState icon={Send} title="No submission packs" description="Create a submission pack to bundle compliance artifacts for a regulator." className="py-16" />
        ) : (
          filtered.map((p) => {
            const deadline = daysUntil(p.dueDate);
            const isOverdue = deadline !== null && deadline <= 0 && p.status !== 'submitted' && p.status !== 'closed';
            return (
              <Card key={p.id}>
                <CardContent className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">{p.regulator}</Badge>
                        <p className="text-sm font-medium">{p.title}</p>
                      </div>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <Badge variant={p.status === 'submitted' ? 'default' : p.status === 'draft' ? 'secondary' : 'outline'}>
                          {STATUS_LABEL[p.status]}
                        </Badge>
                        {deadline !== null && (
                          <Badge variant={isOverdue ? 'destructive' : 'outline'} className="gap-1">
                            <Clock className="h-3 w-3" />
                            {isOverdue ? `${Math.abs(deadline)}d overdue` : `${deadline}d left`}
                          </Badge>
                        )}
                        {p.referenceNumber && <Badge variant="outline" className="text-[10px]">Ref: {p.referenceNumber}</Badge>}
                      </div>
                    </div>
                  </div>
                  {p.checklist.length > 0 && (
                    <div className="rounded-md border p-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Checklist</p>
                      <div className="space-y-1">
                        {p.checklist.map((item, i) => (
                          <p key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30 shrink-0" />
                            {item}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid gap-1 sm:grid-cols-3 text-xs text-muted-foreground">
                    <p>Obligations: {p.includedObligationIds.length}</p>
                    <p>Incidents: {p.includedIncidentIds.length}</p>
                    <p>Evidence: {p.evidenceIds.length}</p>
                  </div>
                  {p.notes && <p className="text-sm text-muted-foreground">{p.notes}</p>}
                  <div className="flex gap-1 flex-wrap">
                    <SubmissionDialog pack={p} trigger={<Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs"><Pencil className="h-3 w-3" />Edit</Button>} onDone={() => {}} />
                    <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => exportJSON(p)}><Download className="h-3 w-3" />Export</Button>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive gap-1.5 h-8 text-xs" onClick={() => del(p.id)}><Trash2 className="h-3 w-3" />Delete</Button>
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
