import { FileSearchOutlined, SearchOutlined } from '@ant-design/icons';
import { Alert, App as AntdApp, Button, Form, Input, Space } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getErrorMessage } from '@/api/client';
import { lookupTicket } from '@/api/tickets';
import { useI18n } from '@/i18n/I18nContext';
import LanguageSwitcher from '@/i18n/LanguageSwitcher';
import { formatAccessCode, getSavedTickets, saveTicketReference } from '@/public/savedTickets';

interface LookupValues {
  ticketNo: string;
  accessCode: string;
}

export default function TrackLookupPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm<LookupValues>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedTickets, setSavedTickets] = useState(() => getSavedTickets());

  const handleLookup = async (values: LookupValues) => {
    setSubmitting(true);
    setError(null);
    try {
      const ticket = await lookupTicket(values.ticketNo, values.accessCode);
      const accessCode = values.accessCode.replace(/[\s-]/g, '').toUpperCase();
      saveTicketReference({ ...ticket, accessCode });
      setSavedTickets(getSavedTickets());
      message.success(t('lookup.found'));
      navigate(`/track/${ticket.publicToken}`, {
        state: { accessCode },
      });
    } catch (lookupError) {
      setError(getErrorMessage(lookupError));
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
        <Space size={16}>
          <Link to="/report" className="public-link">
            {t('track.submitTicket')}
          </Link>
          <LanguageSwitcher />
        </Space>
      </header>

      <main className="public-main lookup-main">
        <div className="report-heading">
          <h1>
            <span className="title-icon">
              <FileSearchOutlined />
            </span>
            {t('lookup.title')}
          </h1>
        </div>

        <section className="report-panel">
          {error && (
            <Alert
              type="error"
              showIcon
              message={error}
              closable
              onClose={() => setError(null)}
              className="form-alert"
            />
          )}

          <Form<LookupValues>
            form={form}
            layout="vertical"
            requiredMark={false}
            onFinish={handleLookup}
          >
            <Form.Item
              label={t('lookup.ticketNo')}
              name="ticketNo"
              rules={[{ required: true, message: t('lookup.requiredTicketNo') }]}
            >
              <Input placeholder={t('lookup.ticketNoPlaceholder')} />
            </Form.Item>

            <Form.Item
              label={t('lookup.code')}
              name="accessCode"
              rules={[{ required: true, message: t('lookup.requiredCode') }]}
            >
              <Input placeholder={t('lookup.codePlaceholder')} />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              icon={<SearchOutlined />}
              loading={submitting}
              className="report-submit"
            >
              {t('lookup.query')}
            </Button>
          </Form>
        </section>

        {savedTickets.length > 0 && (
          <section className="panel saved-tickets">
            <h2>{t('lookup.saved')}</h2>
            <div className="saved-ticket-list">
              {savedTickets.map((ticket) => (
                <Link
                  to={`/track/${ticket.publicToken}`}
                  className="saved-ticket"
                  key={ticket.ticketNo}
                >
                  <div className="saved-ticket-main">
                    <strong>{ticket.title}</strong>
                    <span>
                      {ticket.ticketNo} · {dayjs(ticket.createdAt).format('YYYY-MM-DD HH:mm')}
                    </span>
                  </div>
                  <span className="saved-ticket-code">{formatAccessCode(ticket.accessCode)}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
