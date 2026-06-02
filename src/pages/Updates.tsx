import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { appendAuditEvent, db, type RegulatorySource, type RegulatoryUpdateEvent, type RegulatoryChangeRecord } from '@/db/db';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { AlertTriangle, Info, AlertCircle, ExternalLink, Plus, Bell, Rss, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';

const SEV = {
  critical: { icon: AlertTriangle, label: 'Critical', variant: 'destructive' as const },
  warning: { icon: AlertCircle, label: 'Warning', variant: 'default' as const },
  info: { icon: Info, label: 'Info', variant: 'secondary' as const },
};

const AUTHORITY_OPTIONS: RegulatorySource['authority'][] = ['NPC', 'AMLC', 'BSP', 'SEC', 'OTHER'];

/* ── Feed Connector Dialog ── */
function FeedDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const currentUser = useAuthStore((s) => s.user);
  const [f, setF] = useState({
    authority: 'NPC' as RegulatorySource['authority'],
    connectorType: 'manual' as 'rss' | 'manual' | 'api',
    endpoint: '',
  });

  const save = async () => {
    const id = crypto.randomUUID();
    await db.regulatoryFeeds.add({
      id, workspaceId: 'ws-default', authority: f.authority,
      connectorType: f.connectorType, endpoint: f.endpoint,
      status: 'active', lastCheckedAt: Date.now(), createdAt: Date.now(),
    });
    await appendAuditEvent({ workspaceId: 'ws-default', entityType: 'regulatory_feed', entityId: id, action: 'create', actorId: currentUser?.id ?? 'system', actorName: currentUser?.name ?? 'System', details: `Configured ${f.authority} ${f.connectorType} connector` });
    toast.success('Feed connector saved');
    setOpen(false);
    setF({ authority: 'NPC', connectorType: 'manual', endpoint: '' });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add Feed Connector</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Authority</Label>
              <Select value={f.authority} onValueChange={(v) => setF({ ...f, authority: v as RegulatorySource['authority'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{AUTHORITY_OPTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Connector Type</Label>
              <Select value={f.connectorType} onValueChange={(v) => setF({ ...f, connectorType: v as typeof f.connectorType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="rss">RSS</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2"><Label>Endpoint / Source URL</Label><Input value={f.endpoint} onChange={(e) => setF({ ...f, endpoint: e.target.value })} placeholder="https://..." /></div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save} disabled={!f.endpoint}>Save Connector</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Ingest Update Dialog ── */
function IngestDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const currentUser = useAuthStore((s) => s.user);
  const obligations = useLiveQuery(() => db.obligations.toArray(), []) ?? [];
  const [f, setF] = useState({
    authority: 'NPC' as RegulatorySource['authority'],
    title: '', summary: '', publishedAt: '',
  });

  const save = async () => {
    const event: RegulatoryUpdateEvent = {
      id: crypto.randomUUID(), workspaceId: 'ws-default', authority: f.authority,
      title: f.title, summary: f.summary,
      publishedAt: f.publishedAt ? new Date(f.publishedAt).getTime() : Date.now(),
      ingestedAt: Date.now(),
    };
    await db.regulatoryEvents.add(event);

    // Auto-map impact to obligations
    const impacted = obligations.filter((o) => o.authority === event.authority);
    const change: RegulatoryChangeRecord = {
      id: crypto.randomUUID(), workspaceId: 'ws-default',
      updateEventId: event.id,
      obligationCode: impacted.length === 1 ? impacted[0]?.code : undefined,
      changeType: 'amended',
      impactSummary: `${event.title} mapped to ${impacted.length} obligation(s)`,
      impactedObligationIds: impacted.map((o) => o.id),
      impactedControlIds: [],
      owner: new Set(impacted.map((o) => o.owner).filter(Boolean)).size === 1
        ? (impacted[0]?.owner ?? 'Unassigned')
        : 'Multiple owners',
      reviewStatus: 'queued',
    };
    await db.regulatoryChanges.add(change);
    await appendAuditEvent({ workspaceId: 'ws-default', entityType: 'regulatory_update', entityId: event.id, action: 'ingest', actorId: currentUser?.id ?? 'system', actorName: currentUser?.name ?? 'System', details: `Ingested ${event.authority} update` });
    toast.success(`Regulatory update ingested — mapped to ${impacted.length} obligation(s)`);
    setOpen(false);
    setF({ authority: 'NPC', title: '', summary: '', publishedAt: '' });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Ingest Regulatory Update</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Authority</Label>
              <Select value={f.authority} onValueChange={(v) => setF({ ...f, authority: v as RegulatorySource['authority'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{AUTHORITY_OPTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Published Date</Label><Input type="date" value={f.publishedAt} onChange={(e) => setF({ ...f, publishedAt: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>Title</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Update title" /></div>
          <div className="space-y-2"><Label>Summary</Label><Textarea value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} placeholder="Describe the change and its impact..." className="min-h-[80px]" /></div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save} disabled={!f.title}>Ingest & Map</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Updates() {
  const legacyUpdates = useLiveQuery(() => db.updates.orderBy('date').reverse().toArray(), []);
  const policies = useLiveQuery(() => db.policies.toArray(), []);
  const regulatoryEvents = useLiveQuery(() => db.regulatoryEvents.orderBy('ingestedAt').reverse().toArray(), []) ?? [];
  const changeRecords = useLiveQuery(() => db.regulatoryChanges.toArray(), []) ?? [];
  const feeds = useLiveQuery(() => db.regulatoryFeeds.orderBy('createdAt').reverse().toArray(), []) ?? [];

  const name = (id: string) => policies?.find((p) => p.id === id)?.title ?? id;

  const [tab, setTab] = useState<'all' | 'feeds'>('all');

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Regulatory Updates</h1>
          <p className="text-sm text-muted-foreground mt-1">Latest regulatory changes, impact mapping, and feed connectors.</p>
        </div>
        <div className="flex gap-2">
          <FeedDialog trigger={<Button variant="outline" className="gap-2"><Rss className="h-4 w-4" />Add Feed</Button>} />
          <IngestDialog trigger={<Button className="gap-2"><Plus className="h-4 w-4" /><span className="hidden sm:inline">Ingest Update</span></Button>} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Ingested Events</p><p className="text-2xl font-semibold tabular-nums">{regulatoryEvents.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Change Records</p><p className="text-2xl font-semibold tabular-nums">{changeRecords.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Feed Connectors</p><p className="text-2xl font-semibold tabular-nums">{feeds.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Legacy Alerts</p><p className="text-2xl font-semibold tabular-nums">{legacyUpdates?.length ?? 0}</p></CardContent></Card>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
        {[
          { value: 'all' as const, label: 'Updates & Alerts' },
          { value: 'feeds' as const, label: 'Feed Connectors' },
        ].map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors shrink-0',
              tab === t.value ? 'bg-foreground text-background border-foreground' : 'bg-background text-muted-foreground border-border hover:bg-accent'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'feeds' ? (
        <div className="space-y-3">
          {feeds.length === 0 ? (
            <EmptyState icon={Rss} title="No feed connectors" description="Add a feed connector to track regulatory sources." className="py-16" />
          ) : (
            feeds.map((feed) => (
              <Card key={feed.id}>
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{feed.authority} · {feed.connectorType}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{feed.endpoint}</p>
                    </div>
                    <Badge variant="secondary">{feed.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Ingested regulatory events */}
          {regulatoryEvents.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Ingested Regulatory Events</p>
              {regulatoryEvents.map((event) => {
                const mapped = changeRecords.find((c) => c.updateEventId === event.id);
                return (
                  <Card key={event.id}>
                    <CardContent className="p-4 sm:p-5 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <Zap className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                          <div>
                            <p className="text-sm font-medium leading-snug">{event.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{event.authority} · {new Date(event.publishedAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">{event.authority}</Badge>
                      </div>
                      {event.summary && <p className="text-sm text-muted-foreground">{event.summary}</p>}
                      {mapped && (
                        <div className="rounded-md border p-2.5 text-xs">
                          <p className="font-medium">Impact: {mapped.impactSummary}</p>
                          <p className="text-muted-foreground mt-0.5">Review: {mapped.reviewStatus} · Owner: {mapped.owner}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Legacy updates */}
          {legacyUpdates && legacyUpdates.length > 0 && (
            <div className="space-y-3">
              {regulatoryEvents.length > 0 && <p className="text-xs text-muted-foreground uppercase tracking-wider pt-4">Legacy Alerts</p>}
              {legacyUpdates.map((u) => {
                const { icon: Icon, label, variant } = SEV[u.severity];
                return (
                  <Card key={u.id}>
                    <CardContent className="p-4 sm:p-5">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5">
                            <Icon className={cn('h-4 w-4 mt-0.5 shrink-0',
                              u.severity === 'critical' ? 'text-red-500' : u.severity === 'warning' ? 'text-amber-500' : 'text-muted-foreground'
                            )} />
                            <div>
                              <p className="text-sm font-medium leading-snug">{u.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">{u.agency} · {new Date(u.date).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <Badge variant={variant} className="shrink-0 text-[10px]">{label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{u.description}</p>
                        {u.affectedPolicies.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {u.affectedPolicies.map((id) => (
                              <Link key={id} to={`/policies/${id}`}>
                                <Badge variant="outline" className="gap-1.5 cursor-pointer hover:bg-accent text-[10px]">
                                  {name(id)}<ExternalLink className="h-2.5 w-2.5" />
                                </Badge>
                              </Link>
                            ))}
                          </div>
                        )}
                        {u.actions.length > 0 && (
                          <ul className="space-y-1.5">
                            {u.actions.map((a, i) => (
                              <li key={i} className="text-sm flex items-start gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-foreground/30 shrink-0 mt-2" />{a}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {(legacyUpdates?.length ?? 0) === 0 && regulatoryEvents.length === 0 && (
            <EmptyState icon={Bell} title="No updates" description="Ingest a regulatory update or add a feed connector to start tracking." className="py-16" />
          )}
        </div>
      )}
    </div>
  );
}
