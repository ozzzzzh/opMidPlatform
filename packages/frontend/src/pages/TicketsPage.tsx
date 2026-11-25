import {
  AppstoreOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  CloudServerOutlined,
  FileTextOutlined,
  FireFilled,
  LaptopOutlined,
  PlusOutlined,
  QrcodeOutlined,
  ReloadOutlined,
  ShoppingCartOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  App as AntdApp,
  Button,
  Empty,
  Input,
  Modal,
  Segmented,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  type TableColumnsType,
} from 'antd';
import dayjs from 'dayjs';
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Priority,
  TicketCategory,
  TicketStatus,
  type TicketAttention,
  type TicketListItem,
  type TicketSummary,
} from '@it-ops/shared';
import { getErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { fetchTicketQr, fetchTickets } from '@/api/tickets';
import { CATEGORY_TONES, PRIORITY_TONES, STATUS_TONES, toneClass } from '@/components/tones';
import { useI18n } from '@/i18n/I18nContext';
import { useLabels } from '@/i18n/useLabels';

const CATEGORY_ICONS: Record<TicketCategory, ReactNode> = {
  [TicketCategory.HARDWARE]: <LaptopOutlined />,
  [TicketCategory.SOFTWARE]: <AppstoreOutlined />,
  [TicketCategory.INTERNAL_SYSTEM]: <CloudServerOutlined />,
  [TicketCategory.ASSET_REQUEST]: <ShoppingCartOutlined />,
};

const EMPTY_SUMMARY: TicketSummary = {
  open: 0,
  claimed: 0,
  resolved: 0,
  closed: 0,
  today: 0,
  total: 0,
  overdue: 0,
  dueSoon: 0,
  unassignedAging: 0,
};

export default function TicketsPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user } = useAuth();
  const labels = useLabels();
  const { message } = AntdApp.useApp();

  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<TicketStatus | undefined>();
  const [category, setCategory] = useState<TicketCategory | undefined>();
  const [priority, setPriority] = useState<Priority | undefined>();
  const [view, setView] = useState<'all' | TicketAttention | 'mine'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [qrOpen, setQrOpen] = useState(false);

  const ticketsQuery = useQuery({
    queryKey: [
      'tickets',
      { page, pageSize, keyword, status, category, priority, view, user: user?.id },
    ],
    queryFn: () =>
      fetchTickets({
        page,
        pageSize,
        keyword: keyword || undefined,
        status,
        category,
        priority,
        attention: view === 'mine' || view === 'all' ? undefined : view,
        assigneeId: view === 'mine' ? user?.id : undefined,
      }),
    placeholderData: (previous) => previous,
  });

  const qrQuery = useQuery({
    queryKey: ['ticket-qr'],
    queryFn: fetchTicketQr,
    enabled: qrOpen,
    staleTime: 10 * 60 * 1000,
    retry: 0,
  });

  const summary = ticketsQuery.data?.summary ?? EMPTY_SUMMARY;

  const applySearch = (value: string) => {
    setKeyword(value.trim());
    setPage(1);
  };

  const resetFilters = () => {
    setKeywordInput('');
    setKeyword('');
    setStatus(undefined);
    setCategory(undefined);
    setPriority(undefined);
    setView('all');
    setPage(1);
  };

  const slaText = (ticket: TicketListItem): { text: string; className: string } => {
    const now = dayjs();
    const active = ticket.status === TicketStatus.OPEN || ticket.status === TicketStatus.CLAIMED;
    const expected = ticket.expectedAt ? dayjs(ticket.expectedAt) : null;
    const minutesBetween = (from: dayjs.Dayjs, to: dayjs.Dayjs) =>
      Math.max(1, Math.abs(to.diff(from, 'minute')));
    const span = (minutes: number) => {
      if (minutes < 60) return `${minutes}m`;
      if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}h`;
      return `${Math.floor(minutes / (24 * 60))}d`;
    };

    if (active && expected?.isBefore(now)) {
      return {
        text: t('tickets.slaOverdue', { time: span(minutesBetween(expected, now)) }),
        className: 'ticket-sla-overdue',
      };
    }
    if (active && expected && !expected.isAfter(now.add(4, 'hour'))) {
      return {
        text: t('tickets.slaDueSoon', { time: span(minutesBetween(now, expected)) }),
        className: 'ticket-sla-soon',
      };
    }
    if (ticket.status === TicketStatus.OPEN) {
      const age = minutesBetween(dayjs(ticket.createdAt), now);
      return {
        text: t('tickets.slaUnclaimed', { time: span(age) }),
        className: age > 4 * 60 ? 'ticket-sla-aging' : 'ticket-sla-muted',
      };
    }
    if (
      ticket.status === TicketStatus.CLAIMED &&
      dayjs(ticket.updatedAt).isBefore(now.subtract(2, 'day'))
    ) {
      return {
        text: t('tickets.slaStale', { time: span(minutesBetween(dayjs(ticket.updatedAt), now)) }),
        className: 'ticket-sla-stale',
      };
    }
    if (active && expected) {
      return {
        text: t('tickets.slaRemaining', { time: span(minutesBetween(now, expected)) }),
        className: 'ticket-sla-muted',
      };
    }
    return { text: '—', className: 'ticket-sla-muted' };
  };

  const copyQrUrl = async () => {
    if (!qrQuery.data?.url) return;
    try {
      await navigator.clipboard.writeText(qrQuery.data.url);
      message.success(t('tickets.qrCopySuccess'));
    } catch {
      message.error(t('tickets.qrCopyFailed'));
    }
  };

  const columns: TableColumnsType<TicketListItem> = [
    {
      title: t('tickets.columnNo'),
      dataIndex: 'ticketNo',
      key: 'ticketNo',
      width: 148,
      render: (value: string) => <span className="ticket-no">{value}</span>,
    },
    {
      title: t('tickets.columnTitle'),
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (value: string) => <span className="ticket-title">{value}</span>,
    },
    {
      title: t('tickets.columnCategory'),
      dataIndex: 'category',
      key: 'category',
      width: 128,
      render: (value: TicketCategory) => (
        <Tag
          className={toneClass(CATEGORY_TONES[value])}
          icon={CATEGORY_ICONS[value]}
          bordered={false}
        >
          {labels.category(value)}
        </Tag>
      ),
    },
    {
      title: t('tickets.columnStatus'),
      dataIndex: 'status',
      key: 'status',
      width: 94,
      render: (value: TicketStatus) => (
        <Tag className={toneClass(STATUS_TONES[value])} bordered={false}>
          {labels.status(value)}
        </Tag>
      ),
    },
    {
      title: t('tickets.columnPriority'),
      dataIndex: 'priority',
      key: 'priority',
      width: 136,
      render: (value: Priority) => (
        <Tag
          bordered={false}
          className={[
            toneClass(PRIORITY_TONES[value]),
            value === Priority.SUPER_URGENT ? 'super-urgent-tag' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          icon={value === Priority.SUPER_URGENT ? <FireFilled className="fire-icon" /> : undefined}
        >
          {labels.priority(value)}
        </Tag>
      ),
    },
    {
      title: t('tickets.columnSla'),
      key: 'sla',
      width: 122,
      render: (_, record) => {
        const info = slaText(record);
        return <span className={`ticket-sla ${info.className}`}>{info.text}</span>;
      },
    },
    {
      title: t('tickets.columnName'),
      dataIndex: 'reporterName',
      key: 'reporterName',
      width: 110,
      ellipsis: true,
      render: (value: string | null) =>
        value || <span className="text-muted">{t('common.anonymous')}</span>,
    },
    {
      title: t('tickets.columnAssignee'),
      dataIndex: 'assignee',
      key: 'assignee',
      width: 110,
      render: (_, record) => record.assignee?.displayName ?? <span className="text-muted">—</span>,
    },
    {
      title: t('tickets.columnCreatedAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 132,
      render: (value: string) => dayjs(value).format('MM-DD HH:mm'),
    },
    {
      title: t('tickets.columnAction'),
      key: 'action',
      width: 70,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          onClick={(event) => {
            event.stopPropagation();
            navigate(`/tickets/${record.id}`);
          }}
        >
          {t('common.view')}
        </Button>
      ),
    },
  ];

  return (
    <div className="page-stack">
      <div className="page-head">
        <div className="page-head-title">
          <span className="page-title-icon">
            <FileTextOutlined />
          </span>
          <h1 className="page-title">{t('tickets.title')}</h1>
        </div>

        <Space wrap>
          <Button icon={<QrcodeOutlined />} onClick={() => setQrOpen(true)}>
            {t('tickets.qr')}
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/tickets/new')}>
            {t('tickets.newTicket')}
          </Button>
        </Space>
      </div>

      <div className="stat-row">
        <div className="stat-tile stat-open">
          <span className="stat-icon">
            <ClockCircleOutlined />
          </span>
          <div>
            <strong>{summary.open}</strong>
            <span>{t('tickets.statOpen')}</span>
          </div>
        </div>
        <div className="stat-tile stat-claimed">
          <span className="stat-icon">
            <ToolOutlined />
          </span>
          <div>
            <strong>{summary.claimed}</strong>
            <span>{t('tickets.statClaimed')}</span>
          </div>
        </div>
        <div className="stat-tile stat-today">
          <span className="stat-icon">
            <CalendarOutlined />
          </span>
          <div>
            <strong>{summary.today}</strong>
            <span>{t('tickets.statToday')}</span>
          </div>
        </div>
      </div>

      <section className="panel">
        <div className="ticket-views">
          <Segmented
            value={view}
            onChange={(value) => {
              setView(value as 'all' | TicketAttention | 'mine');
              setPage(1);
            }}
            options={[
              { value: 'all', label: `${t('tickets.viewAll')} ${summary.total}` },
              {
                value: 'overdue',
                label: `${t('tickets.viewOverdue')} ${summary.overdue}`,
              },
              {
                value: 'dueSoon',
                label: `${t('tickets.viewDueSoon')} ${summary.dueSoon}`,
              },
              {
                value: 'unassignedAging',
                label: `${t('tickets.viewUnassignedAging')} ${summary.unassignedAging}`,
              },
              { value: 'mine', label: t('tickets.viewMine') },
            ]}
          />
        </div>

        <div className="filter-bar">
          <Input.Search
            allowClear
            value={keywordInput}
            placeholder={t('tickets.searchPlaceholder')}
            enterButton={t('common.search')}
            onChange={(event) => {
              setKeywordInput(event.target.value);
              if (!event.target.value) {
                setKeyword('');
                setPage(1);
              }
            }}
            onSearch={applySearch}
            className="filter-search"
          />

          <Select<TicketStatus>
            allowClear
            placeholder={t('tickets.statusFilter')}
            value={status}
            options={Object.values(TicketStatus).map((value) => ({
              value,
              label: labels.status(value),
            }))}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            className="filter-select"
          />

          <Select<TicketCategory>
            allowClear
            placeholder={t('tickets.categoryFilter')}
            value={category}
            options={Object.values(TicketCategory).map((value) => ({
              value,
              label: labels.category(value),
            }))}
            onChange={(value) => {
              setCategory(value);
              setPage(1);
            }}
            className="filter-select"
          />

          <Select<Priority>
            allowClear
            placeholder={t('tickets.priorityFilter')}
            value={priority}
            options={Object.values(Priority).map((value) => ({
              value,
              label: labels.priority(value),
            }))}
            onChange={(value) => {
              setPriority(value);
              setPage(1);
            }}
            className="filter-select filter-select-sm"
          />

          <Space>
            <Button onClick={resetFilters}>{t('common.reset')}</Button>
            <Button
              icon={<ReloadOutlined />}
              title={t('common.refresh')}
              onClick={() => void ticketsQuery.refetch()}
              loading={ticketsQuery.isFetching}
              aria-label={t('common.refresh')}
            />
          </Space>
        </div>

        {ticketsQuery.isError && (
          <Alert
            type="error"
            showIcon
            message={t('tickets.loadError')}
            description={getErrorMessage(ticketsQuery.error)}
            action={
              <Button size="small" onClick={() => void ticketsQuery.refetch()}>
                {t('common.retry')}
              </Button>
            }
            className="section-alert"
          />
        )}

        <Table<TicketListItem>
          rowKey="id"
          columns={columns}
          dataSource={ticketsQuery.data?.items ?? []}
          loading={ticketsQuery.isLoading}
          scroll={{ x: 1220 }}
          locale={{
            emptyText: (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('tickets.empty')}>
                <Button type="primary" size="small" onClick={() => navigate('/tickets/new')}>
                  {t('tickets.newTicket')}
                </Button>
              </Empty>
            ),
          }}
          rowClassName={(record) => {
            const active =
              record.status === TicketStatus.OPEN || record.status === TicketStatus.CLAIMED;
            return active && record.expectedAt && dayjs(record.expectedAt).isBefore(dayjs())
              ? 'clickable-row ticket-row-overdue'
              : 'clickable-row';
          }}
          onRow={(record) => ({
            onClick: () => navigate(`/tickets/${record.id}`),
          })}
          pagination={{
            current: page,
            pageSize,
            total: ticketsQuery.data?.total ?? 0,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (total) => t('common.total', { count: total }),
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPageSize !== pageSize ? 1 : nextPage);
              setPageSize(nextPageSize);
            },
          }}
        />
      </section>

      <Modal
        title={
          <span className="modal-title-with-icon">
            <QrcodeOutlined />
            {t('tickets.qrTitle')}
          </span>
        }
        open={qrOpen}
        onCancel={() => setQrOpen(false)}
        footer={null}
        width={400}
        destroyOnClose
      >
        <div className="qr-panel">
          {qrQuery.isLoading && <Spin />}
          {qrQuery.isError && (
            <Alert
              type="error"
              showIcon
              message={getErrorMessage(qrQuery.error)}
              action={
                <Button size="small" onClick={() => void qrQuery.refetch()}>
                  {t('common.retry')}
                </Button>
              }
            />
          )}
          {qrQuery.data && (
            <>
              <img src={qrQuery.data.dataUrl} alt={t('tickets.qrTitle')} className="qr-image" />
              <div className="qr-url">{qrQuery.data.url}</div>
              <Space>
                <Button onClick={copyQrUrl}>{t('tickets.qrCopy')}</Button>
                <a href={qrQuery.data.dataUrl} download="it-ticket-qr.png">
                  <Button type="primary">{t('tickets.qrDownload')}</Button>
                </a>
              </Space>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
