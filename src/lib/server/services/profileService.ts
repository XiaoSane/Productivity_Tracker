import type { SheetStore } from '../types';
import type { SessionData } from '@/lib/auth/session';
import { stringValue, nowIso } from '../utils';

export async function handleProfileAction(
  store: SheetStore,
  action: string,
  params: Record<string, unknown> = {},
  body: Record<string, unknown> = {},
  session?: SessionData
): Promise<unknown> {
  switch (action) {
    case 'profile.get': {
      const profiles = await store.readRecords('Profile');
      const cand = profiles.find((p) => p.key === 'candidateName');
      const val = cand ? stringValue(cand.value) : session?.user?.name || '';
      return {
        name: val,
        candidateName: val,
      };
    }

    case 'profile.update': {
      const name = stringValue(body.name || params.name || body.candidateName || params.candidateName);
      if (!name) throw new Error('Candidate name cannot be empty.');
      const profiles = await store.readRecords('Profile');
      const existing = profiles.find((p) => p.key === 'candidateName');
      if (existing) {
        await store.updateRecord('Profile', 'candidateName', { value: name }, 'key');
      } else {
        await store.appendRecord('Profile', {
          key: 'candidateName',
          value: name,
          updatedAt: nowIso(),
        });
      }
      return {
        name,
        message: 'Profile updated successfully.',
      };
    }

    default:
      throw new Error(`Unknown profile action: "${action}".`);
  }
}
