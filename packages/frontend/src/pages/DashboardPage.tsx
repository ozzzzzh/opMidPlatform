import {
  AppstoreOutlined,
  BookOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ContactsOutlined,
  DashboardOutlined,
  FieldTimeOutlined,
  FireFilled,
  ReloadOutlined,
  ToolOutlined,
  UploadOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Drawer, Empty, Skeleton, Tag } from 'antd';
import type { EChartsOption } from 'echarts';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { type DashboardReport, type DashboardTicketReason } from '@it-ops/shared';
import { getErrorMessage } from '@/api/client';
import { fetchDashboard } from '@/api/dashboard';
import EChart from '@/components/EChart';
import { PRIORITY_TONES, STATUS_TONES, toneClass } from '@/components/tones';
import { useI18n } from '@/i18n/I18nContext';
import { useLabels } from '@/i18n/useLabels';
import type { TranslationKey } from '@/i18n/messages';

const CHART_COLORS = ['#2563eb', '#5f8578', '#a17a5c', '#7d7396', '#b3455a'];

const REASON_ORDER: DashboardTicketReason[] = [
  'OVERDUE',
  'SUPER_URGENT',
  'DUE_SOON',
  'UNASSIGNED_AGING',
  'STALE',
];

function reasonLabelKey(reason: DashboardTicketReason): TranslationKey {
  const map: Record<DashboardTicketReason, TranslationKey> = {
    OVERDUE: 'dashboard.reasonOverdue',
    DUE_SOON: 'dashboard.reasonDueSoon',
    SUPER_URGENT: 'dashboard.reasonSuperUrgent',
    UNASSIGNED_AGING: 'dashboard.reasonUnassignedAging',
    STALE: 'dashboard.reasonStale',
  };
  return map[reason];
}

function formatHours(value: number | null): string {
  return value === null ? '-' : `${value.toFixed(1)} h`;
}

