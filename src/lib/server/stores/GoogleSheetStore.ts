import type { SheetStore, CachedSheet } from '../types';
import { ALL_SHEET_NAMES, SHEET_HEADERS, getColumnLetter, nowIso } from '../utils';
import { sanitizeCellValue } from '../validation';

// Global in-memory caches shared across requests in this Node process
const SHEET_DATA_CACHE = new Map<string, CachedSheet>();
const SHEET_IN_FLIGHT_PROMISES = new Map<string, Promise<Record<string, unknown>[]>>();
const SHEET_PROPERTIES_CACHE = new Map<
  string,
  { sheets: { properties?: { title?: string; sheetId?: number } }[]; timestamp: number }
>();

const MAX_CACHE_ENTRIES = 100;
const SHEET_CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL
const PROPERTIES_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes TTL

function setBoundedCache<K, V>(cache: Map<K, V>, key: K, value: V, maxEntries = MAX_CACHE_ENTRIES): void {
  if (cache.has(key)) {
    cache.delete(key);
  } else if (cache.size >= maxEntries) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) {
      cache.delete(oldestKey);
    }
  }
  cache.set(key, value);
}

export class GoogleSheetStore implements SheetStore {
  constructor(
    private accessToken: string,
    private spreadsheetId: string
  ) {}

  private invalidateCache(sheetName?: string): void {
    if (sheetName) {
      SHEET_DATA_CACHE.delete(`${this.spreadsheetId}:${sheetName}`);
    } else {
      for (const key of SHEET_DATA_CACHE.keys()) {
        if (key.startsWith(`${this.spreadsheetId}:`)) {
          SHEET_DATA_CACHE.delete(key);
        }
      }
    }
  }

