import {
  AuditOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DownloadOutlined,
  FieldTimeOutlined,
  FileTextOutlined,
  FireFilled,
  ReloadOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  App as AntdApp,
  Button,
  Empty,
  Select,
  Skeleton,
  Space,
  Table,
  Tabs,
  Tag,
  type TableColumnsType,
} from 'antd';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { EChartsOption } from 'echarts';
import {
  TicketCategory,
  TicketStatus,
  type AuditReport,
  type TicketListItem,
} from '@it-ops/shared';
import { downloadAuditReport, fetchAuditReport } from '@/api/audit';
import { getErrorMessage } from '@/api/client';
import EChart from '@/components/EChart';
import { fetchTickets } from '@/api/tickets';
import { fetchUsers } from '@/api/users';
import { CATEGORY_TONES, PRIORITY_TONES, STATUS_TONES } from '@/components/tones';
import { ACTION_TONES, toneClass } from '@/components/tones';
import { useI18n } from '@/i18n/I18nContext';
import { useLabels } from '@/i18n/useLabels';

type StaffRow = AuditReport['staff'][number];
type RecentAction = AuditReport['recentActions'][number];

const CHART_COLORS = ['#2563eb', '#5f8578', '#a17a5c', '#7d7396', '#b3455a'];

function fixed(value: number | null): string {
  return value === null ? '-' : `${value.toFixed(1)} h`;
}

