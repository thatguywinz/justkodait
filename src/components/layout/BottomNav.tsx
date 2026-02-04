/**
 * Bottom Navigation Component
 * Mobile-first navigation bar with 4 main tabs
 */

import { Home, Compass, MapPin, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/discover', label: 'Discover', icon: Compass },
  { path: '/map', label: 'Map', icon: MapPin },
  { path: '/profile', label: 'Profile', icon: User },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  // Don't show on auth pages
  if (location.pathname === '/auth') return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg safe-area-inset-bottom">
      <div className="flex h-16 items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-all duration-200',
                'hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <div className={cn(
                'relative flex items-center justify-center rounded-full p-1.5 transition-all duration-200',
                isActive && 'bg-primary/10'
              )}>
                <Icon className={cn('h-5 w-5', isActive && 'scale-110')} />
                {isActive && (
                  <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-primary" />
                )}
              </div>
              <span className={cn(
                'text-[10px] font-medium transition-all',
                isActive ? 'font-semibold' : 'font-normal'
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
