import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';
import { ScrollText, Download, CheckCircle, AlertTriangle, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AuditTrail() {
  const auditEvents = useLiveQuery(() => db.auditEvents.orderBy('happenedAt').reverse().toArray(), []) ?? [];
  const [q, setQ] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  const entityTypes = useMemo(() => {
    const types = new Set(auditEvents.map((e) => e.entityType));
    return Array.from(types).sort();
  }, [auditEvents]);

  const filtered = useMemo(() => {
    return auditEvents.filter((e) => {
      const matchQ = `${e.entityType} ${e.action} ${e.actorName} ${e.details}`.toLowerCase().includes(q.toLowerCase());
      const matchEntity = entityFilter === 'all' || e.entityType === entityFilter;
      return matchQ && matchEntity;
    });
  }, [auditEvents, q, entityFilter]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  // Verify chain integrity
  const chainIntact = useMemo(() => {
    if (auditEvents.length === 0) return true;
    const sorted = [...auditEvents].sort((a, b) => a.happenedAt - b.happenedAt);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].prevHash !== sorted[i - 1].integrityHash) return false;
    }
    return true;
  }, [auditEvents]);

  const exportAll = () => {
    const blob = new Blob([JSON.stringify(auditEvents, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-trail-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Audit trail exported');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Audit Trail</h1>
          <p className="text-sm text-muted-foreground mt-1">Immutable, hash-chained audit log for regulator-ready evidence.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={exportAll}><Download className="h-4 w-4" />Export All</Button>
      </div>

      {/* Integrity banner */}
      <div className={cn(
        'flex items-center gap-3 rounded-lg border p-3',
        chainIntact
          ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20'
          : 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20'
      )}>
        {chainIntact ? (
          <>
            <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
            <p className="text-sm">Hash chain integrity verified — {auditEvents.length} events, no tampering detected.</p>
          </>
        ) : (
          <>
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">Hash chain integrity violation detected! The audit trail may have been tampered with.</p>
          </>
        )}
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Events</p><p className="text-2xl font-semibold tabular-nums">{auditEvents.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Entity Types</p><p className="text-2xl font-semibold tabular-nums">{entityTypes.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Actors</p><p className="text-2xl font-semibold tabular-nums">{new Set(auditEvents.map((e) => e.actorName)).size}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><Hash className="h-3 w-3 text-muted-foreground" /><p className="text-xs text-muted-foreground">Chain Status</p></div><p className={cn('text-lg font-semibold', chainIntact ? 'text-emerald-600' : 'text-red-600')}>{chainIntact ? 'Intact' : 'Broken'}</p></CardContent></Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input aria-label="Search audit trail" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search entity, action, actor, details..." />
        <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v); setPage(0); }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All entity types</SelectItem>
            {entityTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {paged.length === 0 ? (
          <EmptyState icon={ScrollText} title="No audit events" description="Actions across the system are automatically logged here." className="py-16" />
        ) : (
          paged.map((e) => (
            <div key={e.id} className="flex items-start gap-3 rounded-md border p-3 text-sm">
              <div className="h-2 w-2 rounded-full bg-muted-foreground/30 mt-1.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px]">{e.entityType}</Badge>
                  <span className="font-medium">{e.action}</span>
                  <span className="text-muted-foreground">by {e.actorName}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{e.details}</p>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground font-mono">
                  <span>{new Date(e.happenedAt).toLocaleString()}</span>
                  <span className="truncate max-w-[200px]" title={e.integrityHash}>#{e.integrityHash.slice(0, 16)}…</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>Previous</Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
