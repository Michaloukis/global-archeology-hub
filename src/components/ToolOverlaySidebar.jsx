import { useState } from 'react';
import { Link } from 'react-router-dom';

const TRIGGER_WIDTH = 16;
const SIDEBAR_WIDTH = 72;

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/?view=map', label: 'Map' },
  { to: '/?view=arch', label: 'Tools' },
];

export default function ToolOverlaySidebar({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="relative w-full h-full min-h-screen">
      {children}
      {/* Hover zone: left edge reveals sidebar */}
      <div
        className="fixed left-0 top-0 bottom-0 z-50 flex transition-[width] duration-300 ease-out"
        style={{ width: sidebarOpen ? TRIGGER_WIDTH + SIDEBAR_WIDTH : TRIGGER_WIDTH }}
        onMouseEnter={() => setSidebarOpen(true)}
        onMouseLeave={() => setSidebarOpen(false)}
      >
        {/* Trigger strip at left edge - hover here to reveal sidebar */}
        <div
          className="h-full shrink-0 bg-black/10 hover:bg-black/25 transition-colors cursor-default"
          style={{ width: TRIGGER_WIDTH }}
          aria-label="Show sidebar"
        />
        {/* Sidebar panel - slides in over content */}
        <aside
          className="h-full shrink-0 bg-gray-200/95 backdrop-blur-sm border-r border-black/20 shadow-xl flex flex-col overflow-hidden transition-transform duration-300 ease-out"
          style={{
            width: SIDEBAR_WIDTH,
            transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          }}
        >
          <div className="p-2 border-b border-black/10 shrink-0 flex flex-col items-center">
            <Link to="/" className="w-8 h-8 rounded-full bg-gray-300 border border-black/20 flex items-center justify-center mb-1 hover:bg-gray-400 transition-colors">
              <svg className="w-4 h-4 text-black/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </Link>
            <span className="text-[9px] font-medium text-black/80 text-center truncate w-full">Hub</span>
          </div>
          <nav className="flex-1 py-2 flex flex-col items-center gap-0.5 overflow-auto">
            {navItems.map(({ to, label }) => (
              <Link
                key={label}
                to={to}
                className="w-full flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-lg text-black/90 hover:bg-black/10 transition-colors text-[9px] font-medium"
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-black/20 p-1 shrink-0">
            <Link
              to="/"
              className="w-full flex flex-col items-center justify-center py-1.5 gap-0.5 text-black/80 hover:bg-black/10 rounded-lg text-[9px] font-medium"
            >
              ← Back to Hub
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
