/**
 * Central Server Data Layer Façade
 * Re-exports store interfaces, storage implementations, schema definitions,
 * utility functions, and the central action dispatcher for backward compatibility.
 */

// Core Store Interfaces and Types
export type { SheetStore, CachedSheet, DatabaseInfo } from './types';

// Storage Engines
export { DevFileStore, getInitialDevData } from './stores/DevFileStore';
export { GoogleSheetStore } from './stores/GoogleSheetStore';
export { getStore, findOrCreateDatabase } from './stores/storeFactory';

// Schema and Data Constants
export { SHEET_HEADERS, ALL_SHEET_NAMES } from './utils';

// Core Server Utilities
export {
  nowIso,
  formatDate,
  getColumnLetter,
  generateId,
  stringValue,
  numValue,
  boolValue,
  extractKeywords,
  getDayName,
  generateRecurrenceDates,
  logAuditEvent,
} from './utils';

// Central Action Dispatcher
export { executeTrackerAction } from './dispatcher';
