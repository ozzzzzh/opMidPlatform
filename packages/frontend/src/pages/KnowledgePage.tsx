import {
  BookOutlined,
  FileTextOutlined,
  PlusOutlined,
  ReloadOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App as AntdApp,
  Button,
  Col,
  Empty,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Upload,
  type TableColumnsType,
  type UploadFile,
} from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  KnowledgeDocType,
  KnowledgeKind,
  KnowledgeSpace,
  KnowledgeStatus,
  type KnowledgeArticleSummary,
} from '@it-ops/shared';
import { getErrorMessage } from '@/api/client';
import { fetchKnowledgeList, uploadKnowledgeDocument } from '@/api/knowledge';
import { toneClass, type Tone } from '@/components/tones';
import { useI18n } from '@/i18n/I18nContext';
import type { TranslationKey } from '@/i18n/messages';

interface DocumentFormValues {
  title: string;
  space: KnowledgeSpace;
  docType: KnowledgeDocType;
  system?: string;
  tags?: string[];
  keywords?: string[];
  summary?: string;
}

const STATUS_TONES: Record<KnowledgeStatus, Tone> = {
  [KnowledgeStatus.DRAFT]: 'warning',
  [KnowledgeStatus.PUBLISHED]: 'success',
  [KnowledgeStatus.ARCHIVED]: 'neutral',
};

