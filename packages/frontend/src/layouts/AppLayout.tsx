import {
  AppstoreOutlined,
  BarChartOutlined,
  DashboardOutlined,
  BookOutlined,
  ContactsOutlined,
  DownOutlined,
  FileTextOutlined,
  FireFilled,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Avatar, Button, Dropdown, Layout, Menu, type MenuProps } from 'antd';
import { useMemo, useState, type ReactNode } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Priority, Role } from '@it-ops/shared';
import { fetchTickets } from '@/api/tickets';
import { useAuth } from '@/auth/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import LanguageSwitcher from '@/i18n/LanguageSwitcher';
import type { TranslationKey } from '@/i18n/messages';
import { useLabels } from '@/i18n/useLabels';

const { Header, Sider, Content } = Layout;

interface NavItem {
  key: string;
  labelKey: TranslationKey;
  icon: ReactNode;
  roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
  {
    key: '/dashboard',
    labelKey: 'nav.dashboard',
    icon: <DashboardOutlined />,
    roles: [Role.ADMIN, Role.OPS],
  },
  {
    key: '/tickets',
    labelKey: 'nav.tickets',
    icon: <FileTextOutlined />,
    roles: [Role.ADMIN, Role.OPS, Role.USER],
  },
  {
    key: '/knowledge',
    labelKey: 'nav.knowledge',
    icon: <BookOutlined />,
    roles: [Role.ADMIN, Role.OPS],
  },
  {
    key: '/subsystems',
    labelKey: 'nav.subsystems',
    icon: <AppstoreOutlined />,
    roles: [Role.ADMIN, Role.OPS],
  },
  {
    key: '/contacts',
    labelKey: 'nav.contacts',
    icon: <ContactsOutlined />,
    roles: [Role.ADMIN, Role.OPS],
  },
  {
    key: '/admin/users',
    labelKey: 'nav.users',
    icon: <TeamOutlined />,
    roles: [Role.ADMIN, Role.OPS],
  },
  {
    key: '/dashboard/audit',
    labelKey: 'nav.audit',
    icon: <BarChartOutlined />,
    roles: [Role.ADMIN, Role.OPS],
  },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const labels = useLabels();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = useMemo(
    () => NAV_ITEMS.filter((item) => (user ? item.roles.includes(user.role) : false)),
    [user],
  );

  const superUrgentQuery = useQuery({
    queryKey: ['tickets', 'super-urgent'],
    queryFn: () => fetchTickets({ page: 1, pageSize: 1, priority: Priority.SUPER_URGENT }),
    enabled: Boolean(user),
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 0,
  });

  const hasActiveSuperUrgent =
    (superUrgentQuery.data?.summary.open ?? 0) + (superUrgentQuery.data?.summary.claimed ?? 0) > 0;

  const selectedKey =
    [...navItems]
      .sort((a, b) => b.key.length - a.key.length)
      .find(
        (item) => location.pathname === item.key || location.pathname.startsWith(`${item.key}/`),
      )?.key ?? '/tickets';

  const userMenu: MenuProps['items'] = [
    {
      key: 'summary',
      disabled: true,
      label: (
        <div className="user-summary">
          <strong>{user?.displayName}</strong>
          <span>
            @{user?.username} · {user ? labels.role(user.role) : ''}
          </span>
        </div>
      ),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('nav.logout'),
      danger: true,
    },
  ];

  const handleUserMenu: MenuProps['onClick'] = async ({ key }) => {
    if (key !== 'logout') return;
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <Layout className="app-shell">
      <Sider
        width={208}
        collapsedWidth={64}
        collapsible
        collapsed={collapsed}
        trigger={null}
        breakpoint="lg"
        onBreakpoint={(broken) => setCollapsed(broken)}
        className="app-sider"
      >
        <button type="button" className="brand" onClick={() => navigate('/tickets')}>
          <span className="brand-mark">IT</span>
          {!collapsed && <span className="brand-name">{t('layout.brandName')}</span>}
        </button>

        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={navItems.map((item) => ({
            key: item.key,
            icon: item.icon,
            label:
              item.key === '/tickets' && hasActiveSuperUrgent ? (
                <span className="menu-fire-label">
                  {t(item.labelKey)}
                  <FireFilled className="fire-icon" />
                </span>
              ) : (
                t(item.labelKey)
              ),
          }))}
          onClick={({ key }) => navigate(key)}
          className="app-menu"
        />
      </Sider>

      <Layout>
        <Header className="app-header">
          <Button
            type="text"
            className="header-toggle"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? t('layout.expandMenu') : t('layout.collapseMenu')}
          />

          <div className="header-actions">
            <LanguageSwitcher />
            <Dropdown
              menu={{ items: userMenu, onClick: handleUserMenu }}
              placement="bottomRight"
              trigger={['click']}
            >
              <button type="button" className="header-user">
                <Avatar size={30} className="header-avatar">
                  {user?.displayName?.slice(0, 1) ?? 'U'}
                </Avatar>
                <span className="header-user-name">{user?.displayName}</span>
                <DownOutlined className="header-user-arrow" />
              </button>
            </Dropdown>
          </div>
        </Header>

        <Content className="app-content">
          <main className="content-inner">
            <Outlet />
          </main>
        </Content>
      </Layout>
    </Layout>
  );
}
