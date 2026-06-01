import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, CheckSquare, ClipboardCheck, Settings, PanelLeftClose, ListChecks, LayoutTemplate, GraduationCap, AlertTriangle, BarChart3, FileBarChart, Bell, MoreHorizontal, Zap, Building2, Database, GitBranch, CalendarClock, ChevronDown, ShieldCheck } from 'lucide-react';
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

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/dashboard' },
  { icon: FileText, label: 'Policies', to: '/policies' },
  { icon: ClipboardCheck, label: 'Assessments', to: '/assessments' },
  { icon: CheckSquare, label: 'Tasks', to: '/tasks' },
  { icon: ListChecks, label: 'Checklists', to: '/checklists' },
  { icon: LayoutTemplate, label: 'Templates', to: '/templates' },
  { icon: AlertTriangle, label: 'Incidents', to: '/incidents' },
  { icon: BarChart3, label: 'Analytics', to: '/analytics' },
  { icon: FileBarChart, label: 'Reports', to: '/reports' },
  { icon: GraduationCap, label: 'Training', to: '/training' },
  { icon: Building2, label: 'Vendors', to: '/vendors' },
  { icon: Database, label: 'Data', to: '/data-management' },
  { icon: GitBranch, label: 'Data Map', to: '/data-mapping' },
  { icon: CalendarClock, label: 'Reminders', to: '/reminders' },
  { icon: Bell, label: 'Updates', to: '/updates' },
  { icon: ShieldCheck, label: 'PH Compliance', to: '/ph-compliance' },
];

function NavLink({ item, onClick }: { item: typeof NAV_ITEMS[0]; onClick?: () => void }) {
  const loc = useLocation();
  const active = item.to === '/dashboard' ? loc.pathname === '/dashboard' : loc.pathname.startsWith(item.to);
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
        <nav className="space-y-0.5">
          {NAV_ITEMS.map(item => (
            <NavLink key={item.to} item={item} />
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

const MORE_ITEMS = [
  { icon: ListChecks, label: 'Checklists', to: '/checklists' },
  { icon: LayoutTemplate, label: 'Templates', to: '/templates' },
  { icon: AlertTriangle, label: 'Incidents', to: '/incidents' },
  { icon: BarChart3, label: 'Analytics', to: '/analytics' },
  { icon: FileBarChart, label: 'Reports', to: '/reports' },
  { icon: GraduationCap, label: 'Training', to: '/training' },
  { icon: Building2, label: 'Vendors', to: '/vendors' },
  { icon: Database, label: 'Data', to: '/data-management' },
  { icon: GitBranch, label: 'Data Map', to: '/data-mapping' },
  { icon: CalendarClock, label: 'Reminders', to: '/reminders' },
  { icon: Bell, label: 'Updates', to: '/updates' },
  { icon: ShieldCheck, label: 'PH Compliance', to: '/ph-compliance' },
  { icon: Settings, label: 'Settings', to: '/settings' },
];

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

      {/* More sheet — vertical list */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-xl pb-safe" aria-label="More navigation">
          <div className="mx-auto w-8 h-0.5 rounded-full bg-muted mb-4" />
          <nav className="pb-2">
            {MORE_ITEMS.map(item => {
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
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
