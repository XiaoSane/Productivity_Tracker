import React from 'react';
import {
  LayoutDashboard,
  Target,
  CheckSquare,
  Calendar,
  GraduationCap,
  CalendarCheck,
  BookOpen,
  BarChart3,
  Settings,
} from 'lucide-react';

export interface NavItemConfig {
  id: string;
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  description?: string;
  badge?: string;
}

export interface NavSectionConfig {
  id: string;
  title: string;
  items: NavItemConfig[];
}

export const NAVIGATION_SECTIONS: NavSectionConfig[] = [
  {
    id: 'core',
    title: 'Core Tracking',
    items: [
      {
        id: 'dashboard',
        name: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        description: "Today's Command Center",
      },
      {
        id: 'arc',
        name: 'Arc Sprints',
        href: '/arc',
        icon: Target,
        description: 'Horizon Goals & Sprints',
      },
      {
        id: 'tasks',
        name: 'Tasks',
        href: '/tasks',
        icon: CheckSquare,
        description: 'Action Items & Prioritization',
      },
      {
        id: 'calendar',
        name: 'Calendar',
        href: '/calendar',
        icon: Calendar,
        description: 'Schedule & Deadlines',
      },
      {
        id: 'exams',
        name: 'Exams',
        href: '/exams',
        icon: GraduationCap,
        description: 'Exam Milestones & Topics',
      },
    ],
  },
  {
    id: 'insights',
    title: 'Logs & Review',
    items: [
      {
        id: 'daily-log',
        name: 'Daily Log',
        href: '/daily-log',
        icon: CalendarCheck,
        description: 'Daily Reflection & Sleep',
      },
      {
        id: 'reviews',
        name: 'Reviews',
        href: '/reviews',
        icon: BookOpen,
        description: 'Weekly, Monthly & Arc Reviews',
      },
      {
        id: 'analytics',
        name: 'Analytics',
        href: '/analytics',
        icon: BarChart3,
        description: 'Performance Trends & Metrics',
      },
    ],
  },
  {
    id: 'system',
    title: 'System',
    items: [
      {
        id: 'settings',
        name: 'Settings',
        href: '/settings',
        icon: Settings,
        description: 'Cloud Connection & Database',
      },
    ],
  },
];

// Flattened items for easy lookup
export const ALL_NAV_ITEMS: NavItemConfig[] = NAVIGATION_SECTIONS.flatMap((sec) => sec.items);

/**
 * Determines if a route matches the current pathname.
 */
export function isRouteActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href !== '/dashboard' && pathname.startsWith(href)) return true;
  return false;
}
