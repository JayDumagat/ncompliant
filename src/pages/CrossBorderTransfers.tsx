import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { appendAuditEvent, db, type TransferAssessment, type ComplianceWorkflowStatus } from '@/db/db';
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
import { Plus, Globe, Pencil, Trash2, Clock } from 'lucide-react';

const SAFEGUARD_OPTIONS: TransferAssessment['safeguardStatus'][] = ['valid', 'expiring', 'missing'];
const SAFEGUARD_LABEL: Record<string, string> = { valid: 'Valid', expiring: 'Expiring', missing: 'Missing' };
const STATUS_LABEL: Record<string, string> = { draft: 'Draft', active: 'Active', overdue: 'Overdue', completed: 'Completed', accepted_risk: 'Accepted Risk' };

function toDateInput(v?: number) { return v ? new Date(v).toISOString().slice(0, 10) : ''; }
function fromDateInput(v: string) { return v ? new Date(v).getTime() : undefined; }
function daysUntil(ts?: number) { if (!ts) return null; return Math.ceil((ts - Date.now()) / (1000 * 60 * 60 * 24)); }

function TransferDialog({ transfer, trigger, onDone }: { transfer?: TransferAssessment; trigger: React.ReactNode; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const currentUser = useAuthStore((s) => s.user);
  const [f, setF] = useState({
    transferName: '', destinationCountry: '', mechanism: '', legalBasis: '',
    safeguardStatus: 'valid' as TransferAssessment['safeguardStatus'],
    nextReviewDate: '', notes: '',
  });

  const handleOpen = (v: boolean) => {
    if (v && transfer) {
      setF({
        transferName: transfer.transferName, destinationCountry: transfer.destinationCountry,
        mechanism: transfer.mechanism, legalBasis: transfer.legalBasis,
        safeguardStatus: transfer.safeguardStatus, nextReviewDate: toDateInput(transfer.nextReviewDate),
        notes: transfer.notes,
      });
    } else if (v) {
      setF({ transferName: '', destinationCountry: '', mechanism: '', legalBasis: '', safeguardStatus: 'valid', nextReviewDate: '', notes: '' });
    }
    setOpen(v);
  };

  const save = async () => {
    const now = Date.now();
    if (transfer) {
      await db.transferAssessments.update(transfer.id, {
        transferName: f.transferName, destinationCountry: f.destinationCountry, mechanism: f.mechanism,
        legalBasis: f.legalBasis, safeguardStatus: f.safeguardStatus,
        nextReviewDate: fromDateInput(f.nextReviewDate), notes: f.notes, updatedAt: now,
      });
      toast.success('Transfer assessment updated');
    } else {
      const id = crypto.randomUUID();
      await db.transferAssessments.add({
        id, workspaceId: 'ws-default', transferName: f.transferName,
        destinationCountry: f.destinationCountry, mechanism: f.mechanism,
        legalBasis: f.legalBasis, safeguardStatus: f.safeguardStatus,
        status: 'active' as ComplianceWorkflowStatus,
        reviewDate: now, nextReviewDate: fromDateInput(f.nextReviewDate),
        remediationTaskIds: [], evidenceIds: [], notes: f.notes,
        createdAt: now, updatedAt: now,
      });
      await appendAuditEvent({ workspaceId: 'ws-default', entityType: 'transfer_assessment', entityId: id, action: 'create', actorId: currentUser?.id ?? 'system', actorName: currentUser?.name ?? 'System', details: `Created transfer assessment ${f.transferName}` });
      toast.success('Transfer assessment added');
    }
    setOpen(false);
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{transfer ? 'Edit Transfer Assessment' : 'New Transfer Assessment'}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Transfer Name</Label><Input value={f.transferName} onChange={(e) => setF({ ...f, transferName: e.target.value })} placeholder="e.g. Cloud storage to US" /></div>
            <div className="space-y-2"><Label>Destination Country</Label><Input value={f.destinationCountry} onChange={(e) => setF({ ...f, destinationCountry: e.target.value })} placeholder="e.g. United States" /></div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Transfer Mechanism</Label><Input value={f.mechanism} onChange={(e) => setF({ ...f, mechanism: e.target.value })} placeholder="e.g. Standard Contractual Clauses" /></div>
            <div className="space-y-2"><Label>Legal Basis</Label><Input value={f.legalBasis} onChange={(e) => setF({ ...f, legalBasis: e.target.value })} placeholder="e.g. Consent, Adequacy decision" /></div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Safeguard Status</Label>
              <Select value={f.safeguardStatus} onValueChange={(v) => setF({ ...f, safeguardStatus: v as TransferAssessment['safeguardStatus'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SAFEGUARD_OPTIONS.map((s) => <SelectItem key={s} value={s}>{SAFEGUARD_LABEL[s]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Next Review Date</Label><Input type="date" value={f.nextReviewDate} onChange={(e) => setF({ ...f, nextReviewDate: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>Notes</Label><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Additional notes..." className="min-h-[60px]" /></div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save} disabled={!f.transferName}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function CrossBorderTransfers() {
  const transfers = useLiveQuery(() => db.transferAssessments.orderBy('updatedAt').reverse().toArray(), []) ?? [];
  const [q, setQ] = useState('');
  const [safeguardFilter, setSafeguardFilter] = useState('all');

  const filtered = useMemo(() => {
    return transfers.filter((t) => {
      const matchQ = `${t.transferName} ${t.destinationCountry} ${t.mechanism}`.toLowerCase().includes(q.toLowerCase());
      const matchSafeguard = safeguardFilter === 'all' || t.safeguardStatus === safeguardFilter;
      return matchQ && matchSafeguard;
    });
  }, [transfers, q, safeguardFilter]);

  const del = async (id: string) => { await db.transferAssessments.delete(id); toast.success('Transfer assessment deleted'); };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Cross-Border Transfers</h1>
          <p className="text-sm text-muted-foreground mt-1">Track transfer impact assessments, mechanisms, and contract safeguards.</p>
        </div>
        <TransferDialog trigger={<Button className="gap-2"><Plus className="h-4 w-4" /><span className="hidden sm:inline">Add Transfer</span></Button>} onDone={() => {}} />
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Transfers</p><p className="text-2xl font-semibold tabular-nums">{transfers.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><div className="h-2 w-2 rounded-full bg-emerald-500" /><p className="text-xs text-muted-foreground">Valid</p></div><p className="text-2xl font-semibold tabular-nums">{transfers.filter((t) => t.safeguardStatus === 'valid').length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><div className="h-2 w-2 rounded-full bg-amber-500" /><p className="text-xs text-muted-foreground">Expiring</p></div><p className="text-2xl font-semibold tabular-nums">{transfers.filter((t) => t.safeguardStatus === 'expiring').length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><div className="h-2 w-2 rounded-full bg-red-500" /><p className="text-xs text-muted-foreground">Missing</p></div><p className="text-2xl font-semibold tabular-nums text-red-500">{transfers.filter((t) => t.safeguardStatus === 'missing').length}</p></CardContent></Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input aria-label="Search transfers" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, country, mechanism..." />
        <Select value={safeguardFilter} onValueChange={setSafeguardFilter}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All safeguard statuses</SelectItem>
            {SAFEGUARD_OPTIONS.map((s) => <SelectItem key={s} value={s}>{SAFEGUARD_LABEL[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <EmptyState icon={Globe} title="No transfer assessments" description="Add a cross-border transfer to track mechanism and safeguard status." className="py-16" />
        ) : (
          filtered.map((t) => {
            const reviewDays = daysUntil(t.nextReviewDate);
            return (
              <Card key={t.id}>
                <CardContent className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{t.transferName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        → {t.destinationCountry} · {t.mechanism || 'No mechanism'} · {t.legalBasis || 'No legal basis'}
                      </p>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <Badge variant={t.safeguardStatus === 'missing' ? 'destructive' : t.safeguardStatus === 'expiring' ? 'default' : 'secondary'}>
                          {SAFEGUARD_LABEL[t.safeguardStatus]}
                        </Badge>
                        <Badge variant={t.status === 'overdue' ? 'destructive' : 'secondary'}>{STATUS_LABEL[t.status] ?? t.status}</Badge>
                        {reviewDays !== null && (
                          <Badge variant="outline" className="gap-1">
                            <Clock className="h-3 w-3" />
                            Review {reviewDays <= 0 ? 'overdue' : `in ${reviewDays}d`}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {t.notes && <p className="text-sm text-muted-foreground">{t.notes}</p>}
                  <div className="flex gap-1 flex-wrap">
                    <TransferDialog transfer={t} trigger={<Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs"><Pencil className="h-3 w-3" />Edit</Button>} onDone={() => {}} />
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive gap-1.5 h-8 text-xs" onClick={() => del(t.id)}><Trash2 className="h-3 w-3" />Delete</Button>
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
