/**
 * Sidebar Animation & Dimension Constants (Blue & White Theme).
 */

export const SIDEBAR_DIMENSIONS = {
  collapsedWidth: 'w-[72px]',
  collapsedWidthPx: 72,
  expandedWidth: 'w-[256px]',
  expandedWidthPx: 256,
  collapsedPadding: 'px-2.5',
  expandedPadding: 'px-3.5',
} as const;

export const SIDEBAR_TRANSITIONS = {
  // Main container transition
  sidebarContainer: 'transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
  
  // Navigation item label transitions
  labelExpanded:
    'opacity-100 translate-x-0 transition-all duration-300 delay-75 ease-out whitespace-nowrap overflow-hidden',
  labelCollapsed:
    'opacity-0 -translate-x-3 pointer-events-none transition-all duration-150 ease-in whitespace-nowrap overflow-hidden w-0',

  // Section title transitions
  sectionTitleExpanded:
    'opacity-100 translate-x-0 transition-all duration-200 ease-out',
  sectionTitleCollapsed:
    'opacity-0 -translate-x-2 pointer-events-none transition-all duration-100 ease-in w-0 h-0 overflow-hidden',

  // Tooltip transition for collapsed state
  tooltip:
    'transition-all duration-200 ease-out origin-left',
} as const;

export const SIDEBAR_ITEM_STYLES = {
  base: 'group relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 select-none cursor-pointer outline-none',
  
  // Active route: Solid blue on dark blue sidebar
  active:
    'bg-blue-600 text-white font-semibold shadow-xs',

  // Inactive route: Soft slate text on dark blue sidebar
  inactive:
    'text-slate-400 hover:text-white hover:bg-slate-800/70',
} as const;
