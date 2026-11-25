import {
  CheckCircleFilled,
  CopyOutlined,
  FileTextOutlined,
  FireFilled,
  InboxOutlined,
  KeyOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { App as AntdApp, Button, Result, Space, Spin, Steps, Tag } from 'antd';
import dayjs from 'dayjs';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { Priority, TicketStatus } from '@it-ops/shared';
import { fetchTicketTracking } from '@/api/tickets';
import { useI18n } from '@/i18n/I18nContext';
import LanguageSwitcher from '@/i18n/LanguageSwitcher';
import { useLabels } from '@/i18n/useLabels';
import { STATUS_TONES, toneClass } from '@/components/tones';
import { findSavedTicket, formatAccessCode } from '@/public/savedTickets';

const CURRENT_STEP: Record<TicketStatus, number> = {
  [TicketStatus.OPEN]: 1,
  [TicketStatus.CLAIMED]: 2,
  [TicketStatus.RESOLVED]: 3,
  [TicketStatus.CLOSED]: 4,
};

export default function TrackPage() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { t } = useI18n();
  const labels = useLabels();
  const { message } = AntdApp.useApp();
  const created = searchParams.get('created') === '1';
  const saved = token ? findSavedTicket(token) : null;
  const navigationAccessCode = (location.state as { accessCode?: string } | null)?.accessCode;
  const accessCode = navigationAccessCode ?? saved?.accessCode;

  const trackingQuery = useQuery({
    queryKey: ['ticket-track', token],
    queryFn: () => fetchTicketTracking(token as string),
    enabled: Boolean(token),
    retry: 0,
    refetchInterval: 15_000,
  });

  const formatTime = (value: string | null, fallback: string): string =>
    value ? dayjs(value).format('YYYY-MM-DD HH:mm') : fallback;

  const copyLink = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/track/${token}`);
      message.success(t('track.linkCopied'));
    } catch {
      message.error(t('common.copyFailed'));
    }
  };

  const copyCredential = async () => {
    if (!accessCode || !trackingQuery.data) return;
    try {
      await navigator.clipboard.writeText(
        `${t('track.ticketNo')}: ${trackingQuery.data.ticketNo}\n${t(
          'track.code',
        )}: ${formatAccessCode(accessCode)}`,
      );
      message.success(t('track.credentialCopied'));
    } catch {
      message.error(t('common.copyFailed'));
    }
  };

  if (trackingQuery.isLoading) {
    return (
      <div className="public-page">
        <header className="public-header">
          <Link to="/report" className="public-brand">
            {t('common.brand')}
          </Link>
          <LanguageSwitcher />
        </header>
        <main className="public-main tracking-main">
          <div className="tracking-loading">
            <Spin />
          </div>
        </main>
      </div>
    );
  }

  if (trackingQuery.isError || !trackingQuery.data) {
    return (
      <div className="public-page">
        <header className="public-header">
          <Link to="/report" className="public-brand">
            {t('common.brand')}
          </Link>
          <LanguageSwitcher />
        </header>
        <main className="public-main tracking-main">
          <Result
            status="404"
            title={t('track.notFound')}
            subTitle={t('track.notFoundDescription')}
            extra={
              <Space>
                <Link to="/track">
                  <Button>{t('track.queryOther')}</Button>
                </Link>
                <Link to="/report">
                  <Button type="primary">{t('track.submitNew')}</Button>
                </Link>
              </Space>
            }
          />
        </main>
      </div>
    );
  }

  const ticket = trackingQuery.data;

  const stepItems = [
    {
      title: t('track.stepSubmitted'),
      description: formatTime(ticket.createdAt, ''),
      icon: <FileTextOutlined />,
    },
    {
      title: t('track.stepReceived'),
      description: formatTime(ticket.claimedAt, t('track.waitReceived')),
      icon: <InboxOutlined />,
    },
    {
      title: t('track.stepResolved'),
      description: formatTime(ticket.resolvedAt, t('track.waitResolved')),
      icon: <ToolOutlined />,
    },
    {
      title: t('track.stepClosed'),
      description: formatTime(ticket.closedAt, t('track.waitClosed')),
      icon: <SafetyCertificateOutlined />,
    },
  ];

  return (
    <div className="public-page">
      <header className="public-header">
        <Link to="/report" className="public-brand">
          {t('common.brand')}
        </Link>
        <Space size={16}>
          <Link to="/track" className="public-link">
            {t('track.queryOther')}
          </Link>
          <Link to="/report" className="public-link">
            {t('track.submitNew')}
          </Link>
          <LanguageSwitcher />
        </Space>
      </header>

      <main className="public-main tracking-main">
        <div className="tracking-head">
          <div className="tracking-kicker">
            <span className="ticket-no">{ticket.ticketNo}</span>
            <Tag className={toneClass(STATUS_TONES[ticket.status])} bordered={false}>
              {labels.status(ticket.status)}
            </Tag>
          </div>
          <h1>
            {created ? (
              <>
                <CheckCircleFilled className="tracking-success-icon" />
                {t('track.submitted')}
              </>
            ) : (
              t('track.progress')
            )}
          </h1>
          <p>{ticket.title}</p>
        </div>

        {accessCode && (
          <section className="panel tracking-credential">
            <div>
              <span>{t('track.ticketNo')}</span>
              <strong>{ticket.ticketNo}</strong>
            </div>
            <div>
              <span>{t('track.code')}</span>
              <strong className="access-code">{formatAccessCode(accessCode)}</strong>
            </div>
            <Button icon={<KeyOutlined />} onClick={copyCredential}>
              {t('track.copyCredential')}
            </Button>
          </section>
        )}

        <section className="panel tracking-panel">
          <Steps
            current={CURRENT_STEP[ticket.status]}
            responsive
            items={stepItems}
            className="track-steps"
          />
        </section>

        <section className="panel tracking-info">
          <div>
            <span>{t('track.reporter')}</span>
            <strong>{ticket.reporterName || t('common.anonymous')}</strong>
          </div>
          <div>
            <span>{t('track.category')}</span>
            <strong>{labels.category(ticket.category)}</strong>
          </div>
          <div>
            <span>{t('track.priority')}</span>
            <strong>
              {ticket.priority === Priority.SUPER_URGENT && (
                <FireFilled className="fire-icon inline-fire" />
              )}
              {labels.priority(ticket.priority)}
            </strong>
          </div>
          <div>
            <span>{t('track.assignee')}</span>
            <strong>{ticket.assignee?.displayName || t('track.unassigned')}</strong>
          </div>
          <div>
            <span>{t('track.expected')}</span>
            <strong>
              {ticket.expectedAt
                ? dayjs(ticket.expectedAt).format('YYYY-MM-DD HH:mm')
                : t('report.asap')}
            </strong>
          </div>
          <div>
            <span>{t('track.lastUpdate')}</span>
            <strong>{dayjs(ticket.updatedAt).format('YYYY-MM-DD HH:mm')}</strong>
          </div>
        </section>

        {ticket.resolution && (
          <section className="panel tracking-resolution">
            <h2>{t('track.resolution')}</h2>
            <p>{ticket.resolution}</p>
          </section>
        )}

        <Space wrap className="tracking-actions">
          <Button icon={<CopyOutlined />} onClick={copyLink}>
            {t('track.copyLink')}
          </Button>
          <Button
            icon={<ReloadOutlined />}
            loading={trackingQuery.isFetching}
            onClick={() => void trackingQuery.refetch()}
          >
            {t('track.refresh')}
          </Button>
          <Link to="/track">
            <Button icon={<SearchOutlined />}>{t('track.queryOther')}</Button>
          </Link>
        </Space>
      </main>
    </div>
  );
}
