import { useMemo, useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Breadcrumb, Badge, Grid } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  CalendarOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  BellOutlined,
  BankOutlined,
  DollarOutlined,
  VideoCameraOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { Papel, PAPEL_LABEL } from '@/types';

const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;

interface NavItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  roles?: Papel[];
}

const NAV: NavItem[] = [
  { key: '/', icon: <DashboardOutlined />, label: 'Visão geral' },
  { key: '/pacientes', icon: <TeamOutlined />, label: 'Pacientes' },
  { key: '/agenda', icon: <CalendarOutlined />, label: 'Agenda' },
  { key: '/prontuarios', icon: <FileTextOutlined />, label: 'Prontuários' },
  { key: '/documentos', icon: <FolderOpenOutlined />, label: 'Documentos' },
  { key: '/notificacoes', icon: <BellOutlined />, label: 'Notificações' },
  {
    key: '/financeiro',
    icon: <DollarOutlined />,
    label: 'Financeiro',
    roles: [Papel.SECRETARIA, Papel.ADMIN],
  },
  {
    key: '/telemedicina',
    icon: <VideoCameraOutlined />,
    label: 'Telemedicina',
    roles: [Papel.MEDICO, Papel.ENFERMEIRO, Papel.ADVOGADO, Papel.ADMIN],
  },
  { key: '/clinica', icon: <BankOutlined />, label: 'Clínica', roles: [Papel.ADMIN] },
];

const LABELS: Record<string, string> = {
  '': 'Visão geral',
  pacientes: 'Pacientes',
  agenda: 'Agenda',
  prontuarios: 'Prontuários',
  documentos: 'Documentos',
  notificacoes: 'Notificações',
  financeiro: 'Financeiro',
  telemedicina: 'Telemedicina',
  clinica: 'Clínica',
};

export function AppLayout() {
  const screens = useBreakpoint();
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const items = useMemo(
    () =>
      NAV.filter((n) => !n.roles || (user && n.roles.includes(user.papel))).map(
        (n) => ({ key: n.key, icon: n.icon, label: n.label }),
      ),
    [user],
  );

  const selectedKey =
    '/' +
    (location.pathname.split('/')[1] === ''
      ? ''
      : location.pathname.split('/')[1]);

  const crumbs = location.pathname
    .split('/')
    .filter((_, i) => i > 0)
    .map((seg) => LABELS[seg] ?? seg)
    .filter(Boolean);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        trigger={null}
        breakpoint="lg"
        collapsedWidth={screens.lg ? 80 : 0}
        onBreakpoint={(broken) => setCollapsed(broken)}
        width={232}
      >
        <div className="app-logo">
          <span className="brand-mark">N</span>
          {!collapsed && <span>Nuvita</span>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey === '/' ? '/' : selectedKey]}
          items={items}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <div
            style={{ cursor: 'pointer', fontSize: 18, color: '#475569' }}
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <Badge count={0} showZero={false}>
              <BellOutlined style={{ fontSize: 18, color: '#64748b' }} />
            </Badge>
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'role',
                    disabled: true,
                    label: user ? PAPEL_LABEL[user.papel] : '',
                  },
                  { type: 'divider' },
                  {
                    key: 'logout',
                    icon: <LogoutOutlined />,
                    label: 'Sair',
                    onClick: () => {
                      void logout().then(() => navigate('/login'));
                    },
                  },
                ],
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                }}
              >
                <Avatar
                  size={32}
                  style={{ background: '#0d6e9e' }}
                  icon={<UserOutlined />}
                />
                <div style={{ lineHeight: 1.1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>
                    {user?.nome ?? user?.email}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                    {user ? PAPEL_LABEL[user.papel] : ''}
                  </div>
                </div>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content style={{ margin: 0, padding: '20px 24px' }}>
          {crumbs.length > 0 && (
            <Breadcrumb
              style={{ marginBottom: 14 }}
              items={[{ title: 'Nuvita' }, ...crumbs.map((c) => ({ title: c }))]}
            />
          )}
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

export const QuickAddIcon = PlusOutlined;