export default function DashboardPage() {
  const { t } = useI18n();
  const labels = useLabels();
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState<'queue' | 'attention' | null>(null);

  const dashboardQuery = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const report = dashboardQuery.data;

  const trendOption = useMemo<EChartsOption>(() => {
    const data = report?.trend ?? [];
    return {
      color: ['#2563eb', '#5f8a72'],
      tooltip: { trigger: 'axis' },
      legend: {
        data: [t('dashboard.trendSubmitted'), t('dashboard.trendResolved')],
        right: 0,
        top: 0,
        textStyle: { color: '#4b5563', fontSize: 11 },
      },
      grid: { left: 36, right: 16, top: 38, bottom: 24 },
      xAxis: {
        type: 'category',
        data: data.map((item) => item.date.slice(5)),
        axisLine: { lineStyle: { color: '#e5e9ee' } },
        axisLabel: { color: '#6b7280', fontSize: 11 },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        splitLine: { lineStyle: { color: '#f0f2f5' } },
        axisLabel: { color: '#9ca3af', fontSize: 11 },
      },
      series: [
        {
          name: t('dashboard.trendSubmitted'),
          type: 'line',
          smooth: true,
          symbolSize: 5,
          data: data.map((item) => item.submitted),
          itemStyle: { color: '#2563eb' },
          areaStyle: { color: 'rgba(37, 99, 235, 0.08)' },
        },
        {
          name: t('dashboard.trendResolved'),
          type: 'line',
          smooth: true,
          symbolSize: 5,
          data: data.map((item) => item.resolved),
          itemStyle: { color: '#5f8a72' },
        },
      ],
    };
  }, [report, t]);

  const categoryOption = useMemo<EChartsOption>(
    () => ({
      color: CHART_COLORS,
      tooltip: { trigger: 'item' },
      legend: {
        bottom: 0,
        textStyle: { color: '#4b5563', fontSize: 11 },
      },
      series: [
        {
          type: 'pie',
          radius: ['42%', '68%'],
          center: ['50%', '42%'],
          label: { color: '#4b5563', fontSize: 11, formatter: '{b} {c}' },
          data:
            report?.categories
              .filter((item) => item.count > 0)
              .map((item) => ({
                name: labels.category(item.category),
                value: item.count,
              })) ?? [],
        },
      ],
    }),
    [labels, report],
  );

  if (dashboardQuery.isLoading) {
    return (
      <div className="page-stack">
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  if (dashboardQuery.isError || !report) {
    return (
      <Alert
        type="error"
        showIcon
        message={t('dashboard.loadError')}
        description={getErrorMessage(dashboardQuery.error)}
        action={
          <Button size="small" onClick={() => void dashboardQuery.refetch()}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  const summary = report.summary;

  const kpis = [
    {
      key: 'today',
      label: t('dashboard.today'),
      value: summary.today,
      icon: <CalendarOutlined />,
      tone: 'primary',
    },
    {
      key: 'open',
      label: t('dashboard.open'),
      value: summary.open,
      icon: <ClockCircleOutlined />,
      tone: 'warning',
    },
    {
      key: 'claimed',
      label: t('dashboard.claimed'),
      value: summary.claimed,
      icon: <ToolOutlined />,
      tone: 'primary',
    },
    {
      key: 'overdue',
      label: t('dashboard.overdue'),
      value: summary.overdue,
      icon: <WarningOutlined />,
      tone: 'critical',
    },
    {
      key: 'dueSoon',
      label: t('dashboard.dueSoon'),
      value: summary.dueSoon,
      icon: <ClockCircleOutlined />,
      tone: 'warning',
    },
    {
      key: 'resolvedToday',
      label: t('dashboard.resolvedToday'),
      value: summary.resolvedToday,
      icon: <CheckCircleOutlined />,
      tone: 'success',
    },
    {
      key: 'avg',
      label: t('dashboard.avgResolution'),
      value: formatHours(summary.avgResolutionHours),
      icon: <FieldTimeOutlined />,
      tone: 'violet',
    },
    {
      key: 'super',
      label: t('dashboard.superUrgent'),
      value: summary.superUrgent,
      icon: <FireFilled className={summary.superUrgent > 0 ? 'fire-icon' : undefined} />,
      tone: 'critical',
    },
  ];

  const quickActions = [
    {
      key: 'ticket',
      label: t('dashboard.quickTicket'),
      icon: <ToolOutlined />,
      onClick: () => navigate('/tickets/new'),
    },
    {
      key: 'knowledge',
      label: t('dashboard.quickKnowledge'),
      icon: <BookOutlined />,
      onClick: () => navigate('/knowledge/new'),
    },
    {
      key: 'contacts',
      label: t('dashboard.quickContacts'),
      icon: <ContactsOutlined />,
      onClick: () => navigate('/contacts?new=1'),
    },
    {
      key: 'subsystems',
      label: t('dashboard.quickSubsystems'),
      icon: <AppstoreOutlined />,
      onClick: () => navigate('/subsystems?new=1'),
    },
    {
      key: 'document',
      label: t('dashboard.quickDocument'),
      icon: <UploadOutlined />,
      onClick: () => navigate('/knowledge?upload=1'),
    },
  ];

  const renderTicket = (ticket: DashboardReport['myQueue'][number]) => (
    <Link to={`/tickets/${ticket.id}`} className="dashboard-ticket-row" key={ticket.id}>
      <div className="dashboard-ticket-main">
        <span className="dashboard-ticket-no">{ticket.ticketNo}</span>
        <span className="dashboard-ticket-title">{ticket.title}</span>
        <span className="dashboard-ticket-meta">
          {ticket.assigneeName ?? t('common.unassigned')} ·{' '}
          {ticket.expectedAt ? dayjs(ticket.expectedAt).format('MM-DD HH:mm') : t('report.asap')}
        </span>
        {ticket.reasons.length > 0 && (
          <span className="dashboard-reasons">
            {REASON_ORDER.filter((reason) => ticket.reasons.includes(reason)).map((reason) => (
              <span
                key={reason}
                className={`dashboard-reason dashboard-reason-${reason.toLowerCase()}`}
              >
                {reason === 'SUPER_URGENT' && <FireFilled className="fire-icon" />}
                {t(reasonLabelKey(reason))}
              </span>
            ))}
          </span>
        )}
      </div>
      <div className="dashboard-ticket-tags">
        <Tag className={toneClass(STATUS_TONES[ticket.status])} bordered={false}>
          {labels.status(ticket.status)}
        </Tag>
        <Tag className={toneClass(PRIORITY_TONES[ticket.priority])} bordered={false}>
          {labels.priority(ticket.priority)}
        </Tag>
      </div>
    </Link>
  );

  return (
    <div className="page-stack">
      <div className="page-head">
        <div className="page-head-title">
          <span className="page-title-icon">
            <DashboardOutlined />
          </span>
          <h1 className="page-title">{t('dashboard.title')}</h1>
        </div>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => void dashboardQuery.refetch()}
          loading={dashboardQuery.isFetching}
        >
          {t('common.refresh')}
        </Button>
      </div>

      <div className="dashboard-kpis">
        {kpis.map((kpi) => (
          <div className={`dashboard-kpi dashboard-kpi-${kpi.tone}`} key={kpi.key}>
            <span className="dashboard-kpi-icon">{kpi.icon}</span>
            <div>
              <strong>{kpi.value}</strong>
              <span>{kpi.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-charts">
        <section className="panel dashboard-chart-main">
          <div className="dashboard-panel-heading">
            <h2>{t('dashboard.trend')}</h2>
            <span>{t('dashboard.last7Days')}</span>
          </div>
          <EChart option={trendOption} height={260} />
        </section>
        <section className="panel dashboard-chart-side">
          <div className="dashboard-panel-heading">
            <h2>{t('dashboard.categories')}</h2>
            <span>{t('dashboard.last7Days')}</span>
          </div>
          <EChart option={categoryOption} height={260} />
        </section>
      </div>

      <div className="dashboard-lists">
        <section className="panel dashboard-list-panel">
          <div className="dashboard-panel-heading">
            <h2>
              {t('dashboard.myQueue')}
              <span className="dashboard-count">{report.myQueue.length}</span>
            </h2>
            {report.myQueue.length > 0 && (
              <Button
                type="link"
                size="small"
                className="dashboard-link"
                onClick={() => setDrawer('queue')}
              >
                {t('dashboard.viewAll')}
              </Button>
            )}
          </div>
          {report.myQueue.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('dashboard.myQueueEmpty')} />
          ) : (
            <div className="dashboard-ticket-list">
              {report.myQueue.slice(0, 3).map(renderTicket)}
            </div>
          )}
        </section>

        <section className="panel dashboard-list-panel">
          <div className="dashboard-panel-heading">
            <h2>
              {t('dashboard.attention')}
              <span className="dashboard-count">{report.attention.length}</span>
            </h2>
            {report.attention.length > 0 && (
              <Button
                type="link"
                size="small"
                className="dashboard-link"
                onClick={() => setDrawer('attention')}
              >
                {t('dashboard.viewAll')}
              </Button>
            )}
          </div>
          {report.attention.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={t('dashboard.attentionEmpty')}
            />
          ) : (
            <div className="dashboard-ticket-list">
              {report.attention.slice(0, 3).map(renderTicket)}
            </div>
          )}
        </section>
      </div>

      <section className="panel dashboard-quick-panel">
        <div className="dashboard-panel-heading">
          <h2>{t('dashboard.quickActions')}</h2>
        </div>
        <div className="dashboard-quick-grid">
          {quickActions.map((action) => (
            <button
              type="button"
              className="dashboard-quick-action"
              key={action.key}
              onClick={action.onClick}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </section>

      <Drawer
        title={
          drawer === 'queue'
            ? `${t('dashboard.myQueue')} (${report.myQueue.length})`
            : `${t('dashboard.attention')} (${report.attention.length})`
        }
        open={drawer !== null}
        onClose={() => setDrawer(null)}
        placement="right"
        width={480}
        className="dashboard-drawer"
      >
        <div className="dashboard-ticket-list dashboard-drawer-list">
          {(drawer === 'queue' ? report.myQueue : report.attention).map(renderTicket)}
        </div>
      </Drawer>
    </div>
  );
}
