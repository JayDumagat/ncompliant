import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText, CheckSquare, ClipboardCheck, Settings,
  PanelLeftClose, ListChecks, LayoutTemplate, GraduationCap, AlertTriangle,
  BarChart3, FileBarChart, Bell, MoreHorizontal, Zap, Building2, Database,
  GitBranch, CalendarClock, ChevronDown, ShieldCheck, Scale, ShieldAlert,
  UserCheck, BookOpen, Globe, Archive, ScrollText, Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/uiStore';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useState } from 'react';
import type { RoleKey } from '@/db/db';

/* ── Types ── */
interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  to: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

/* ── Navigation Structure ── */
const PINNED: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/dashboard' },
];

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Governance',
    items: [
      { icon: FileText, label: 'Policies', to: '/policies' },
      { icon: ClipboardCheck, label: 'Assessments', to: '/assessments' },
      { icon: Scale, label: 'Obligations', to: '/obligations' },
      { icon: CheckSquare, label: 'Tasks', to: '/tasks' },
      { icon: ListChecks, label: 'Checklists', to: '/checklists' },
      { icon: LayoutTemplate, label: 'Templates', to: '/templates' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { icon: AlertTriangle, label: 'Incidents', to: '/incidents' },
      { icon: ShieldAlert, label: 'Breach Workflows', to: '/breach-workflows' },
      { icon: UserCheck, label: 'DSR Cases', to: '/dsr-cases' },
    ],
  },
  {
    title: 'Data Privacy',
    items: [
      { icon: Database, label: 'Data Inventory', to: '/data-management' },
      { icon: GitBranch, label: 'Data Map', to: '/data-mapping' },
      { icon: BookOpen, label: 'ROPA', to: '/ropa' },
      { icon: Globe, label: 'Transfers', to: '/transfers' },
    ],
  },
  {
    title: 'Regulatory',
    items: [
      { icon: Bell, label: 'Reg. Updates', to: '/updates' },
      { icon: Send, label: 'Submissions', to: '/submissions' },
    ],
  },
  {
    title: 'Reporting',
    items: [
      { icon: BarChart3, label: 'Analytics', to: '/analytics' },
      { icon: FileBarChart, label: 'Reports', to: '/reports' },
      { icon: Archive, label: 'Evidence Vault', to: '/evidence' },
      { icon: ScrollText, label: 'Audit Trail', to: '/audit-trail' },
    ],
  },
  {
    title: 'Admin',
    items: [
      { icon: GraduationCap, label: 'Training', to: '/training' },
      { icon: Building2, label: 'Vendors', to: '/vendors' },
      { icon: CalendarClock, label: 'Reminders', to: '/reminders' },
      { icon: Settings, label: 'Settings', to: '/settings' },
    ],
  },
];

/* ── Flat list for mobile ── */
const ALL_NAV_ITEMS: NavItem[] = [
  ...PINNED,
  ...NAV_GROUPS.flatMap((g) => g.items),
];

/* ── Helpers ── */
function isActive(to: string, pathname: string) {
  return to === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(to);
}

