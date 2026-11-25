import { useMemo } from 'react';
import { Priority, Role, TicketCategory, TicketSource, TicketStatus } from '@it-ops/shared';
import { useI18n } from './I18nContext';
import type { TranslationKey } from './messages';

export function useLabels() {
  const { t } = useI18n();

  return useMemo(
    () => ({
      role: (value: Role) => t(`role.${value}` as TranslationKey),
      category: (value: TicketCategory) => t(`category.${value}` as TranslationKey),
      status: (value: TicketStatus) => t(`status.${value}` as TranslationKey),
      priority: (value: Priority) => t(`priority.${value}` as TranslationKey),
      source: (value: TicketSource) => t(`source.${value}` as TranslationKey),
      action: (value: string) => {
        const key = `action.${value}` as TranslationKey;
        const label = t(key);
        return label === key ? value : label;
      },
    }),
    [t],
  );
}
