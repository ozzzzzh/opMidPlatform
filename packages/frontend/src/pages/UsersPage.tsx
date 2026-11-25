import {
  EditOutlined,
  ReloadOutlined,
  SearchOutlined,
  StopOutlined,
  TeamOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App as AntdApp,
  Badge,
  Button,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  type TableColumnsType,
} from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { Role, type AuthUser } from '@it-ops/shared';
import { getErrorMessage } from '@/api/client';
import {
  createUser,
  deactivateUser,
  fetchUsers,
  updateUser,
  type CreateUserPayload,
  type UpdateUserPayload,
} from '@/api/users';
import { useAuth } from '@/auth/AuthContext';
import { ROLE_TONES, toneClass } from '@/components/tones';
import { useI18n } from '@/i18n/I18nContext';
import { useLabels } from '@/i18n/useLabels';

interface UserFormValues {
  username?: string;
  displayName: string;
  email?: string;
  password?: string;
  role: Role;
  active: boolean;
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { t } = useI18n();
  const labels = useLabels();
  const { message, modal } = AntdApp.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<UserFormValues>();

  const [keyword, setKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | undefined>();
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AuthUser | null>(null);

  const usersQuery = useQuery({
    queryKey: ['users', { page, pageSize, keyword, role: roleFilter, active: activeFilter }],
    queryFn: () =>
      fetchUsers({
        page,
        pageSize,
        keyword: keyword || undefined,
        role: roleFilter,
        active: activeFilter,
      }),
    placeholderData: (previous) => previous,
  });

  const saveMutation = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id?: string;
      values: UserFormValues;
    }): Promise<AuthUser> => {
      const email = values.email?.trim() || null;

      if (id) {
        const payload: UpdateUserPayload = {
          displayName: values.displayName,
          email,
          role: values.role,
          active: values.active,
        };
        if (values.password) payload.password = values.password;
        return updateUser(id, payload);
      }

      const payload: CreateUserPayload = {
        username: values.username?.trim() ?? '',
        displayName: values.displayName,
        email,
        password: values.password ?? '',
        role: values.role,
        active: values.active,
      };
      return createUser(payload);
    },
    onSuccess: () => {
      message.success(editing ? t('users.updated') : t('users.created'));
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      void queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: (error) => {
      message.error(getErrorMessage(error));
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateUser,
    onSuccess: () => {
      message.success(t('users.deactivated'));
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      void queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: (error) => {
      message.error(getErrorMessage(error));
    },
  });

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ role: Role.USER, active: true });
    setOpen(true);
  };

  const openEdit = (record: AuthUser) => {
    setEditing(record);
    form.resetFields();
    form.setFieldsValue({
      username: record.username,
      displayName: record.displayName,
      email: record.email ?? undefined,
      role: record.role,
      active: record.active,
    });
    setOpen(true);
  };

  const confirmDeactivate = (record: AuthUser) => {
    modal.confirm({
      title: t('users.deactivateTitle', { name: record.displayName }),
      content: t('users.deactivateContent'),
      okText: t('users.confirmDeactivate'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: () => deactivateMutation.mutateAsync(record.id),
    });
  };

  const resetFilters = () => {
    setKeyword('');
    setRoleFilter(undefined);
    setActiveFilter(undefined);
    setPage(1);
  };

  const canManageAdmins = currentUser?.role === Role.ADMIN;
  const roleOptions = [
    { value: Role.USER, label: labels.role(Role.USER) },
    { value: Role.OPS, label: labels.role(Role.OPS) },
    ...(canManageAdmins ? [{ value: Role.ADMIN, label: labels.role(Role.ADMIN) }] : []),
  ];
  const roleFilterOptions = Object.values(Role).map((role) => ({
    value: role,
    label: labels.role(role),
  }));

  const columns: TableColumnsType<AuthUser> = [
    {
      title: t('users.columnUsername'),
      dataIndex: 'username',
      key: 'username',
      width: 150,
      render: (value: string, record) => (
        <Space size={6}>
          <strong>{value}</strong>
          {record.id === currentUser?.id && (
            <Tag className={toneClass('primary')} bordered={false}>
              {t('users.current')}
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: t('users.columnDisplayName'),
      dataIndex: 'displayName',
      key: 'displayName',
      width: 150,
    },
    {
      title: t('users.columnEmail'),
      dataIndex: 'email',
      key: 'email',
      ellipsis: true,
      render: (value: string | null) => value || <span className="muted">—</span>,
    },
    {
      title: t('users.columnRole'),
      dataIndex: 'role',
      key: 'role',
      width: 110,
      render: (role: Role) => (
        <Tag className={toneClass(ROLE_TONES[role])} bordered={false}>
          {labels.role(role)}
        </Tag>
      ),
    },
    {
      title: t('users.columnStatus'),
      dataIndex: 'active',
      key: 'active',
      width: 100,
      render: (active: boolean) =>
        active ? (
          <Badge status="success" text={t('users.enabled')} />
        ) : (
          <Badge status="default" text={t('users.disabled')} />
        ),
    },
    {
      title: t('users.columnLastLogin'),
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      width: 170,
      render: (value: string | null) =>
        value ? (
          dayjs(value).format('YYYY-MM-DD HH:mm')
        ) : (
          <span className="muted">{t('users.neverLogin')}</span>
        ),
    },
    {
      title: t('users.columnCreatedAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: t('users.columnActions'),
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => {
        const isSelf = record.id === currentUser?.id;
        const opsEditingAdmin = currentUser?.role === Role.OPS && record.role === Role.ADMIN;

        return (
          <Space size={4}>
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(record)}
              disabled={opsEditingAdmin}
            >
              {t('users.edit')}
            </Button>
            {record.active && !isSelf && !opsEditingAdmin && (
              <Tooltip title={t('users.deactivateHint')}>
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<StopOutlined />}
                  loading={deactivateMutation.isPending}
                  onClick={() => confirmDeactivate(record)}
                >
                  {t('users.deactivate')}
                </Button>
              </Tooltip>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div className="page-stack">
      <div className="page-head">
        <div className="page-head-title">
          <span className="page-title-icon">
            <TeamOutlined />
          </span>
          <h1 className="page-title">{t('users.title')}</h1>
        </div>
        <Button type="primary" icon={<UserAddOutlined />} onClick={openCreate}>
          {t('users.new')}
        </Button>
      </div>

      <section className="panel">
        <Row gutter={[12, 12]} align="middle" className="filter-row">
          <Col xs={24} md={9} lg={8}>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder={t('users.searchPlaceholder')}
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value);
                setPage(1);
              }}
            />
          </Col>
          <Col xs={12} md={5} lg={4}>
            <Select<Role>
              allowClear
              placeholder={t('users.allRoles')}
              value={roleFilter}
              options={roleFilterOptions}
              onChange={(value) => {
                setRoleFilter(value);
                setPage(1);
              }}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={12} md={5} lg={4}>
            <Select
              allowClear
              placeholder={t('users.allStatus')}
              value={activeFilter === undefined ? undefined : String(activeFilter)}
              options={[
                { value: 'true', label: t('users.enabled') },
                { value: 'false', label: t('users.disabled') },
              ]}
              onChange={(value: string | undefined) => {
                setActiveFilter(value === undefined ? undefined : value === 'true');
                setPage(1);
              }}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} md={5} lg={8}>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={resetFilters}>
                {t('users.reset')}
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => void usersQuery.refetch()}
                loading={usersQuery.isFetching}
              >
                {t('users.refresh')}
              </Button>
            </Space>
          </Col>
        </Row>

        {usersQuery.isError && (
          <Alert
            type="error"
            showIcon
            className="page-alert"
            message={t('users.loadError')}
            description={getErrorMessage(usersQuery.error)}
            action={
              <Button size="small" onClick={() => void usersQuery.refetch()}>
                {t('common.retry')}
              </Button>
            }
          />
        )}

        <div className="table-toolbar">
          <span className="table-count">
            {t('users.count', { count: usersQuery.data?.total ?? 0 })}
          </span>
        </div>

        <Table<AuthUser>
          rowKey="id"
          columns={columns}
          dataSource={usersQuery.data?.items ?? []}
          loading={usersQuery.isLoading}
          scroll={{ x: 1100 }}
          locale={{ emptyText: t('common.noData') }}
          rowClassName={(record) => (!record.active ? 'table-row-disabled' : '')}
          pagination={{
            current: page,
            pageSize,
            total: usersQuery.data?.total ?? 0,
            showSizeChanger: true,
            showTotal: (total) => t('common.total', { count: total }),
            pageSizeOptions: [10, 20, 50, 100],
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPageSize !== pageSize ? 1 : nextPage);
              setPageSize(nextPageSize);
            },
          }}
        />
      </section>

      <Modal
        title={editing ? t('users.editTitle') : t('users.newTitle')}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        okText={editing ? t('users.save') : t('users.create')}
        cancelText={t('common.cancel')}
        confirmLoading={saveMutation.isPending}
        forceRender
        width={560}
        afterClose={() => {
          setEditing(null);
          form.resetFields();
        }}
      >
        <Form<UserFormValues>
          form={form}
          layout="vertical"
          onFinish={(values) => saveMutation.mutate({ id: editing?.id, values })}
          requiredMark="optional"
          className="user-form"
        >
          {!editing && (
            <Form.Item
              label={t('users.username')}
              name="username"
              rules={[
                { required: true, message: t('users.requiredUsername') },
                { min: 3, max: 32, message: t('users.usernameLength') },
                {
                  pattern: /^[a-zA-Z0-9._-]+$/,
                  message: t('users.invalidUsername'),
                },
              ]}
            >
              <Input placeholder={t('users.usernamePlaceholder')} autoComplete="off" />
            </Form.Item>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={t('users.displayName')}
                name="displayName"
                rules={[{ required: true, message: t('users.requiredDisplayName') }]}
              >
                <Input placeholder={t('users.displayNamePlaceholder')} maxLength={64} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={t('users.role')}
                name="role"
                rules={[{ required: true, message: t('users.requiredRole') }]}
              >
                <Select<Role> options={roleOptions} disabled={editing?.id === currentUser?.id} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label={t('users.email')}
            name="email"
            rules={[{ type: 'email', message: t('users.invalidEmail') }]}
          >
            <Input placeholder={t('users.emailPlaceholder')} maxLength={128} />
          </Form.Item>

          <Form.Item
            label={editing ? t('users.resetPassword') : t('users.newPassword')}
            name="password"
            extra={editing ? t('users.passwordEditHint') : t('users.passwordHint')}
            rules={[
              ...(!editing ? [{ required: true, message: t('users.requiredPassword') }] : []),
              {
                validator: async (_rule, value: string | undefined) => {
                  if (!value) return;
                  if (value.length < 8) {
                    throw new Error(t('users.passwordMin'));
                  }
                  if (!/^(?=.*[A-Za-z])(?=.*\d).+$/.test(value)) {
                    throw new Error(t('users.passwordPattern'));
                  }
                },
              },
            ]}
          >
            <Input.Password
              placeholder={
                editing ? t('users.passwordEditPlaceholder') : t('users.passwordPlaceholder')
              }
              autoComplete="new-password"
              maxLength={72}
            />
          </Form.Item>

          <Form.Item
            label={t('users.active')}
            name="active"
            valuePropName="checked"
            extra={t('users.activeHint')}
          >
            <Switch
              checkedChildren={t('users.enabled')}
              unCheckedChildren={t('users.disabled')}
              disabled={editing?.id === currentUser?.id}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