function NavLink({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  const loc = useLocation();
  const active = isActive(item.to, loc.pathname);
  return (
    <Link
      to={item.to}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-1.5 text-[13px] transition-colors',
        active
          ? 'text-foreground font-medium'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      <item.icon className="h-4 w-4" />
      {item.label}
    </Link>
  );
}

function NavSection({ group }: { group: NavGroup }) {
  const loc = useLocation();
  const hasActiveChild = group.items.some((item) => isActive(item.to, loc.pathname));
  const [open, setOpen] = useState(hasActiveChild);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70 hover:text-muted-foreground transition-colors"
      >
        {group.title}
        <ChevronDown
          className={cn(
            'h-3 w-3 transition-transform duration-200',
            open ? 'rotate-0' : '-rotate-90'
          )}
        />
      </button>
      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          open ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="space-y-0.5 pb-1">
          {group.items.map((item) => (
            <NavLink key={item.to} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

function getRoleLabel(role?: RoleKey | null) {
  switch (role) {
    case 'admin':
    case 'compliance_admin':
      return 'Compliance Admin';
    case 'compliance_manager':
      return 'Compliance Manager';
    case 'breach_manager':
      return 'Breach Manager';
    case 'dsr_handler':
      return 'DSR Handler';
    case 'auditor':
      return 'Auditor';
    case 'approver':
      return 'Approver';
    default:
      return 'Compliance User';
  }
}

/** Desktop sidebar */
export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  if (!sidebarOpen) return null;

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden lg:flex w-56 flex-col border-r bg-background">
      <div className="flex h-14 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <Zap className="h-4 w-4" />
          <span className="text-sm font-semibold tracking-tight">NCompliant</span>
        </Link>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={toggleSidebar} aria-label="Collapse sidebar">
          <PanelLeftClose className="h-3.5 w-3.5" />
        </Button>
      </div>
      <ScrollArea className="flex-1 px-2 py-2">
        <nav className="space-y-1">
          {/* Pinned items */}
          {PINNED.map((item) => (
            <NavLink key={item.to} item={item} />
          ))}
          {/* Grouped sections */}
          {NAV_GROUPS.map((group) => (
            <NavSection key={group.title} group={group} />
          ))}
        </nav>
      </ScrollArea>
      <footer className="border-t px-2 py-3" aria-label="Account menu">
        <div className="flex items-center justify-between">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="h-10 w-full justify-between px-2.5 text-left"
                aria-label={`Open account menu for ${user?.name || 'your account'}`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-[11px] font-medium">{(user?.name || user?.email || 'U').toString().slice(0,2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 text-left">
                    <span className="block truncate text-sm font-medium text-foreground">{user?.name || 'Account'}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{getRoleLabel(user?.role)}</span>
                  </span>
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56" aria-label="Account actions">
              <DropdownMenuLabel className="space-y-0.5">
                <p className="text-sm">{user?.name || 'Account'}</p>
                <p className="text-xs text-muted-foreground font-normal">{user?.email || 'No email'}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate('/profile')}>Profile</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/reminders')}>Reminders</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/settings')}>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  logout();
                  navigate('/login', { replace: true });
                }}
                className="text-destructive focus:text-destructive"
              >
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </footer>
    </aside>
  );
}

/* ── Bottom Tab Bar (Mobile) ── */
const BOTTOM_TABS = [
  { icon: LayoutDashboard, label: 'Home', to: '/dashboard' },
  { icon: FileText, label: 'Policies', to: '/policies' },
  { icon: ClipboardCheck, label: 'Assess', to: '/assessments' },
  { icon: CheckSquare, label: 'Tasks', to: '/tasks' },
  { icon: MoreHorizontal, label: 'More', to: '__more__' },
];

const MORE_ITEMS: NavItem[] = ALL_NAV_ITEMS.filter(
  (item) => !BOTTOM_TABS.some((tab) => tab.to === item.to)
);

export function BottomTabBar() {
  const loc = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t bg-background safe-bottom">
        <div className="flex items-stretch">
          {BOTTOM_TABS.map(tab => {
            if (tab.to === '__more__') {
              const isMoreActive = MORE_ITEMS.some(m => loc.pathname.startsWith(m.to));
              return (
                <button
                  key="more"
                  onClick={() => setMoreOpen(true)}
                  aria-label="Open more navigation"
                  className={cn(
                    'flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors',
                    isMoreActive ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="text-[10px]">{tab.label}</span>
                </button>
              );
            }
            const active = tab.to === '/dashboard' ? loc.pathname === '/dashboard' : loc.pathname.startsWith(tab.to);
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors',
                  active ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                <tab.icon className="h-4 w-4" />
                <span className="text-[10px]">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* More sheet — grouped list */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-xl pb-safe" aria-label="More navigation">
          <div className="mx-auto w-8 h-0.5 rounded-full bg-muted mb-4" />
          <nav className="pb-2 space-y-3">
            {NAV_GROUPS.map((group) => (
              <div key={group.title}>
                <p className="px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1">
                  {group.title}
                </p>
                {group.items
                  .filter((item) => !BOTTOM_TABS.some((tab) => tab.to === item.to))
                  .map((item) => {
                    const active = loc.pathname.startsWith(item.to);
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setMoreOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-2 py-2.5 rounded-md transition-colors text-sm',
                          active ? 'text-foreground font-medium' : 'text-muted-foreground'
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    );
                  })}
              </div>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
