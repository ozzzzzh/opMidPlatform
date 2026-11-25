import {
  AppstoreOutlined,
  CameraOutlined,
  CloudServerOutlined,
  CopyOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  DesktopOutlined,
  EditOutlined,
  ExportOutlined,
  KeyOutlined,
  MailOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SafetyOutlined,
  TabletOutlined,
  TeamOutlined,
  VideoCameraOutlined,
  WifiOutlined,
  WindowsOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App as AntdApp,
  AutoComplete,
  Button,
  Checkbox,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Switch,
  Tag,
} from 'antd';
import dayjs from 'dayjs';
import { useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Role, type SubsystemItem } from '@it-ops/shared';
import { getErrorMessage } from '@/api/client';
import {
  createSubsystem,
  deleteSubsystem,
  fetchSubsystems,
  updateSubsystem,
} from '@/api/subsystems';
import { useAuth } from '@/auth/AuthContext';
import { toneClass, type Tone } from '@/components/tones';
import { useI18n } from '@/i18n/I18nContext';

interface SubsystemFormValues {
  name: string;
  password?: string;
  clearCredential?: boolean;
  category?: string;
  url?: string;
  accountHint?: string;
  description?: string;
  notes?: string;
  tags?: string[];
  sortOrder?: number;
  visible?: boolean;
}

const PRESET_CATEGORIES = [
  '门禁与安防',
  '账号与办公',
  '网络与存储',
  '会议与多媒体',
  '终端与安全',
  '机房与监控',
  '其他',
];

const CATEGORY_TONES: Record<string, Tone> = {
  门禁与安防: 'warning',
  账号与办公: 'primary',
  网络与存储: 'success',
  会议与多媒体: 'violet',
  终端与安全: 'danger',
  机房与监控: 'critical',
};

const CATEGORY_ICONS: Record<string, ReactNode> = {
  门禁与安防: <SafetyOutlined />,
  账号与办公: <TeamOutlined />,
  网络与存储: <CloudServerOutlined />,
  会议与多媒体: <VideoCameraOutlined />,
  终端与安全: <SafetyCertificateOutlined />,
  机房与监控: <DatabaseOutlined />,
};

const ICON_BY_KEY: Record<string, ReactNode> = {
  shield: <SafetyOutlined />,
  camera: <CameraOutlined />,
  microsoft: <WindowsOutlined />,
  mail: <MailOutlined />,
  wifi: <WifiOutlined />,
  nas: <DatabaseOutlined />,
  server: <CloudServerOutlined />,
  video: <VideoCameraOutlined />,
  tablet: <TabletOutlined />,
  panel: <DesktopOutlined />,
  security: <SafetyCertificateOutlined />,
};

function iconFor(item: SubsystemItem): ReactNode {
  if (item.icon && ICON_BY_KEY[item.icon]) return ICON_BY_KEY[item.icon];
  return CATEGORY_ICONS[item.category ?? ''] ?? <AppstoreOutlined />;
}

function toneFor(category: string | null): Tone {
  return category ? (CATEGORY_TONES[category] ?? 'neutral') : 'neutral';
}