export default function KnowledgePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm<DocumentFormValues>();
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [space, setSpace] = useState<KnowledgeSpace | undefined>();
  const [kind, setKind] = useState<KnowledgeKind | undefined>();
  const [status, setStatus] = useState<KnowledgeStatus | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [uploadOpen, setUploadOpen] = useState(() => searchParams.get('upload') === '1');
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const listQuery = useQuery({
    queryKey: ['knowledge', { page, pageSize, keyword, space, kind, status }],
    queryFn: () =>
      fetchKnowledgeList({
        page,
        pageSize,
        q: keyword || undefined,
        space,
        kind,
        status,
      }),
    placeholderData: (previous) => previous,
  });

  const uploadMutation = useMutation({
    mutationFn: ({ values, file }: { values: DocumentFormValues; file: File }) =>
      uploadKnowledgeDocument(
        {
          title: values.title,
          space: values.space,
          docType: values.docType,
          system: values.system,
          tags: values.tags,
          keywords: values.keywords,
          summary: values.summary,
        },
        file,
      ),
    onSuccess: (article) => {
      message.success(t('knowledge.uploadSuccess'));
      setUploadOpen(false);
      form.resetFields();
      setFileList([]);
      setSelectedFile(null);
      void queryClient.invalidateQueries({ queryKey: ['knowledge'] });
      void queryClient.invalidateQueries({ queryKey: ['knowledge-meta'] });
      navigate(`/knowledge/${article.id}`);
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const spaceOptions = Object.values(KnowledgeSpace).map((value) => ({
    value,
    label: t(`knowledge.space.${value}` as TranslationKey),
  }));

  const columns: TableColumnsType<KnowledgeArticleSummary> = [
    {
      title: t('knowledge.columnCode'),
      dataIndex: 'code',
      key: 'code',
      width: 142,
      render: (value: string) => <span className="ticket-no">{value}</span>,
    },
    {
      title: t('knowledge.columnTitle'),
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (value: string, record) => (
        <div className="knowledge-title-cell">
          <span className="knowledge-title-text">{value}</span>
          {record.needsReview && (
            <Tag className={toneClass('warning')} bordered={false}>
              {t('knowledge.needsReview')}
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: t('knowledge.columnKind'),
      dataIndex: 'kind',
      key: 'kind',
      width: 118,
      render: (value: KnowledgeKind, record) => (
        <Tag
          className={toneClass(value === KnowledgeKind.CARD ? 'primary' : 'violet')}
          bordered={false}
        >
          {value === KnowledgeKind.CARD
            ? t('knowledge.kindCard')
            : record.docType === KnowledgeDocType.REFERENCE
              ? t('knowledge.docReference')
              : t('knowledge.docHandbook')}
        </Tag>
      ),
    },
    {
      title: t('knowledge.columnSpace'),
      dataIndex: 'space',
      key: 'space',
      width: 150,
      render: (value: KnowledgeSpace) => t(`knowledge.space.${value}` as TranslationKey),
    },
    {
      title: t('knowledge.columnStatus'),
      dataIndex: 'status',
      key: 'status',
      width: 96,
      render: (value: KnowledgeStatus) => (
        <Tag className={toneClass(STATUS_TONES[value])} bordered={false}>
          {t(`knowledge.status${value.charAt(0)}${value.slice(1).toLowerCase()}` as TranslationKey)}
        </Tag>
      ),
    },
    {
      title: t('knowledge.columnTickets'),
      dataIndex: 'linkedTicketCount',
      key: 'linkedTicketCount',
      width: 96,
      render: (value: number) => (
        <span className={value > 0 ? 'knowledge-link-count' : 'text-muted'}>{value}</span>
      ),
    },
    {
      title: t('knowledge.columnOwner'),
      dataIndex: 'owner',
      key: 'owner',
      width: 120,
      render: (_, record) => record.owner?.displayName ?? <span className="text-muted">—</span>,
    },
    {
      title: t('knowledge.columnUpdated'),
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 132,
      render: (value: string) => dayjs(value).format('MM-DD HH:mm'),
    },
    {
      title: t('knowledge.columnAction'),
      key: 'action',
      width: 76,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          onClick={(event) => {
            event.stopPropagation();
            navigate(`/knowledge/${record.id}`);
          }}
        >
          {t('knowledge.view')}
        </Button>
      ),
    },
  ];

  const closeUpload = () => {
    setUploadOpen(false);
    form.resetFields();
    setFileList([]);
    setSelectedFile(null);
    if (searchParams.get('upload') === '1') {
      const next = new URLSearchParams(searchParams);
      next.delete('upload');
      setSearchParams(next, { replace: true });
    }
  };

  const submitUpload = async () => {
    const values = await form.validateFields();
    const file = selectedFile ?? fileList[0]?.originFileObj;
    if (!file) {
      message.error(t('knowledge.requiredFile'));
      return;
    }
    uploadMutation.mutate({ values, file });
  };

  return (
    <div className="page-stack">
      <div className="page-head">
        <div className="page-head-title">
          <span className="page-title-icon">
            <BookOutlined />
          </span>
          <h1 className="page-title">{t('knowledge.title')}</h1>
        </div>

        <Space wrap>
          <Button icon={<UploadOutlined />} onClick={() => setUploadOpen(true)}>
            {t('knowledge.uploadDocument')}
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/knowledge/new')}>
            {t('knowledge.newCard')}
          </Button>
        </Space>
      </div>

      <section className="panel">
        <div className="filter-bar">
          <Input.Search
            allowClear
            value={keywordInput}
            placeholder={t('knowledge.searchPlaceholder')}
            enterButton={t('common.search')}
            onChange={(event) => {
              setKeywordInput(event.target.value);
              if (!event.target.value) {
                setKeyword('');
                setPage(1);
              }
            }}
            onSearch={(value) => {
              setKeyword(value.trim());
              setPage(1);
            }}
            className="filter-search"
          />

          <Select<KnowledgeSpace>
            allowClear
            placeholder={t('knowledge.allSpaces')}
            value={space}
            options={spaceOptions}
            onChange={(value) => {
              setSpace(value);
              setPage(1);
            }}
            className="filter-select filter-select-wide"
          />

          <Select<KnowledgeKind>
            allowClear
            placeholder={t('knowledge.allKinds')}
            value={kind}
            options={[
              { value: KnowledgeKind.CARD, label: t('knowledge.kindCard') },
              { value: KnowledgeKind.DOCUMENT, label: t('knowledge.kindDocument') },
            ]}
            onChange={(value) => {
              setKind(value);
              setPage(1);
            }}
            className="filter-select"
          />

          <Select<KnowledgeStatus>
            allowClear
            placeholder={t('knowledge.allStatuses')}
            value={status}
            options={[
              { value: KnowledgeStatus.DRAFT, label: t('knowledge.statusDraft') },
              { value: KnowledgeStatus.PUBLISHED, label: t('knowledge.statusPublished') },
              { value: KnowledgeStatus.ARCHIVED, label: t('knowledge.statusArchived') },
            ]}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            className="filter-select"
          />

          <Space>
            <Button
              icon={<ReloadOutlined />}
              title={t('common.refresh')}
              aria-label={t('common.refresh')}
              onClick={() => void listQuery.refetch()}
              loading={listQuery.isFetching}
            />
          </Space>
        </div>

        {listQuery.isError && (
          <Alert
            type="error"
            showIcon
            message={t('knowledge.loadError')}
            description={getErrorMessage(listQuery.error)}
            action={
              <Button size="small" onClick={() => void listQuery.refetch()}>
                {t('common.retry')}
              </Button>
            }
            className="section-alert"
          />
        )}

        <Table<KnowledgeArticleSummary>
          rowKey="id"
          columns={columns}
          dataSource={listQuery.data?.items ?? []}
          loading={listQuery.isLoading}
          scroll={{ x: 1216 }}
          locale={{
            emptyText: (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('knowledge.empty')}>
                <Button type="primary" size="small" onClick={() => navigate('/knowledge/new')}>
                  {t('knowledge.newCard')}
                </Button>
              </Empty>
            ),
          }}
          onRow={(record) => ({
            onClick: () => navigate(`/knowledge/${record.id}`),
            className: 'clickable-row',
          })}
          pagination={{
            current: page,
            pageSize,
            total: listQuery.data?.total ?? 0,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (total) => t('knowledge.count', { count: total }),
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPageSize !== pageSize ? 1 : nextPage);
              setPageSize(nextPageSize);
            },
          }}
        />
      </section>

      <Modal
        title={t('knowledge.createDocumentTitle')}
        open={uploadOpen}
        onCancel={closeUpload}
        onOk={() => void submitUpload()}
        okText={t('knowledge.uploadDocument')}
        cancelText={t('common.cancel')}
        confirmLoading={uploadMutation.isPending}
        destroyOnClose
        width={620}
      >
        <Form<DocumentFormValues>
          form={form}
          layout="vertical"
          requiredMark={false}
          initialValues={{ space: KnowledgeSpace.OFFICE, docType: KnowledgeDocType.HANDBOOK }}
        >
          <Form.Item
            name="title"
            label={t('knowledge.columnTitle')}
            rules={[{ required: true, message: t('knowledge.requiredTitle') }]}
          >
            <Input maxLength={200} />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="space"
                label={t('knowledge.columnSpace')}
                rules={[{ required: true, message: t('knowledge.requiredSpace') }]}
              >
                <Select options={spaceOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="docType"
                label={t('knowledge.documentType')}
                rules={[{ required: true, message: t('knowledge.requiredDocType') }]}
              >
                <Select
                  options={[
                    { value: KnowledgeDocType.HANDBOOK, label: t('knowledge.docHandbook') },
                    { value: KnowledgeDocType.REFERENCE, label: t('knowledge.docReference') },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="system" label={t('knowledge.system')}>
            <Input maxLength={100} />
          </Form.Item>

          <Form.Item name="tags" label={t('knowledge.tags')}>
            <Select mode="tags" tokenSeparators={[',']} />
          </Form.Item>

          <Form.Item name="keywords" label={t('knowledge.keywords')}>
            <Select mode="tags" tokenSeparators={[',']} />
          </Form.Item>

          <Form.Item name="summary" label={t('knowledge.summary')}>
            <Input.TextArea rows={3} maxLength={500} showCount />
          </Form.Item>

          <Form.Item label={t('knowledge.documentFile')} extra={t('knowledge.documentFileHint')}>
            <Upload
              maxCount={1}
              accept=".pdf,.docx,.xlsx,.md,.txt"
              fileList={fileList}
              beforeUpload={(file) => {
                setSelectedFile(file);
                return false;
              }}
              onChange={({ fileList: nextList }) => {
                const next = nextList.slice(0, 1);
                setFileList(next);
                if (next.length === 0) setSelectedFile(null);
              }}
            >
              <Button icon={<FileTextOutlined />}>{t('knowledge.documentFile')}</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