  private async fetchSheetsApi<T = unknown>(
    endpoint: string,
    options: RequestInit = {},
    attempt = 0
  ): Promise<T> {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}${endpoint}`;
    const headers = {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errText = await res.text();
      const isRateLimit =
        res.status === 429 ||
        errText.includes('RATE_LIMIT_EXCEEDED') ||
        errText.includes('RESOURCE_EXHAUSTED') ||
        errText.includes('Quota exceeded');

      if (isRateLimit && attempt < 3) {
        // Backoff: attempt 0 -> ~1.5s, attempt 1 -> ~3s, attempt 2 -> ~5s
        const backoffMs = Math.min(6000, 1500 * Math.pow(2, attempt) + Math.random() * 800);
        console.warn(
          `[GoogleSheetStore] 429 Quota Exceeded. Backing off for ${Math.round(backoffMs)}ms before retry ${attempt + 1}/3...`
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        return this.fetchSheetsApi<T>(endpoint, options, attempt + 1);
      }

      throw new Error(`Google Sheets API Error (${res.status}): ${errText}`);
    }

    return res.json() as Promise<T>;
  }

  private async getSheetProperties(): Promise<{ properties?: { title?: string; sheetId?: number } }[]> {
    const cached = SHEET_PROPERTIES_CACHE.get(this.spreadsheetId);
    const now = Date.now();
    if (cached && now - cached.timestamp < PROPERTIES_CACHE_TTL_MS) {
      return cached.sheets;
    }
    const meta = await this.fetchSheetsApi<{
      sheets?: { properties?: { title?: string; sheetId?: number } }[];
    }>('?fields=sheets.properties');
    const sheets = meta.sheets || [];
    setBoundedCache(SHEET_PROPERTIES_CACHE, this.spreadsheetId, { sheets, timestamp: now });
    return sheets;
  }

  async initializeAllSheets(): Promise<{ created: string[]; existing: string[] }> {
    const sheetsList = await this.getSheetProperties();
    const existingSheetNames = new Set<string>(
      sheetsList.map((s) => s.properties?.title).filter((t): t is string => Boolean(t))
    );

    const missingSheets = ALL_SHEET_NAMES.filter((name) => !existingSheetNames.has(name));
    const created: string[] = [];
    const existing: string[] = [];

    ALL_SHEET_NAMES.forEach((name) => {
      if (existingSheetNames.has(name)) {
        existing.push(name);
      }
    });

    if (missingSheets.length > 0) {
      const addRequests = missingSheets.map((title) => ({
        addSheet: { properties: { title } },
      }));
      await this.fetchSheetsApi(':batchUpdate', {
        method: 'POST',
        body: JSON.stringify({ requests: addRequests }),
      });
      created.push(...missingSheets);
      SHEET_PROPERTIES_CACHE.delete(this.spreadsheetId);
    }

    // Populate headers for newly created or empty sheets
    const headerDataUpdates = [];
    for (const sheetName of ALL_SHEET_NAMES) {
      const headers = SHEET_HEADERS[sheetName];
      if (created.includes(sheetName)) {
        headerDataUpdates.push({
          range: `'${sheetName}'!A1:${getColumnLetter(headers.length)}1`,
          values: [headers],
        });
      }
    }

    if (headerDataUpdates.length > 0) {
      await this.fetchSheetsApi('/values:batchUpdate', {
        method: 'POST',
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data: headerDataUpdates,
        }),
      });
    }

    this.invalidateCache();
    return { created, existing };
  }

  async readRecords(sheetName: string): Promise<Record<string, unknown>[]> {
    const cacheKey = `${this.spreadsheetId}:${sheetName}`;
    const now = Date.now();
    const cached = SHEET_DATA_CACHE.get(cacheKey);

    // 1. Serve from in-memory cache if fresh
    if (cached && now - cached.timestamp < SHEET_CACHE_TTL_MS) {
      return cached.records.map((r) => ({ ...r }));
    }

    // 2. Coalesce concurrent identical read requests (Request deduplication)
    const inFlight = SHEET_IN_FLIGHT_PROMISES.get(cacheKey);
    if (inFlight) {
      const records = await inFlight;
      return records.map((r) => ({ ...r }));
    }

    // 3. Perform fetch from Google Sheets API with error resilience
    const fetchPromise = (async () => {
      try {
        const res = await this.fetchSheetsApi<{ values?: unknown[][] }>(
          `/values/'${encodeURIComponent(sheetName)}'!A1:ZZ`
        );
        const rows: unknown[][] = res.values || [];
        if (rows.length < 2) {
          setBoundedCache(SHEET_DATA_CACHE, cacheKey, { records: [], timestamp: Date.now() });
          return [];
        }
        const headers: string[] = rows[0].map(String);
        const records: Record<string, unknown>[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;
          const obj: Record<string, unknown> = {};
          headers.forEach((h, colIdx) => {
            obj[h] = row[colIdx] !== undefined ? row[colIdx] : '';
          });
          records.push(obj);
        }
        setBoundedCache(SHEET_DATA_CACHE, cacheKey, { records, timestamp: Date.now() });
        return records;
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg.includes('Unable to parse range')) {
          setBoundedCache(SHEET_DATA_CACHE, cacheKey, { records: [], timestamp: Date.now() });
          return [];
        }
        // Graceful fallback: If 429 quota exhaustion persists after retries, serve stale cached data if available
        if (
          cached &&
          (errMsg.includes('429') ||
            errMsg.includes('RESOURCE_EXHAUSTED') ||
            errMsg.includes('Quota exceeded'))
        ) {
          console.warn(
            `[GoogleSheetStore] Rate limit reached for sheet "${sheetName}". Gracefully serving ${cached.records.length} records from stale cache.`
          );
          return cached.records.map((r) => ({ ...r }));
        }
        throw err;
      } finally {
        SHEET_IN_FLIGHT_PROMISES.delete(cacheKey);
      }
    })();

    SHEET_IN_FLIGHT_PROMISES.set(cacheKey, fetchPromise);
    const records = await fetchPromise;
    return records.map((r) => ({ ...r }));
  }

  async appendRecord(sheetName: string, record: Record<string, unknown>): Promise<Record<string, unknown>> {
    const headers = SHEET_HEADERS[sheetName] || Object.keys(record);
    const rowValues = headers.map((h) => (record[h] !== undefined ? sanitizeCellValue(record[h]) : ''));
    await this.fetchSheetsApi(
      `/values/'${encodeURIComponent(sheetName)}'!A1:ZZ:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        body: JSON.stringify({ values: [rowValues] }),
      }
    );
    const cacheKey = `${this.spreadsheetId}:${sheetName}`;
    const cached = SHEET_DATA_CACHE.get(cacheKey);
    if (cached) {
      cached.records.push({ ...record });
      cached.timestamp = Date.now();
    } else {
      this.invalidateCache(sheetName);
    }
    return record;
  }

  async updateRecord(
    sheetName: string,
    id: string,
    updates: Record<string, unknown>,
    idKey = 'id'
  ): Promise<Record<string, unknown>> {
    const res = await this.fetchSheetsApi<{ values?: unknown[][] }>(
      `/values/'${encodeURIComponent(sheetName)}'!A1:ZZ`
    );
    const rows: unknown[][] = res.values || [];
    if (rows.length < 2) {
      throw new Error(`Sheet "${sheetName}" is empty.`);
    }
    const headers: string[] = rows[0].map(String);
    const idColIdx = headers.indexOf(idKey);
    if (idColIdx === -1) {
      throw new Error(`Key column "${idKey}" not found in sheet "${sheetName}".`);
    }

    let foundRowIdx = -1;
    for (let r = 1; r < rows.length; r++) {
      if (String(rows[r][idColIdx]) === String(id)) {
        foundRowIdx = r;
        break;
      }
    }

    if (foundRowIdx === -1) {
      throw new Error(`Record with ${idKey}="${id}" not found in sheet "${sheetName}".`);
    }

    const currentRow = rows[foundRowIdx];
    const currentObj: Record<string, unknown> = {};
    headers.forEach((h, colIdx) => {
      currentObj[h] = currentRow[colIdx] !== undefined ? currentRow[colIdx] : '';
    });

    const merged: Record<string, unknown> = { ...currentObj, ...updates, updatedAt: nowIso() };
    const updatedRowValues = headers.map((h) => (merged[h] !== undefined ? sanitizeCellValue(merged[h]) : ''));

    const rowNum = foundRowIdx + 1; // 1-based index in Sheet
    await this.fetchSheetsApi(
      `/values/'${encodeURIComponent(sheetName)}'!A${rowNum}:ZZ${rowNum}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        body: JSON.stringify({ values: [updatedRowValues] }),
      }
    );

    const cacheKey = `${this.spreadsheetId}:${sheetName}`;
    const cached = SHEET_DATA_CACHE.get(cacheKey);
    if (cached) {
      const idx = cached.records.findIndex((r) => String(r[idKey]) === String(id));
      if (idx !== -1) {
        cached.records[idx] = { ...merged };
        cached.timestamp = Date.now();
      } else {
        this.invalidateCache(sheetName);
      }
    } else {
      this.invalidateCache(sheetName);
    }
    return merged;
  }

  async deleteRecord(sheetName: string, id: string, idKey = 'id'): Promise<boolean> {
    const sheets = await this.getSheetProperties();
    const targetSheet = sheets.find(
      (s) => s.properties?.title === sheetName
    );
    if (!targetSheet || targetSheet.properties?.sheetId === undefined) return false;
    const sheetId = targetSheet.properties.sheetId;

    const res = await this.fetchSheetsApi<{ values?: unknown[][] }>(
      `/values/'${encodeURIComponent(sheetName)}'!A1:ZZ`
    );
    const rows: unknown[][] = res.values || [];
    if (rows.length < 2) return false;

    const headers: string[] = rows[0].map(String);
    const idColIdx = headers.indexOf(idKey);
    if (idColIdx === -1) return false;

    let foundRowIdx = -1;
    for (let r = 1; r < rows.length; r++) {
      if (String(rows[r][idColIdx]) === String(id)) {
        foundRowIdx = r;
        break;
      }
    }

    if (foundRowIdx === -1) return false;

    await this.fetchSheetsApi(':batchUpdate', {
      method: 'POST',
      body: JSON.stringify({
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: foundRowIdx,
                endIndex: foundRowIdx + 1,
              },
            },
          },
        ],
      }),
    });

    const cacheKey = `${this.spreadsheetId}:${sheetName}`;
    const cached = SHEET_DATA_CACHE.get(cacheKey);
    if (cached) {
      cached.records = cached.records.filter((r) => String(r[idKey]) !== String(id));
      cached.timestamp = Date.now();
    } else {
      this.invalidateCache(sheetName);
    }
    return true;
  }

  async batchAppendRecords(sheetName: string, records: Record<string, unknown>[]): Promise<void> {
    if (records.length === 0) return;
    const headers = SHEET_HEADERS[sheetName] || Object.keys(records[0]);
    const values = records.map((rec) =>
      headers.map((h) => (rec[h] !== undefined ? sanitizeCellValue(rec[h]) : ''))
    );
    await this.fetchSheetsApi(
      `/values/'${encodeURIComponent(sheetName)}'!A1:ZZ:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        body: JSON.stringify({ values }),
      }
    );
    this.invalidateCache(sheetName);
  }
}
