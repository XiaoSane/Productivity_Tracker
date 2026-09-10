import type { SessionData } from '@/lib/auth/session';
import type { SheetStore, DatabaseInfo } from '../types';
import { DevFileStore } from './DevFileStore';
import { GoogleSheetStore } from './GoogleSheetStore';

export function getStore(session: SessionData): SheetStore {
  if (session.isDevMode) {
    return new DevFileStore();
  }
  if (!session.tokens?.accessToken || !session.database?.spreadsheetId) {
    throw new Error('Database not connected. Please complete Setup Wizard.');
  }
  return new GoogleSheetStore(session.tokens.accessToken, session.database.spreadsheetId);
}

export async function findOrCreateDatabase(session: SessionData): Promise<DatabaseInfo> {
  if (session.isDevMode) {
    return {
      spreadsheetId: 'dev-database-local',
      name: 'Productivity Tracker Database',
      url: '#',
    };
  }

  if (!session.tokens?.accessToken) {
    throw new Error('No access token available for database search.');
  }

  const token = session.tokens.accessToken;
  const dbName = 'Productivity Tracker Database';

  // 1. Search Google Drive for existing spreadsheet
  const query = encodeURIComponent(
    `name = '${dbName}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`
  );
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!searchRes.ok) {
    const err = await searchRes.text();
    throw new Error(`Failed to search Google Drive: ${err}`);
  }

  const searchData = (await searchRes.json()) as {
    files?: { id: string; name: string; webViewLink?: string }[];
  };
  const files = searchData.files || [];

  if (files.length > 0) {
    return {
      spreadsheetId: files[0].id,
      name: files[0].name,
      url: files[0].webViewLink,
    };
  }

  // 2. Create new spreadsheet in Google Drive
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: dbName,
      mimeType: 'application/vnd.google-apps.spreadsheet',
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Failed to create Google Spreadsheet in Drive: ${err}`);
  }

  const newFile = (await createRes.json()) as { id: string; name?: string; webViewLink?: string };
  return {
    spreadsheetId: newFile.id,
    name: newFile.name || dbName,
    url: newFile.webViewLink,
  };
}
