import type {
  ContactItem,
  ContactListQuery,
  ContactListResponse,
  CreateContactPayload,
  TicketContactContext,
  UpdateContactPayload,
} from '@it-ops/shared';
import { apiDelete, apiGet, apiPatch, apiPost } from './client';

export function fetchContacts(params: ContactListQuery): Promise<ContactListResponse> {
  return apiGet<ContactListResponse>('/contacts', { params });
}

export function createContact(payload: CreateContactPayload): Promise<ContactItem> {
  return apiPost<ContactItem, CreateContactPayload>('/contacts', payload);
}

export function updateContact(id: string, payload: UpdateContactPayload): Promise<ContactItem> {
  return apiPatch<ContactItem, UpdateContactPayload>(`/contacts/${id}`, payload);
}

export function deleteContact(id: string): Promise<void> {
  return apiDelete<void>(`/contacts/${id}`);
}

export function fetchTicketContacts(ticketId: string): Promise<TicketContactContext> {
  return apiGet<TicketContactContext>(`/contacts/for-ticket/${ticketId}`);
}

export function linkTicketContact(
  ticketId: string,
  contactId: string,
): Promise<TicketContactContext> {
  return apiPost<TicketContactContext, { contactId: string }>(
    `/contacts/for-ticket/${ticketId}/link`,
    { contactId },
  );
}

export function unlinkTicketContact(
  ticketId: string,
  contactId: string,
): Promise<TicketContactContext> {
  return apiDelete<TicketContactContext>(`/contacts/for-ticket/${ticketId}/link/${contactId}`);
}
