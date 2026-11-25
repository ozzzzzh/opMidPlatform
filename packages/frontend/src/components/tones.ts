import { Priority, Role, TicketCategory, TicketStatus } from '@it-ops/shared';

export type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'critical' | 'violet' | 'neutral';

export const STATUS_TONES: Record<TicketStatus, Tone> = {
  [TicketStatus.OPEN]: 'warning',
  [TicketStatus.CLAIMED]: 'primary',
  [TicketStatus.RESOLVED]: 'success',
  [TicketStatus.CLOSED]: 'neutral',
};

export const PRIORITY_TONES: Record<Priority, Tone> = {
  [Priority.SUPER_URGENT]: 'critical',
  [Priority.URGENT]: 'danger',
  [Priority.HIGH]: 'warning',
  [Priority.MEDIUM]: 'primary',
  [Priority.LOW]: 'neutral',
};

export const CATEGORY_TONES: Record<TicketCategory, Tone> = {
  [TicketCategory.HARDWARE]: 'primary',
  [TicketCategory.SOFTWARE]: 'success',
  [TicketCategory.INTERNAL_SYSTEM]: 'violet',
  [TicketCategory.ASSET_REQUEST]: 'warning',
};

export const ACTION_TONES: Record<string, Tone> = {
  TICKET_CREATE: 'primary',
  TICKET_CLAIM: 'warning',
  TICKET_RESOLVE: 'success',
  TICKET_CLOSE: 'neutral',
  TICKET_COMMENT: 'violet',
};

export const ROLE_TONES: Record<Role, Tone> = {
  [Role.ADMIN]: 'warning',
  [Role.OPS]: 'primary',
  [Role.USER]: 'neutral',
};

export function toneClass(tone: Tone | undefined): string {
  return `tag-tone-${tone ?? 'neutral'}`;
}
