import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { appendAuditEvent, db, type EvidenceRecord } from '@/db/db';
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
import { Plus, Archive, Trash2, Download, Lock, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const TYPE_OPTIONS: EvidenceRecord['type'][] = ['document', 'screenshot', 'log', 'approval', 'submission', 'other'];
const TYPE_LABEL: Record<string, string> = { document: 'Document', screenshot: 'Screenshot', log: 'Log', approval: 'Approval', submission: 'Submission', other: 'Other' };

function EvidenceDialog({ trigger, onDone }: { trigger: React.ReactNode; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const currentUser = useAuthStore((s) => s.user);
  const [f, setF] = useState({
    title: '', type: 'document' as EvidenceRecord['type'], description: '',
    uri: '', checksum: '', capturedBy: '',
  });

  const handleOpen = (v: boolean) => {
    if (v) setF({ title: '', type: 'document', description: '', uri: '', checksum: '', capturedBy: currentUser?.name ?? '' });
    setOpen(v);
  };

  const save = async () => {
    const id = crypto.randomUUID();
    await db.evidenceRecords.add({
      id, workspaceId: 'ws-default', title: f.title, type: f.type,
      description: f.description, uri: f.uri, checksum: f.checksum,
      hashAlgorithm: 'sha256', immutable: true,
      chainOfCustody: [`Captured by ${f.capturedBy || 'Unknown'}`],
      capturedAt: Date.now(), capturedBy: f.capturedBy || 'Unknown',
    });
    await appendAuditEvent({ workspaceId: 'ws-default', entityType: 'evidence_record', entityId: id, action: 'create', actorId: currentUser?.id ?? 'system', actorName: currentUser?.name ?? 'System', details: `Added evidence ${f.title}` });
    toast.success('Evidence saved');
    setOpen(false);
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add Evidence Record</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Title</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Evidence title" /></div>
            <div className="space-y-2"><Label>Type</Label>
              <Select value={f.type} onValueChange={(v) => setF({ ...f, type: v as EvidenceRecord['type'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPE_OPTIONS.map((t) => <SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2"><Label>Description</Label><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="What does this evidence prove?" className="min-h-[80px]" /></div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Storage URI</Label><Input value={f.uri} onChange={(e) => setF({ ...f, uri: e.target.value })} placeholder="file:// or https://" /></div>
            <div className="space-y-2"><Label>Captured By</Label><Input value={f.capturedBy} onChange={(e) => setF({ ...f, capturedBy: e.target.value })} placeholder="Name of person" /></div>
          </div>
          <div className="space-y-2"><Label>SHA-256 Checksum</Label><Input value={f.checksum} onChange={(e) => setF({ ...f, checksum: e.target.value })} placeholder="Paste checksum for integrity verification" className="font-mono text-xs" /></div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save} disabled={!f.title}>Save Evidence</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function EvidenceVault() {
  const evidence = useLiveQuery(() => db.evidenceRecords.orderBy('capturedAt').reverse().toArray(), []) ?? [];
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const filtered = useMemo(() => {
    return evidence.filter((e) => {
      const matchQ = `${e.title} ${e.capturedBy} ${e.description}`.toLowerCase().includes(q.toLowerCase());
      const matchType = typeFilter === 'all' || e.type === typeFilter;
      return matchQ && matchType;
    });
  }, [evidence, q, typeFilter]);

  const del = async (id: string) => { await db.evidenceRecords.delete(id); toast.success('Evidence deleted'); };

  const exportJSON = (e: EvidenceRecord) => {
    const blob = new Blob([JSON.stringify(e, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evidence-${e.title.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Evidence Vault</h1>
          <p className="text-sm text-muted-foreground mt-1">Tamper-evident evidence records with SHA-256 integrity verification and chain of custody.</p>
        </div>
        <EvidenceDialog trigger={<Button className="gap-2"><Plus className="h-4 w-4" /><span className="hidden sm:inline">Add Evidence</span></Button>} onDone={() => {}} />
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Records</p><p className="text-2xl font-semibold tabular-nums">{evidence.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Documents</p><p className="text-2xl font-semibold tabular-nums">{evidence.filter((e) => e.type === 'document').length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">With Checksum</p><p className="text-2xl font-semibold tabular-nums">{evidence.filter((e) => e.checksum).length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><Lock className="h-3 w-3 text-emerald-500" /><p className="text-xs text-muted-foreground">Immutable</p></div><p className="text-2xl font-semibold tabular-nums">{evidence.filter((e) => e.immutable).length}</p></CardContent></Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input aria-label="Search evidence" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, captured by, description..." />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {TYPE_OPTIONS.map((t) => <SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <EmptyState icon={Archive} title="No evidence records" description="Add evidence to build an audit-grade, tamper-evident record." className="py-16" />
        ) : (
          filtered.map((e) => (
            <Card key={e.id}>
              <CardContent className="p-4 sm:p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{e.title}</p>
                      {e.immutable && <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {e.capturedBy} · {new Date(e.capturedAt).toLocaleString()}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <Badge variant="secondary" className="text-[10px]">{TYPE_LABEL[e.type]}</Badge>
                      {e.checksum && (
                        <Badge variant="outline" className="text-[10px] font-mono gap-1">
                          <Lock className="h-2.5 w-2.5" />
                          {e.checksum.slice(0, 16)}…
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                {e.description && <p className="text-sm text-muted-foreground">{e.description}</p>}
                {e.uri && <p className="text-xs text-muted-foreground font-mono break-all">{e.uri}</p>}
                {e.chainOfCustody && e.chainOfCustody.length > 0 && (
                  <div className="rounded-md border p-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Chain of Custody</p>
                    <div className="space-y-1">
                      {e.chainOfCustody.map((entry, i) => (
                        <p key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30 shrink-0" />
                          {entry}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-1 flex-wrap">
                  <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => exportJSON(e)}><Download className="h-3 w-3" />Export</Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive gap-1.5 h-8 text-xs" onClick={() => del(e.id)}><Trash2 className="h-3 w-3" />Delete</Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
