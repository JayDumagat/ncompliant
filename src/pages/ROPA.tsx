import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { appendAuditEvent, db, type ROPARecord, type ComplianceWorkflowStatus } from '@/db/db';
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
import { Plus, BookOpen, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_LABEL: Record<string, string> = { draft: 'Draft', active: 'Active', overdue: 'Overdue', completed: 'Completed', accepted_risk: 'Accepted Risk' };
const STATUS_OPTIONS: ComplianceWorkflowStatus[] = ['draft', 'active', 'overdue', 'completed', 'accepted_risk'];

function ROPADialog({ record, trigger, onDone }: { record?: ROPARecord; trigger: React.ReactNode; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const currentUser = useAuthStore((s) => s.user);
  const [f, setF] = useState({
    activityName: '', owner: '', legalBasis: '', dataSubjects: '', dataCategories: '',
    recipients: '', transferBasis: '', retentionPeriod: '', disposalMethod: '', status: 'active' as ComplianceWorkflowStatus,
  });

  const handleOpen = (v: boolean) => {
    if (v && record) {
      setF({
        activityName: record.activityName, owner: record.owner, legalBasis: record.legalBasis,
        dataSubjects: record.dataSubjects, dataCategories: record.dataCategories,
        recipients: record.recipients, transferBasis: record.transferBasis,
        retentionPeriod: record.retentionPeriod, disposalMethod: record.disposalMethod,
        status: record.status,
      });
    } else if (v) {
      setF({ activityName: '', owner: '', legalBasis: '', dataSubjects: '', dataCategories: '', recipients: '', transferBasis: '', retentionPeriod: '', disposalMethod: '', status: 'active' });
    }
    setOpen(v);
  };

  const save = async () => {
    const now = Date.now();
    if (record) {
      await db.ropaRecords.update(record.id, { ...f, updatedAt: now });
      toast.success('ROPA record updated');
    } else {
      const id = crypto.randomUUID();
      await db.ropaRecords.add({
        id, workspaceId: 'ws-default', ...f,
        linkedIncidentIds: [], linkedAssessmentIds: [], linkedVendorIds: [], linkedPolicyIds: [], evidenceIds: [],
        createdAt: now, updatedAt: now,
      });
      await appendAuditEvent({ workspaceId: 'ws-default', entityType: 'ropa_record', entityId: id, action: 'create', actorId: currentUser?.id ?? 'system', actorName: currentUser?.name ?? 'System', details: `Created ROPA record ${f.activityName}` });
      toast.success('ROPA record added');
    }
    setOpen(false);
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{record ? 'Edit ROPA Record' : 'Add Processing Activity'}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Processing Activity</Label><Input value={f.activityName} onChange={(e) => setF({ ...f, activityName: e.target.value })} placeholder="e.g. Customer Onboarding" /></div>
            <div className="space-y-2"><Label>Owner</Label><Input value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })} placeholder="Process owner" /></div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Legal Basis</Label><Input value={f.legalBasis} onChange={(e) => setF({ ...f, legalBasis: e.target.value })} placeholder="e.g. Consent, Contract, Legal Obligation" /></div>
            <div className="space-y-2"><Label>Status</Label>
              <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v as ComplianceWorkflowStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Data Subjects</Label><Input value={f.dataSubjects} onChange={(e) => setF({ ...f, dataSubjects: e.target.value })} placeholder="e.g. Customers, Employees" /></div>
            <div className="space-y-2"><Label>Data Categories</Label><Input value={f.dataCategories} onChange={(e) => setF({ ...f, dataCategories: e.target.value })} placeholder="e.g. PII, Financial data" /></div>
          </div>
          <div className="space-y-2"><Label>Recipients</Label><Textarea value={f.recipients} onChange={(e) => setF({ ...f, recipients: e.target.value })} placeholder="Who receives this data?" className="min-h-[60px]" /></div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Transfer Basis</Label><Input value={f.transferBasis} onChange={(e) => setF({ ...f, transferBasis: e.target.value })} placeholder="e.g. Adequacy decision, SCC" /></div>
            <div className="space-y-2"><Label>Retention Period</Label><Input value={f.retentionPeriod} onChange={(e) => setF({ ...f, retentionPeriod: e.target.value })} placeholder="e.g. 5 years from collection" /></div>
          </div>
          <div className="space-y-2"><Label>Disposal Method</Label><Input value={f.disposalMethod} onChange={(e) => setF({ ...f, disposalMethod: e.target.value })} placeholder="e.g. Secure deletion, Anonymization" /></div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save} disabled={!f.activityName}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ROPA() {
  const ropaRecords = useLiveQuery(() => db.ropaRecords.orderBy('updatedAt').reverse().toArray(), []) ?? [];
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => {
    return ropaRecords.filter((r) => {
      const matchQ = `${r.activityName} ${r.owner} ${r.legalBasis}`.toLowerCase().includes(q.toLowerCase());
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchQ && matchStatus;
    });
  }, [ropaRecords, q, statusFilter]);

  const legalBases = useMemo(() => {
    const bases = new Set(ropaRecords.map((r) => r.legalBasis).filter(Boolean));
    return bases.size;
  }, [ropaRecords]);

  const del = async (id: string) => { await db.ropaRecords.delete(id); toast.success('ROPA record deleted'); };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Records of Processing Activities</h1>
          <p className="text-sm text-muted-foreground mt-1">Maintain a full ROPA with legal basis, recipients, retention, and disposal per process.</p>
        </div>
        <ROPADialog trigger={<Button className="gap-2"><Plus className="h-4 w-4" /><span className="hidden sm:inline">Add Activity</span></Button>} onDone={() => {}} />
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Activities</p><p className="text-2xl font-semibold tabular-nums">{ropaRecords.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Active</p><p className="text-2xl font-semibold tabular-nums">{ropaRecords.filter((r) => r.status === 'active').length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Legal Bases</p><p className="text-2xl font-semibold tabular-nums">{legalBases}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">With Evidence</p><p className="text-2xl font-semibold tabular-nums">{ropaRecords.filter((r) => r.evidenceIds.length > 0).length}</p></CardContent></Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input aria-label="Search ROPA" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search activity, owner, legal basis..." />
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
          <EmptyState icon={BookOpen} title="No processing activities" description="Add a processing activity to build your ROPA." className="py-16" />
        ) : (
          filtered.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4 sm:p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{r.activityName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Owner: {r.owner || 'Unassigned'} · Legal basis: {r.legalBasis || 'Not set'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <Badge variant={r.status === 'overdue' ? 'destructive' : r.status === 'completed' ? 'default' : 'secondary'}>{STATUS_LABEL[r.status]}</Badge>
                      {r.retentionPeriod && <Badge variant="outline" className="text-[10px]">Retention: {r.retentionPeriod}</Badge>}
                    </div>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 text-xs text-muted-foreground">
                  <p>Subjects: {r.dataSubjects || '—'}</p>
                  <p>Categories: {r.dataCategories || '—'}</p>
                  <p>Recipients: {r.recipients || '—'}</p>
                  <p>Transfer basis: {r.transferBasis || '—'}</p>
                  <p>Disposal: {r.disposalMethod || '—'}</p>
                  <p>Evidence: {r.evidenceIds.length} record(s)</p>
                </div>
                <div className="flex gap-1 flex-wrap">
                  <ROPADialog record={r} trigger={<Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs"><Pencil className="h-3 w-3" />Edit</Button>} onDone={() => {}} />
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive gap-1.5 h-8 text-xs" onClick={() => del(r.id)}><Trash2 className="h-3 w-3" />Delete</Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
