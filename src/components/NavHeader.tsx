import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logo from '@/assets/swiftlift-logo.svg';
import { ChevronDown, Hammer, PenLine, Layout, BookOpen, FolderOpen, Settings, ShoppingCart, Home, Wrench, Paintbrush } from 'lucide-react';

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

export default function NavHeader({ title, rightContent }: NavHeaderProps) {
  const location = useLocation();
  const [builderOpen, setBuilderOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setBuilderOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isActive = (path: string) => location.pathname === path;
  const isBuilderActive = location.pathname === '/';

  return (
    <header className="console-header flex items-center justify-between px-6 py-3 shrink-0">
      <div className="flex items-center gap-3">
        <img src={logo} alt="SwiftLift" className="h-8" />
        <div className="h-5 w-px bg-foreground/20" />
        <h1 className="text-sm font-semibold tracking-tight text-[hsl(var(--console-header-foreground))]">
          {title || 'Prompt App'}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        {rightContent && (
          <>
            {rightContent}
            <div className="h-5 w-px bg-foreground/20 mx-1" />
          </>
        )}
        <nav className="flex items-center gap-1.5">
          {/* Builder Dropdown */}
          <div className="relative" ref={dropdownRef}>
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
          <Link to="/prompt-library" className={`nav-link ${isActive('/prompt-library') ? 'active' : ''}`}>
            <BookOpen size={14} /> Prompt Library
          </Link>
          <Link to="/projects" className={`nav-link ${isActive('/projects') ? 'active' : ''}`}>
            <FolderOpen size={14} /> Archive
          </Link>
          <Link to="/settings" className={`nav-link ${isActive('/settings') ? 'active' : ''}`}>
            <Settings size={14} /> Settings
          </Link>
        </nav>
      </div>
    </header>
  );
}
