/**
 * Server data layer store interfaces and types
 */

export interface SheetStore {
  readRecords(sheetName: string): Promise<Record<string, unknown>[]>;
  appendRecord(sheetName: string, record: Record<string, unknown>): Promise<Record<string, unknown>>;
  updateRecord(
    sheetName: string,
    id: string,
    updates: Record<string, unknown>,
    idKey?: string
  ): Promise<Record<string, unknown>>;
  deleteRecord(sheetName: string, id: string, idKey?: string): Promise<boolean>;
  batchAppendRecords(sheetName: string, records: Record<string, unknown>[]): Promise<void>;
  initializeAllSheets(): Promise<{ created: string[]; existing: string[] }>;
}

export interface CachedSheet {
  records: Record<string, unknown>[];
  timestamp: number;
}

export interface DatabaseInfo {
  spreadsheetId: string;
  name: string;
  url?: string;
}
