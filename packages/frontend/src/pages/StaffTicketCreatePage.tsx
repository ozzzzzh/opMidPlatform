import { ArrowLeftOutlined, FileAddOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { App as AntdApp, Button } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage } from '@/api/client';
import { createStaffTicket } from '@/api/tickets';
import TicketIntakeForm, { type TicketFormValues } from '@/components/TicketIntakeForm';
import { useI18n } from '@/i18n/I18nContext';

export default function StaffTicketCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const { message } = AntdApp.useApp();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: TicketFormValues, files: File[]) => {
    setSubmitting(true);
    setError(null);

    try {
      const ticket = await createStaffTicket(
        {
          category: values.category,
          description: values.description,
          title: values.title?.trim() || undefined,
          reporterName: values.reporterName,
          priority: values.priority,
          assignToMe: values.assignToMe ?? true,
          expectedAt:
            values.expectedMode === 'SCHEDULED' && values.expectedAt
              ? values.expectedAt.toISOString()
              : undefined,
        },
        files,
      );
      message.success(t('staffCreate.created'));
      await queryClient.invalidateQueries({ queryKey: ['tickets'] });
      navigate(`/tickets/${ticket.id}`, { replace: true });
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-stack">
      <div className="page-head">
        <div className="page-head-title">
          <span className="page-title-icon">
            <FileAddOutlined />
          </span>
          <h1 className="page-title">{t('staffCreate.title')}</h1>
        </div>

        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/tickets')}>
          {t('detail.back')}
        </Button>
      </div>

      <TicketIntakeForm
        variant="staff"
        submitting={submitting}
        error={error}
        onClearError={() => setError(null)}
        submitLabel={t('staffCreate.submit')}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