export default function AuditPage() {
  const { t, language } = useI18n();
  const labels = useLabels();
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState<'overview' | 'detail'>('overview');
  const [exporting, setExporting] = useState(false);
  const [detailStatus, setDetailStatus] = useState<TicketStatus | undefined>();
  const [detailCategory, setDetailCategory] = useState<TicketCategory | undefined>();
  const [detailAssignee, setDetailAssignee] = useState<string | undefined>();
  const [detailPage, setDetailPage] = useState(1);
  const [detailPageSize, setDetailPageSize] = useState(20);

  const reportQuery = useQuery({
    queryKey: ['audit-report', days],
    queryFn: () => fetchAuditReport(days),
    placeholderData: (previous) => previous,
  });

  const report = reportQuery.data;

  const usersQuery = useQuery({
    queryKey: ['users', 'audit-assignees'],
    queryFn: () => fetchUsers({ pageSize: 100 }),
    enabled: tab === 'detail',
    staleTime: 60_000,
  });

  const detailQuery = useQuery({
    queryKey: [
      'audit-tickets',
      {
        days,
        detailStatus,
        detailCategory,
        detailAssignee,
        detailPage,
        detailPageSize,
      },
    ],
    queryFn: () =>
      fetchTickets({
        from: report?.range.from,
        to: report?.range.to,
        status: detailStatus,
        category: detailCategory,
        assigneeId: detailAssignee,
        page: detailPage,
        pageSize: detailPageSize,
      }),
    enabled: tab === 'detail' && Boolean(report),
    placeholderData: (previous) => previous,
  });

  const hasStaff = Boolean(report?.staff.length);
  const categoryTotal = report?.categories.reduce((sum, item) => sum + item.count, 0) ?? 0;

  const trendOption = useMemo<EChartsOption>(
    () => ({
      color: CHART_COLORS,
      tooltip: { trigger: 'axis' },
      legend: {
        data: [t('audit.seriesSubmitted'), t('audit.seriesResolved')],
        right: 0,
        top: 0,
        textStyle: { color: '#4b5563', fontSize: 12 },
      },
      grid: { left: 36, right: 16, top: 40, bottom: 24 },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: report?.trend.map((item) => item.date.slice(5)) ?? [],
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        axisTick: { show: false },
        axisLabel: { color: '#6b7280', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        splitLine: { lineStyle: { color: '#f0f2f5' } },
        axisLabel: { color: '#6b7280', fontSize: 11 },
      },
      series: [
        {
          name: t('audit.seriesSubmitted'),
          type: 'line',
          smooth: true,
          symbolSize: 5,
          data: report?.trend.map((item) => item.submitted) ?? [],
          itemStyle: { color: '#2563eb' },
          areaStyle: { color: 'rgba(37, 99, 235, 0.1)' },
        },
        {
          name: t('audit.seriesResolved'),
          type: 'line',
          smooth: true,
          symbolSize: 5,
          data: report?.trend.map((item) => item.resolved) ?? [],
          itemStyle: { color: '#5f8a72' },
        },
      ],
    }),
    [report, t],
  );

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
          center: ['50%', '44%'],
          label: {
            color: '#4b5563',
            fontSize: 11,
            formatter: '{b} {c}',
          },
          data:
            report?.categories.map((item) => ({
              name: labels.category(item.category),
              value: item.count,
            })) ?? [],
        },
      ],
    }),
    [report, labels],
  );

  const staffOption = useMemo<EChartsOption>(
    () => ({
      color: ['#2563eb', '#5f8a72', '#b98a58'],
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: {
        data: [t('audit.claimed'), t('audit.resolvedAction'), t('audit.closedAction')],
        right: 0,
        top: 0,
        textStyle: { color: '#4b5563', fontSize: 12 },
      },
      grid: { left: 78, right: 16, top: 40, bottom: 24 },
      xAxis: {
        type: 'value',
        minInterval: 1,
        splitLine: { lineStyle: { color: '#f0f2f5' } },
        axisLabel: { color: '#6b7280', fontSize: 11 },
      },
      yAxis: {
        type: 'category',
        data: report?.staff.map((item) => item.displayName) ?? [],
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#4b5563', fontSize: 11 },
      },
      series: [
        {
          name: t('audit.claimed'),
          type: 'bar',
          barMaxWidth: 14,
          data: report?.staff.map((item) => item.claimed) ?? [],
        },
        {
          name: t('audit.resolvedAction'),
          type: 'bar',
          barMaxWidth: 14,
          data: report?.staff.map((item) => item.resolved) ?? [],
        },
        {
          name: t('audit.closedAction'),
          type: 'bar',
          barMaxWidth: 14,
          data: report?.staff.map((item) => item.closed) ?? [],
        },
      ],
    }),
    [report, t],
  );

  const staffColumns: TableColumnsType<StaffRow> = [
    {
      title: t('audit.staffHeading'),
      key: 'displayName',
      render: (_, record) => (
        <div className="actor-cell">
          <strong>{record.displayName}</strong>
          <span>@{record.username}</span>
        </div>
      ),
    },
    {
      title: t('audit.claimed'),
      dataIndex: 'claimed',
      key: 'claimed',
      width: 90,
    },
    {
      title: t('audit.resolvedAction'),
      dataIndex: 'resolved',
      key: 'resolved',
      width: 90,
    },
    {
      title: t('audit.closedAction'),
      dataIndex: 'closed',
      key: 'closed',
      width: 90,
    },
    {
      title: t('audit.total'),
      dataIndex: 'total',
      key: 'total',
      width: 90,
      render: (value: number) => <strong>{value}</strong>,
    },
  ];

  const actionColumns: TableColumnsType<RecentAction> = [
    {
      title: t('audit.columnTime'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: t('audit.columnOperator'),
      key: 'user',
      width: 140,
      render: (_, record) => record.user?.displayName ?? t('common.anonymous'),
    },
    {
      title: t('audit.columnAction'),
      dataIndex: 'action',
      key: 'action',
      width: 120,
      render: (value: string) => (
        <Tag className={toneClass(ACTION_TONES[value])} bordered={false}>
          {labels.action(value)}
        </Tag>
      ),
    },
    {
      title: t('audit.columnReporter'),
      key: 'reporterName',
      width: 100,
      render: (_, record) => record.ticket?.reporterName ?? t('common.anonymous'),
    },
    {
      title: t('audit.columnTicket'),
      key: 'ticket',
      render: (_, record) =>
        record.ticket ? (
          <span>
            <span className="ticket-no">{record.ticket.ticketNo}</span>
            {'  '}
            {record.ticket.title}
          </span>
        ) : (
          <span className="muted">—</span>
        ),
    },
  ];

  const detailColumns: TableColumnsType<TicketListItem> = [
    {
      title: t('tickets.columnNo'),
      dataIndex: 'ticketNo',
      key: 'ticketNo',
      width: 142,
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
      width: 120,
      render: (value: TicketCategory) => (
        <Tag className={toneClass(CATEGORY_TONES[value])} bordered={false}>
          {labels.category(value)}
        </Tag>
      ),
    },
    {
      title: t('tickets.columnStatus'),
      dataIndex: 'status',
      key: 'status',
      width: 92,
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
      width: 110,
      render: (value: TicketListItem['priority']) => (
        <Tag className={toneClass(PRIORITY_TONES[value])} bordered={false}>
          {labels.priority(value)}
        </Tag>
      ),
    },
    {
      title: t('tickets.columnAssignee'),
      dataIndex: 'assignee',
      key: 'assignee',
      width: 110,
      render: (_, record) => record.assignee?.displayName ?? t('detail.unassigned'),
    },
    {
      title: t('tickets.columnCreatedAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 132,
      render: (value: string) => dayjs(value).format('MM-DD HH:mm'),
    },
    {
      title: t('audit.detailExpected'),
      dataIndex: 'expectedAt',
      key: 'expectedAt',
      width: 132,
      render: (value: string | null) =>
        value ? dayjs(value).format('MM-DD HH:mm') : t('report.asap'),
    },
    {
      title: t('audit.detailResolved'),
      dataIndex: 'resolvedAt',
      key: 'resolvedAt',
      width: 132,
      render: (value: string | null) =>
        value ? dayjs(value).format('MM-DD HH:mm') : <span className="text-muted">—</span>,
    },
  ];

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await downloadAuditReport(days, language);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `it-audit-report-${days}d-${language}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      message.success(t('audit.exportSuccess'));
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="page-stack">
      <div className="page-head">
        <div className="page-head-title">
          <span className="page-title-icon">
            <BarChartOutlined />
          </span>
          <h1 className="page-title">{t('audit.title')}</h1>
        </div>
        <Space wrap>
          <Select
            value={days}
            onChange={setDays}
            options={[
              { value: 7, label: t('audit.range7') },
              { value: 30, label: t('audit.range30') },
              { value: 90, label: t('audit.range90') },
            ]}
            style={{ width: 140 }}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void reportQuery.refetch()}
            loading={reportQuery.isFetching}
            title={t('common.refresh')}
          />
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            loading={exporting}
            onClick={handleExport}
          >
            {t('audit.export')}
          </Button>
        </Space>
      </div>

      {reportQuery.isError && (
        <Alert
          type="error"
          showIcon
          message={t('audit.loadError')}
          description={getErrorMessage(reportQuery.error)}
          action={
            <Button size="small" onClick={() => void reportQuery.refetch()}>
              {t('common.retry')}
            </Button>
          }
        />
      )}

      {report && (
        <Tabs
          activeKey={tab}
          onChange={(key) => setTab(key as 'overview' | 'detail')}
          items={[
            { key: 'overview', label: t('audit.tabOverview') },
            { key: 'detail', label: t('audit.tabDetail') },
          ]}
        />
      )}

      {reportQuery.isLoading && !report ? (
        <section className="panel">
          <Skeleton active paragraph={{ rows: 8 }} />
        </section>
      ) : report ? (
        tab === 'overview' ? (
          <>
            <div className="stat-row audit-stats">
              <div className="stat-tile stat-submitted">
                <span className="stat-icon">
                  <FileTextOutlined />
                </span>
                <div>
                  <strong>{report.summary.submitted}</strong>
                  <span>{t('audit.submitted')}</span>
                </div>
              </div>
              <div className="stat-tile stat-pending">
                <span className="stat-icon">
                  <ClockCircleOutlined />
                </span>
                <div>
                  <strong>{report.summary.pending}</strong>
                  <span>{t('audit.pending')}</span>
                </div>
              </div>
              <div className="stat-tile stat-today">
                <span className="stat-icon">
                  <CheckCircleOutlined />
                </span>
                <div>
                  <strong>{report.summary.resolved}</strong>
                  <span>{t('audit.resolved')}</span>
                </div>
              </div>
              <div className="stat-tile stat-duration">
                <span className="stat-icon">
                  <FieldTimeOutlined />
                </span>
                <div>
                  <strong>{fixed(report.summary.avgResolutionHours)}</strong>
                  <span>{t('audit.avgResolution')}</span>
                </div>
              </div>
              <div className="stat-tile stat-super">
                <span className="stat-icon">
                  <FireFilled className="fire-icon" />
                </span>
                <div>
                  <strong>{report.summary.superUrgent}</strong>
                  <span>{t('audit.superUrgent')}</span>
                </div>
              </div>
            </div>

            <div className="chart-grid">
              <section className="panel chart-card chart-wide">
                <h2>{t('audit.trend')}</h2>
                <EChart option={trendOption} height={280} />
              </section>

              <section className="panel chart-card">
                <h2>{t('audit.categoryChart')}</h2>
                {categoryTotal > 0 ? (
                  <EChart option={categoryOption} height={260} />
                ) : (
                  <div className="chart-empty">
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('common.noData')} />
                  </div>
                )}
              </section>

              <section className="panel chart-card">
                <h2>{t('audit.staffChart')}</h2>
                {hasStaff ? (
                  <EChart option={staffOption} height={260} />
                ) : (
                  <div className="chart-empty">
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={t('audit.emptyStaff')}
                    />
                  </div>
                )}
              </section>
            </div>

            <section className="panel">
              <div className="panel-heading">
                <h2>
                  <TeamOutlined />
                  {t('audit.staffStats')}
                </h2>
                <span>
                  {t('audit.staffActions', {
                    count: report.summary.staffActions,
                  })}
                </span>
              </div>
              <Table<StaffRow>
                rowKey="userId"
                columns={staffColumns}
                dataSource={report.staff}
                pagination={false}
                size="small"
                locale={{ emptyText: t('audit.emptyStaff') }}
              />
            </section>

            <section className="panel">
              <div className="panel-heading">
                <h2>
                  <AuditOutlined />
                  {t('audit.recentActions')}
                </h2>
                <span>{t('audit.recentHint')}</span>
              </div>
              <Table<RecentAction>
                rowKey="id"
                columns={actionColumns}
                dataSource={report.recentActions}
                pagination={false}
                size="small"
                scroll={{ x: 820 }}
                locale={{ emptyText: t('audit.emptyActions') }}
              />
            </section>
          </>
        ) : (
          <section className="panel">
            <div className="filter-bar">
              <Select<TicketStatus>
                allowClear
                placeholder={t('audit.allStatuses')}
                value={detailStatus}
                options={Object.values(TicketStatus).map((value) => ({
                  value,
                  label: labels.status(value),
                }))}
                onChange={(value) => {
                  setDetailStatus(value);
                  setDetailPage(1);
                }}
                className="filter-select"
              />
              <Select<TicketCategory>
                allowClear
                placeholder={t('audit.allCategories')}
                value={detailCategory}
                options={Object.values(TicketCategory).map((value) => ({
                  value,
                  label: labels.category(value),
                }))}
                onChange={(value) => {
                  setDetailCategory(value);
                  setDetailPage(1);
                }}
                className="filter-select filter-select-wide"
              />
              <Select<string>
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder={t('audit.allAssignees')}
                value={detailAssignee}
                options={(usersQuery.data?.items ?? []).map((user) => ({
                  value: user.id,
                  label: user.displayName,
                }))}
                onChange={(value) => {
                  setDetailAssignee(value);
                  setDetailPage(1);
                }}
                className="filter-select filter-select-wide"
              />
              <span className="text-muted audit-detail-count">
                {t('audit.detailTotal', { count: detailQuery.data?.total ?? 0 })}
              </span>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => void detailQuery.refetch()}
                loading={detailQuery.isFetching}
                title={t('common.refresh')}
              />
            </div>

            <Table<TicketListItem>
              rowKey="id"
              columns={detailColumns}
              dataSource={detailQuery.data?.items ?? []}
              loading={detailQuery.isLoading}
              scroll={{ x: 1120 }}
              locale={{ emptyText: t('audit.detailEmpty') }}
              onRow={(record) => ({
                onClick: () => navigate(`/tickets/${record.id}`),
                className: 'clickable-row',
              })}
              pagination={{
                current: detailPage,
                pageSize: detailPageSize,
                total: detailQuery.data?.total ?? 0,
                showSizeChanger: true,
                pageSizeOptions: [10, 20, 50, 100],
                showTotal: (total) => t('common.total', { count: total }),
                onChange: (nextPage, nextSize) => {
                  setDetailPage(nextSize !== detailPageSize ? 1 : nextPage);
                  setDetailPageSize(nextSize);
                },
              }}
            />
          </section>
        )
      ) : null}
    </div>
  );
}
