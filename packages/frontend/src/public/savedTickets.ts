import type { CreateTicketResult } from '@it-ops/shared';

const STORAGE_KEY = 'itops_saved_tickets';

export interface SavedTicket {
  ticketNo: string;
  title: string;
  accessCode: string;
  publicToken: string;
  createdAt: string;
}

function readAll(): SavedTicket[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SavedTicket =>
        Boolean(item) &&
        typeof item === 'object' &&
        typeof (item as SavedTicket).ticketNo === 'string' &&
        typeof (item as SavedTicket).accessCode === 'string' &&
        typeof (item as SavedTicket).publicToken === 'string',
    );
  } catch {
    return [];
  }
}

export function getSavedTickets(): SavedTicket[] {
  return readAll();
}

export function findSavedTicket(publicToken: string): SavedTicket | null {
  return readAll().find((item) => item.publicToken === publicToken) ?? null;
}

export function saveTicketReference(
  ticket: Pick<
    CreateTicketResult,
    'ticketNo' | 'title' | 'accessCode' | 'publicToken' | 'createdAt'
  >,
): void {
  try {
    const next = [
      {
        ticketNo: ticket.ticketNo,
        title: ticket.title,
        accessCode: ticket.accessCode,
        publicToken: ticket.publicToken,
        createdAt: ticket.createdAt,
      },
      ...readAll().filter((item) => item.ticketNo !== ticket.ticketNo),
    ].slice(0, 20);

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // 隐私模式下 localStorage 可能不可用，不影响主流程。
  }
}

export function formatAccessCode(code: string): string {
  const normalized = code.replace(/[\s-]/g, '').toUpperCase();
  return normalized.replace(/(.{5})(?=.)/, '$1-');
}