function isHttpUrl(url: string | null): boolean {
  return Boolean(url && /^https?:\/\//i.test(url));
}

export default function SubsystemsPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { message, modal } = AntdApp.useApp();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [form] = Form.useForm<SubsystemFormValues>();
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<string | undefined>();
  const [modalOpen, setModalOpen] = useState(() => searchParams.get('new') === '1');
  const [editing, setEditing] = useState<SubsystemItem | null>(null);
  const [credentialTarget, setCredentialTarget] = useState<SubsystemItem | null>(null);
  const isAdmin = user?.role === Role.ADMIN;

  const listQuery = useQuery({
    queryKey: ['subsystems', { keyword, category }],
    queryFn: () => fetchSubsystems({ q: keyword || undefined, category }),
  });

  const createMutation = useMutation({
    mutationFn: (values: SubsystemFormValues) =>
      createSubsystem({
        ...values,
        description: values.description?.trim() || undefined,
        notes: values.notes?.trim() || undefined,
        accountHint: values.accountHint?.trim() || undefined,
        url: values.url?.trim() || undefined,
        category: values.category?.trim() || undefined,
        tags: values.tags ?? [],
      }),
    onSuccess: () => {
      message.success(t('subsystems.created'));
      closeModal();
      void queryClient.invalidateQueries({ queryKey: ['subsystems'] });
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: SubsystemFormValues }) =>
      updateSubsystem(id, {
        ...values,
        description: values.description?.trim() || '',
        notes: values.notes?.trim() || '',
        accountHint: values.accountHint?.trim() || '',
        url: values.url?.trim() || '',
        category: values.category?.trim() || '',
        tags: values.tags ?? [],
      }),
    onSuccess: () => {
      message.success(t('subsystems.updated'));
      closeModal();
      void queryClient.invalidateQueries({ queryKey: ['subsystems'] });
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSubsystem(id),
    onSuccess: () => {
      message.success(t('subsystems.deleted'));
      void queryClient.invalidateQueries({ queryKey: ['subsystems'] });
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    form.resetFields();
    if (searchParams.get('new') === '1') {
      const next = new URLSearchParams(searchParams);
      next.delete('new');
      setSearchParams(next, { replace: true });
    }
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ sortOrder: 0, visible: true });
    setModalOpen(true);
  };

  const openEdit = (item: SubsystemItem) => {
    setEditing(item);
    form.setFieldsValue({
      name: item.name,
      category: item.category ?? undefined,
      url: item.url ?? undefined,
      accountHint: item.accountHint ?? undefined,
      description: item.description ?? undefined,
      notes: item.notes ?? undefined,
      tags: item.tags,
      sortOrder: item.sortOrder,
      visible: item.visible,
      password: undefined,
      clearCredential: false,
    });
    setModalOpen(true);
  };

  const submitForm = async () => {
    const values = await form.validateFields();
    if (editing) {
      updateMutation.mutate({ id: editing.id, values });
    } else {
      createMutation.mutate(values);
    }
  };

  const confirmDelete = (item: SubsystemItem) => {
    modal.confirm({
      title: t('subsystems.deleteConfirm'),
      content: t('subsystems.deleteContent'),
      okText: t('subsystems.delete'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutateAsync(item.id),
    });
  };

  const copyAddress = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      message.success(t('subsystems.copied'));
    } catch {
      message.error(t('subsystems.copyFailed'));
    }
  };

  const openCredential = (item: SubsystemItem) => setCredentialTarget(item);
  const closeCredential = () => setCredentialTarget(null);

  const copyCredential = async () => {
    if (!credentialTarget) return;
    try {
      await navigator.clipboard.writeText(
        [credentialTarget.accountHint ?? '', credentialTarget.password ?? '']
          .filter(Boolean)
          .join('\n'),
      );
      message.success(t('subsystems.credentialCopied'));
    } catch {
      message.error(t('subsystems.copyFailed'));
    }
  };

  const categoryOptions = [
    ...new Set([...PRESET_CATEGORIES, ...(listQuery.data?.categories ?? [])]),
  ].map((value) => ({ value }));

  const items = listQuery.data?.items ?? [];

  return (
    <div className="page-stack">
      <div className="page-head">
        <div className="page-head-title">
          <span className="page-title-icon">
            <AppstoreOutlined />
          </span>
          <h1 className="page-title">{t('subsystems.title')}</h1>
        </div>

        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          {t('subsystems.new')}
        </Button>
      </div>

      <section className="panel">
        <div className="filter-bar subsystem-filter-bar">
          <Input.Search
            allowClear
            value={keywordInput}
            placeholder={t('subsystems.searchPlaceholder')}
            enterButton={t('common.search')}
            onChange={(event) => {
              setKeywordInput(event.target.value);
              if (!event.target.value) {
                setKeyword('');
              }
            }}
            onSearch={(value) => setKeyword(value.trim())}
            className="filter-search"
          />

          <Select
            allowClear
            placeholder={t('subsystems.allCategories')}
            value={category}
            options={categoryOptions}
            onChange={setCategory}
            className="filter-select filter-select-wide"
          />

          <span className="text-muted subsystem-count">
            {t('subsystems.count', { count: items.length })}
          </span>

          <Button
            icon={<ReloadOutlined />}
            title={t('common.refresh')}
            aria-label={t('common.refresh')}
            onClick={() => void listQuery.refetch()}
            loading={listQuery.isFetching}
          />
        </div>

        {listQuery.isError && (
          <Alert
            type="error"
            showIcon
            message={t('subsystems.loadError')}
            description={getErrorMessage(listQuery.error)}
            action={
              <Button size="small" onClick={() => void listQuery.refetch()}>
                {t('common.retry')}
              </Button>
            }
            className="section-alert"
          />
        )}

        {items.length === 0 && !listQuery.isLoading ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('subsystems.empty')}>
            <Button type="primary" size="small" onClick={openCreate}>
              {t('subsystems.new')}
            </Button>
          </Empty>
        ) : (
          <div className="subsystem-grid">
            {items.map((item) => (
              <article
                className={`subsystem-card${item.visible ? '' : ' subsystem-card-hidden'}`}
                key={item.id}
              >
                <div className="subsystem-card-head">
                  <span className={`subsystem-icon subsystem-tone-${toneFor(item.category)}`}>
                    {iconFor(item)}
                  </span>
                  <div className="subsystem-card-title">
                    <h2>{item.name}</h2>
                    <div className="subsystem-card-meta">
                      {item.category && (
                        <Tag className={toneClass(toneFor(item.category))} bordered={false}>
                          {item.category}
                        </Tag>
                      )}
                      {!item.visible && (
                        <Tag className={toneClass('neutral')} bordered={false}>
                          {t('subsystems.hidden')}
                        </Tag>
                      )}
                    </div>
                  </div>
                </div>

                {item.description && <p className="subsystem-desc">{item.description}</p>}
                {item.notes && <p className="subsystem-notes">{item.notes}</p>}

                {item.tags.length > 0 && (
                  <div className="subsystem-tags">
                    {item.tags.map((tag) => (
                      <Tag key={tag} bordered={false} className={toneClass('neutral')}>
                        {tag}
                      </Tag>
                    ))}
                  </div>
                )}

                <div className="subsystem-card-footer">
                  <span className="subsystem-account">
                    {item.accountHint
                      ? `${t('subsystems.account')}: ${item.accountHint}`
                      : item.url
                        ? item.url
                        : ''}
                  </span>
                  <div className="subsystem-actions">
                    {item.hasPassword && (
                      <Button
                        size="small"
                        icon={<KeyOutlined />}
                        onClick={() => openCredential(item)}
                      >
                        {t('subsystems.viewCredential')}
                      </Button>
                    )}
                    {isHttpUrl(item.url) && (
                      <a href={item.url as string} target="_blank" rel="noreferrer noopener">
                        <Button size="small" type="primary" icon={<ExportOutlined />}>
                          {t('subsystems.open')}
                        </Button>
                      </a>
                    )}
                    {item.url && !isHttpUrl(item.url) && (
                      <Button
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => void copyAddress(item.url as string)}
                      >
                        {t('subsystems.copyAddress')}
                      </Button>
                    )}
                    <Button
                      size="small"
                      type="text"
                      icon={<EditOutlined />}
                      onClick={() => openEdit(item)}
                      aria-label={t('subsystems.edit')}
                    />
                    {isAdmin && (
                      <Button
                        size="small"
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => confirmDelete(item)}
                        aria-label={t('subsystems.delete')}
                      />
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <Modal
        title={
          <span className="modal-title-with-icon">
            <KeyOutlined />
            {t('subsystems.credentialTitle')}
          </span>
        }
        open={Boolean(credentialTarget)}
        onCancel={closeCredential}
        footer={[
          <Button
            key="copy"
            type="primary"
            icon={<CopyOutlined />}
            onClick={() => void copyCredential()}
            disabled={!credentialTarget}
          >
            {t('subsystems.copyCredential')}
          </Button>,
          <Button key="close" onClick={closeCredential}>
            {t('common.close')}
          </Button>,
        ]}
        destroyOnClose
        width={480}
      >
        <Alert
          type="warning"
          showIcon
          message={t('subsystems.credentialWarning')}
          className="form-alert"
        />
        {credentialTarget && (
          <div className="subsystem-credential">
            <div>
              <span>{t('subsystems.credentialAccount')}</span>
              <strong>{credentialTarget.accountHint || '—'}</strong>
            </div>
            <div>
              <span>{t('subsystems.credentialPassword')}</span>
              <pre className="subsystem-secret">{credentialTarget.password || '—'}</pre>
            </div>
            {credentialTarget.passwordUpdatedAt && (
              <div>
                <span>{t('subsystems.credentialUpdated')}</span>
                <strong>
                  {dayjs(credentialTarget.passwordUpdatedAt).format('YYYY-MM-DD HH:mm')}
                </strong>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        title={editing ? t('subsystems.editTitle') : t('subsystems.newTitle')}
        open={modalOpen}
        onCancel={closeModal}
        onOk={() => void submitForm()}
        okText={t('subsystems.save')}
        cancelText={t('common.cancel')}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        destroyOnClose
        width={620}
      >
        <Form<SubsystemFormValues>
          form={form}
          layout="vertical"
          requiredMark={false}
          initialValues={{ sortOrder: 0, visible: true }}
        >
          <Form.Item
            name="name"
            label={t('subsystems.name')}
            rules={[{ required: true, message: t('subsystems.requiredName') }]}
          >
            <Input maxLength={100} placeholder={t('subsystems.namePlaceholder')} />
          </Form.Item>

          <Form.Item name="category" label={t('subsystems.category')}>
            <AutoComplete
              options={categoryOptions}
              placeholder={t('subsystems.categoryPlaceholder')}
              filterOption={(input, option) =>
                String(option?.value ?? '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item name="url" label={t('subsystems.url')}>
            <Input maxLength={500} placeholder={t('subsystems.urlPlaceholder')} />
          </Form.Item>

          <Form.Item
            name="accountHint"
            label={t('subsystems.account')}
            extra={t('subsystems.accountHintExtra')}
          >
            <Input maxLength={200} placeholder={t('subsystems.accountHintPlaceholder')} />
          </Form.Item>

          <Form.Item
            name="password"
            label={t('subsystems.password')}
            extra={t('subsystems.passwordExtra')}
          >
            <Input.Password
              maxLength={2000}
              autoComplete="new-password"
              placeholder={
                editing?.hasPassword
                  ? t('subsystems.passwordKeep')
                  : t('subsystems.passwordPlaceholder')
              }
            />
          </Form.Item>

          {editing?.hasPassword && (
            <Form.Item name="clearCredential" valuePropName="checked">
              <Checkbox>{t('subsystems.clearCredential')}</Checkbox>
            </Form.Item>
          )}

          <Form.Item name="description" label={t('subsystems.description')}>
            <Input.TextArea rows={2} maxLength={5000} />
          </Form.Item>

          <Form.Item name="notes" label={t('subsystems.notes')}>
            <Input.TextArea rows={3} maxLength={10000} />
          </Form.Item>

          <Form.Item name="tags" label={t('subsystems.tags')}>
            <Select mode="tags" tokenSeparators={[',']} />
          </Form.Item>

          <div className="subsystem-form-row">
            <Form.Item name="sortOrder" label={t('subsystems.sortOrder')}>
              <InputNumber min={0} max={9999} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="visible" label={t('subsystems.visible')} valuePropName="checked">
              <Switch />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
