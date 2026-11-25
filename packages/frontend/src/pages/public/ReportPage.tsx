import { FileAddOutlined, SearchOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { TicketSource } from '@it-ops/shared';
import { getErrorMessage } from '@/api/client';
import { createTicket } from '@/api/tickets';
import TicketIntakeForm, { type TicketFormValues } from '@/components/TicketIntakeForm';
import { useI18n } from '@/i18n/I18nContext';
import LanguageSwitcher from '@/i18n/LanguageSwitcher';
import { saveTicketReference } from '@/public/savedTickets';

export default function ReportPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const source = searchParams.get('src') === 'scan' ? TicketSource.SCAN : TicketSource.WEB;

  const handleSubmit = async (values: TicketFormValues, files: File[]) => {
    setSubmitting(true);
    setError(null);

    try {
      const ticket = await createTicket(
        {
          category: values.category,
          description: values.description,
          reporterName: values.reporterName,
          priority: values.priority,
          source,
          expectedAt:
            values.expectedMode === 'SCHEDULED' && values.expectedAt
              ? values.expectedAt.toISOString()
              : undefined,
        },
        files,
      );
      saveTicketReference(ticket);
      navigate(`/track/${ticket.publicToken}?created=1`, {
        replace: true,
        state: { accessCode: ticket.accessCode },
      });
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="public-page">
      <header className="public-header">
        <Link to="/report" className="public-brand">
          {t('common.brand')}
        </Link>
        <LanguageSwitcher />
      </header>

      <main className="public-main">
        <div className="report-heading">
          <h1>
            <span className="title-icon">
              <FileAddOutlined />
            </span>
            {t('report.title')}
          </h1>
          <Link to="/track">
            <Button icon={<SearchOutlined />}>{t('report.queryProgress')}</Button>
          </Link>
        </div>

        <TicketIntakeForm
          variant="public"
          submitting={submitting}
          error={error}
          onClearError={() => setError(null)}
          submitLabel={t('report.submit')}
          onSubmit={handleSubmit}
        />
      </main>
    </div>
  );
}
