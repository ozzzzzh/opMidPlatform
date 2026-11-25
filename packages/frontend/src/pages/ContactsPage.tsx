import {
  ContactsOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  ExportOutlined,
  MailOutlined,
  PhoneOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App as AntdApp,
  AutoComplete,
  Button,
  Collapse,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Pagination,
  Select,
  Space,
  Tag,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Role, type ContactItem } from '@it-ops/shared';
import { getErrorMessage } from '@/api/client';
import { createContact, deleteContact, fetchContacts, updateContact } from '@/api/contacts';
import { useAuth } from '@/auth/AuthContext';
import { toneClass } from '@/components/tones';
import { useI18n } from '@/i18n/I18nContext';

interface ContactFormValues {
  name: string;
  role?: string;
  systemName: string;
  systemShortName?: string;
  category?: string;
  systemUrl?: string;
  unit?: string;
  businessDept?: string;
  landline?: string;
  mobile?: string;
  email?: string;
  notes?: string;
  sortOrder?: number;
}

interface ContactGroup {
  key: string;
  systemName: string;
  systemShortName: string | null;
  category: string | null;
  systemUrl: string | null;
  unit: string | null;
  businessDept: string | null;
  contacts: ContactItem[];
}

function isHttpUrl(url: string | null): boolean {
  return Boolean(url && /^https?:\/\//i.test(url));
}

function firstPhone(value: string): string {
  return value.split(/\s*\/\s*/)[0] ?? value;
}

function groupContacts(items: ContactItem[]): ContactGroup[] {
  const map = new Map<string, ContactGroup>();
  for (const item of items) {
    let group = map.get(item.systemName);
    if (!group) {
      group = {
        key: item.systemName,
        systemName: item.systemName,
        systemShortName: item.systemShortName,
        category: item.category,
        systemUrl: item.systemUrl,
        unit: item.unit,
        businessDept: item.businessDept,
        contacts: [],
      };
      map.set(item.systemName, group);
    }
    group.contacts.push(item);
  }
  return [...map.values()];
}

export default function ContactsPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { message, modal } = AntdApp.useApp();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [form] = Form.useForm<ContactFormValues>();
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<string | undefined>();
  const [modalOpen, setModalOpen] = useState(() => searchParams.get('new') === '1');
  const [editing, setEditing] = useState<ContactItem | null>(null);
  const [activeKeys, setActiveKeys] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const isAdmin = user?.role === Role.ADMIN;

  const listQuery = useQuery({
    queryKey: ['contacts', { keyword, category }],
    queryFn: () => fetchContacts({ q: keyword || undefined, category }),
  });

  const groups = useMemo(() => groupContacts(listQuery.data?.items ?? []), [listQuery.data]);
  const totalContacts = listQuery.data?.items.length ?? 0;
  const groupsPage = useMemo(() => {
    const start = (page - 1) * pageSize;
    return groups.slice(start, start + pageSize);
  }, [groups, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [keyword, category]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(groups.length / pageSize));
    if (page > maxPage) setPage(maxPage);
  }, [groups.length, page, pageSize]);

  useEffect(() => {
    if (keyword) setActiveKeys(groups.map((group) => group.key));
  }, [groups, keyword]);

  const roleOptions = [
    t('contacts.roleFrontend'),
    t('contacts.roleBackend'),
    t('contacts.roleLead'),
    t('contacts.roleBusiness'),
    t('contacts.roleContact'),
  ].map((value) => ({ value }));

  const createMutation = useMutation({
    mutationFn: (values: ContactFormValues) => createContact(values),
    onSuccess: () => {
      message.success(t('contacts.created'));
      closeModal();
      void queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ContactFormValues }) =>
      updateContact(id, values),
    onSuccess: () => {
      message.success(t('contacts.updated'));
      closeModal();
      void queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteContact(id),
    onSuccess: () => {
      message.success(t('contacts.deleted'));
      void queryClient.invalidateQueries({ queryKey: ['contacts'] });
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

  const openCreate = (group?: ContactGroup) => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      role: t('contacts.roleContact'),
      sortOrder: 0,
      ...(group
        ? {
            systemName: group.systemName,
            systemShortName: group.systemShortName ?? undefined,
            category: group.category ?? undefined,
            systemUrl: group.systemUrl ?? undefined,
            unit: group.unit ?? undefined,
            businessDept: group.businessDept ?? undefined,
          }
        : {}),
    });
    setModalOpen(true);
  };

  const openEdit = (item: ContactItem) => {
    setEditing(item);
    form.setFieldsValue({
      name: item.name,
      role: item.role,
      systemName: item.systemName,
      systemShortName: item.systemShortName ?? undefined,
      category: item.category ?? undefined,
      systemUrl: item.systemUrl ?? undefined,
      unit: item.unit ?? undefined,
      businessDept: item.businessDept ?? undefined,
      landline: item.landline ?? undefined,
      mobile: item.mobile ?? undefined,
      email: item.email ?? undefined,
      notes: item.notes ?? undefined,
      sortOrder: item.sortOrder,
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

  const confirmDelete = (item: ContactItem) => {
    modal.confirm({
      title: t('contacts.deleteConfirm'),
      content: t('contacts.deleteContent'),
      okText: t('contacts.delete'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutateAsync(item.id),
    });
  };

  const copyValue = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      message.success(t('common.copySuccess'));
    } catch {
      message.error(t('common.copyFailed'));
    }
  };

  return (
    <div className="page-stack">
      <div className="page-head">
        <div className="page-head-title">
          <span className="page-title-icon">
            <ContactsOutlined />
          </span>
          <h1 className="page-title">{t('contacts.title')}</h1>
        </div>

        <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreate()}>
          {t('contacts.new')}
        </Button>
      </div>

      <section className="panel">
        <div className="filter-bar">
          <Input.Search
            allowClear
            value={keywordInput}
            placeholder={t('contacts.searchPlaceholder')}
            enterButton={t('common.search')}
            onChange={(event) => {
              setKeywordInput(event.target.value);
              if (!event.target.value) setKeyword('');
            }}
            onSearch={(value) => setKeyword(value.trim())}
            className="filter-search"
          />

          <Select
            allowClear
            placeholder={t('contacts.allCategories')}
            value={category}
            options={(listQuery.data?.categories ?? []).map((value) => ({ value }))}
            onChange={setCategory}
            className="filter-select filter-select-wide"
          />

          <span className="text-muted contacts-summary">
            {t('contacts.summary', {
              systems: groups.length,
              contacts: totalContacts,
            })}
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
            message={t('contacts.loadError')}
            description={getErrorMessage(listQuery.error)}
            action={
              <Button size="small" onClick={() => void listQuery.refetch()}>
                {t('common.retry')}
              </Button>
            }
            className="section-alert"
          />
        )}

        {groups.length === 0 && !listQuery.isLoading ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('contacts.empty')}>
            <Button type="primary" size="small" onClick={() => openCreate()}>
              {t('contacts.new')}
            </Button>
          </Empty>
        ) : (
          <Collapse
            className="contact-collapse"
            activeKey={activeKeys}
            onChange={(keys) => setActiveKeys((Array.isArray(keys) ? keys : [keys]).map(String))}
            items={groupsPage.map((group) => ({
              key: group.key,
              label: (
                <div className="contact-system-header">
                  <span className="contact-system-avatar">{group.systemName.slice(0, 1)}</span>
                  <div className="contact-system-title">
                    <div className="contact-system-name">
                      <strong>{group.systemName}</strong>
                      {group.systemShortName && (
                        <span className="contact-short">{group.systemShortName}</span>
                      )}
                    </div>
                    <div className="contact-system-meta">
                      {group.category && (
                        <Tag className={toneClass('neutral')} bordered={false}>
                          {group.category}
                        </Tag>
                      )}
                      <span className="contact-count">
                        {t('contacts.contactCount', { count: group.contacts.length })}
                      </span>
                      {group.unit && <span className="contact-unit">{group.unit}</span>}
                    </div>
                  </div>
                  <div
                    className="contact-system-actions"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {isHttpUrl(group.systemUrl) && (
                      <a
                        href={group.systemUrl as string}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="contact-system-link"
                        title={t('contacts.openSystem')}
                      >
                        <ExportOutlined />
                      </a>
                    )}
                    <Button size="small" icon={<PlusOutlined />} onClick={() => openCreate(group)}>
                      {t('contacts.addContact')}
                    </Button>
                  </div>
                </div>
              ),
              children: (
                <div className="contact-person-list">
                  {group.contacts.map((contact) => (
                    <div className="contact-person" key={contact.id}>
                      <div className="contact-person-main">
                        <div className="contact-person-title">
                          <strong>{contact.name}</strong>
                          {contact.role
                            .split(/\s+\/\s+/)
                            .filter(Boolean)
                            .map((role) => (
                              <Tag key={role} className={toneClass('primary')} bordered={false}>
                                {role}
                              </Tag>
                            ))}
                        </div>

                        <div className="contact-person-meta">
                          {contact.mobile && (
                            <span className="contact-phone">
                              <PhoneOutlined />
                              <a href={`tel:${firstPhone(contact.mobile).replace(/[^\d+]/g, '')}`}>
                                {contact.mobile}
                              </a>
                              <Button
                                type="text"
                                size="small"
                                icon={<CopyOutlined />}
                                onClick={() => void copyValue(contact.mobile as string)}
                                aria-label={t('contacts.copyMobile')}
                              />
                            </span>
                          )}
                          {contact.landline && (
                            <span className="contact-phone">
                              <PhoneOutlined />
                              <a
                                href={`tel:${firstPhone(contact.landline).replace(/[^\d+]/g, '')}`}
                              >
                                {contact.landline}
                              </a>
                              <Button
                                type="text"
                                size="small"
                                icon={<CopyOutlined />}
                                onClick={() => void copyValue(contact.landline as string)}
                                aria-label={t('contacts.copyLandline')}
                              />
                            </span>
                          )}
                          {contact.email && (
                            <span className="contact-phone">
                              <MailOutlined />
                              <a href={`mailto:${contact.email}`}>{contact.email}</a>
                            </span>
                          )}
                        </div>

                        {(contact.unit || contact.businessDept || contact.notes) && (
                          <div className="contact-person-org">
                            {contact.unit && <span>{contact.unit}</span>}
                            {contact.businessDept && <span>{contact.businessDept}</span>}
                            {contact.notes && <span>{contact.notes}</span>}
                          </div>
                        )}
                      </div>

                      <Space size={0} className="contact-person-actions">
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => openEdit(contact)}
                          aria-label={t('contacts.edit')}
                        />
                        {isAdmin && (
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => confirmDelete(contact)}
                            aria-label={t('contacts.delete')}
                          />
                        )}
                      </Space>
                    </div>
                  ))}
                </div>
              ),
            }))}
          />
        )}

        {groups.length > pageSize && (
          <div className="contact-pagination">
            <Pagination
              current={page}
              pageSize={pageSize}
              total={groups.length}
              showSizeChanger
              pageSizeOptions={[10, 20, 50]}
              showTotal={(total) => t('contacts.systemPageTotal', { count: total })}
              onChange={(nextPage, nextSize) => {
                setPage(nextSize !== pageSize ? 1 : nextPage);
                setPageSize(nextSize);
              }}
            />
          </div>
        )}
      </section>

      <Modal
        title={editing ? t('contacts.editTitle') : t('contacts.newTitle')}
        open={modalOpen}
        onCancel={closeModal}
        onOk={() => void submitForm()}
        okText={t('contacts.save')}
        cancelText={t('common.cancel')}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        destroyOnClose
        width={680}
      >
        <Form<ContactFormValues>
          form={form}
          layout="vertical"
          requiredMark={false}
          initialValues={{ role: t('contacts.roleContact'), sortOrder: 0 }}
        >
          <Form.Item
            name="systemName"
            label={t('contacts.systemName')}
            rules={[{ required: true, message: t('contacts.requiredSystem') }]}
          >
            <AutoComplete
              options={(listQuery.data?.systems ?? []).map((value) => ({ value }))}
              placeholder={t('contacts.systemPlaceholder')}
            />
          </Form.Item>

          <div className="contact-form-row">
            <Form.Item name="systemShortName" label={t('contacts.systemShortName')}>
              <Input maxLength={100} />
            </Form.Item>
            <Form.Item name="category" label={t('contacts.category')}>
              <AutoComplete
                options={(listQuery.data?.categories ?? []).map((value) => ({ value }))}
                placeholder={t('contacts.categoryPlaceholder')}
              />
            </Form.Item>
          </div>

          <div className="contact-form-row">
            <Form.Item
              name="name"
              label={t('contacts.name')}
              rules={[{ required: true, message: t('contacts.requiredName') }]}
            >
              <Input maxLength={100} />
            </Form.Item>
            <Form.Item name="role" label={t('contacts.role')}>
              <AutoComplete options={roleOptions} placeholder={t('contacts.rolePlaceholder')} />
            </Form.Item>
          </div>

          <div className="contact-form-row">
            <Form.Item name="mobile" label={t('contacts.mobile')}>
              <Input maxLength={200} />
            </Form.Item>
            <Form.Item name="landline" label={t('contacts.landline')}>
              <Input maxLength={200} />
            </Form.Item>
          </div>

          <Form.Item name="email" label={t('contacts.email')}>
            <Input maxLength={200} />
          </Form.Item>

          <div className="contact-form-row">
            <Form.Item name="unit" label={t('contacts.unit')}>
              <Input maxLength={200} />
            </Form.Item>
            <Form.Item name="businessDept" label={t('contacts.businessDept')}>
              <Input maxLength={200} />
            </Form.Item>
          </div>

          <Form.Item name="systemUrl" label={t('contacts.systemUrl')}>
            <Input maxLength={1000} />
          </Form.Item>

          <Form.Item name="notes" label={t('contacts.notes')}>
            <Input.TextArea rows={2} maxLength={5000} />
          </Form.Item>

          <Form.Item name="sortOrder" label={t('contacts.sortOrder')}>
            <InputNumber min={0} max={9999} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
