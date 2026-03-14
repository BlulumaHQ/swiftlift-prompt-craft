import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import logo from '@/assets/swiftlift-logo.svg';
import { ChevronDown, Hammer, PenLine, Layout, ShoppingCart, Home, Paintbrush, User, BookOpen, FolderOpen, Settings, LogOut } from 'lucide-react';

interface NavHeaderProps {
  title?: string;
  rightContent?: React.ReactNode;
}

const builderItems = [
  { label: 'Basic Builder', path: '/', icon: Hammer, active: true },
  { label: 'Ecommerce Builder', path: '#', icon: ShoppingCart, active: false },
  { label: 'Realtor Builder', path: '#', icon: Home, active: false },
  { label: 'Custom Builder', path: '#', icon: Paintbrush, active: false },
];

const profileMenuItems = [
  { label: 'Profile', path: '#', icon: User, active: false },
  { label: 'Prompt Library', path: '/prompt-library', icon: BookOpen, active: true },
  { label: 'Archive', path: '/projects', icon: FolderOpen, active: true },
  { label: 'Settings', path: '/settings', icon: Settings, active: true },
];

export default function NavHeader({ title, rightContent }: NavHeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [builderOpen, setBuilderOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const builderRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (builderRef.current && !builderRef.current.contains(e.target as Node)) setBuilderOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isActive = (path: string) => location.pathname === path;
  const isBuilderActive = location.pathname === '/';

  return (
    <header className="console-header flex items-center justify-between px-6 py-3 shrink-0">
      {/* Left side: Logo + Nav */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/')} className="flex items-center shrink-0 hover:opacity-80 transition-opacity">
          <img src={logo} alt="SwiftLift" className="h-8" />
        </button>
        <div className="h-5 w-px bg-foreground/20" />
        <nav className="flex items-center gap-1.5">
          {/* Builder Dropdown */}
          <div className="relative" ref={builderRef}>
            <button
              onClick={() => setBuilderOpen(!builderOpen)}
              className={`nav-link flex items-center gap-1.5 ${isBuilderActive ? 'active' : ''}`}
            >
              <Hammer size={14} /> Builder <ChevronDown size={12} className={`transition-transform ${builderOpen ? 'rotate-180' : ''}`} />
            </button>
            {builderOpen && (
              <div className="absolute top-full left-0 mt-1 w-52 rounded-lg border border-border bg-card shadow-xl z-50 py-1 overflow-hidden">
                {builderItems.map(item => (
                  <Link
                    key={item.label}
                    to={item.active ? item.path : '#'}
                    onClick={() => { if (item.active) setBuilderOpen(false); }}
                    className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                      item.active
                        ? 'text-foreground hover:bg-muted cursor-pointer'
                        : 'text-muted-foreground/50 cursor-not-allowed'
                    } ${isBuilderActive && item.active ? 'bg-accent' : ''}`}
                  >
                    <item.icon size={14} />
                    <span>{item.label}</span>
                    {!item.active && (
                      <span className="ml-auto text-[10px] font-medium uppercase tracking-wider text-muted-foreground/40">Soon</span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link to="/revision" className={`nav-link ${isActive('/revision') ? 'active' : ''}`}>
            <PenLine size={14} /> Revision
          </Link>
          <Link to="/references" className={`nav-link ${isActive('/references') ? 'active' : ''}`}>
            <Layout size={14} /> Demo Sites
          </Link>
        </nav>
      </div>

      {/* Right side: Action buttons + Profile */}
      <div className="flex items-center gap-2">
        {rightContent && (
          <>
            {rightContent}
            <div className="h-5 w-px bg-foreground/20 mx-1" />
          </>
        )}

        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="nav-link flex items-center gap-1.5"
          >
            <div className="w-6 h-6 rounded-full bg-primary/30 flex items-center justify-center">
              <User size={14} />
            </div>
          </button>
          {profileOpen && (
            <div className="absolute top-full right-0 mt-1 w-48 rounded-lg border border-border bg-card shadow-xl z-50 py-1 overflow-hidden">
              {profileMenuItems.map(item => (
                <Link
                  key={item.label}
                  to={item.active ? item.path : '#'}
                  onClick={() => { if (item.active) setProfileOpen(false); }}
                  className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                    item.active
                      ? 'text-foreground hover:bg-muted cursor-pointer'
                      : 'text-muted-foreground/50 cursor-not-allowed'
                  } ${isActive(item.path) ? 'bg-accent' : ''}`}
                >
                  <item.icon size={14} />
                  <span>{item.label}</span>
                  {!item.active && (
                    <span className="ml-auto text-[10px] font-medium uppercase tracking-wider text-muted-foreground/40">Soon</span>
                  )}
                </Link>
              ))}
              <div className="border-t border-border my-1" />
              <button
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground/50 cursor-not-allowed w-full"
              >
                <LogOut size={14} />
                <span>Logout</span>
                <span className="ml-auto text-[10px] font-medium uppercase tracking-wider text-muted-foreground/40">Soon</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
