import { Card, Col, Row, Statistic, Skeleton, Alert, Empty, Table } from 'antd';
import {
  SendOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { notificacoesApi } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';

interface DashboardData {
  enviadas?: number;
  entregues?: number;
  pendentes?: number;
  falhas?: number;
  recentes?: Array<Record<string, unknown>>;
  [k: string]: unknown;
}

export function NotificacoesPage() {
  const q = useQuery({
    queryKey: ['notificacoes', 'dashboard'],
    queryFn: () => notificacoesApi.dashboard() as Promise<DashboardData>,
  });

  const d = q.data ?? {};

  const cards = [
    {
      title: 'Enviadas',
      value: d.enviadas ?? 0,
      icon: <SendOutlined style={{ color: '#0d6e9e' }} />,
    },
    {
      title: 'Entregues',
      value: d.entregues ?? 0,
      icon: <CheckCircleOutlined style={{ color: '#16a34a' }} />,
    },
    {
      title: 'Pendentes',
      value: d.pendentes ?? 0,
      icon: <ClockCircleOutlined style={{ color: '#d97706' }} />,
    },
    {
      title: 'Falhas',
      value: d.falhas ?? 0,
      icon: <CloseCircleOutlined style={{ color: '#dc2626' }} />,
    },
  ];

  const recentes = Array.isArray(d.recentes) ? d.recentes : [];

  return (
    <>
      <PageHeader
        title="Notificações"
        subtitle="Lembretes e comunicações automáticas (fila de processamento)"
      />

      {q.isError && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="Não foi possível carregar o painel de notificações."
          description={apiErrorMessage(q.error)}
        />
      )}

      {q.isLoading ? (
        <Skeleton active />
      ) : (
        <Row gutter={[16, 16]}>
          {cards.map((c) => (
            <Col xs={24} sm={12} xl={6} key={c.title}>
              <Card className="stat-card" variant="borderless">
                <Statistic title={c.title} value={c.value} prefix={c.icon} />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Card title="Envios recentes" style={{ marginTop: 16 }} variant="borderless">
        {recentes.length === 0 ? (
          <Empty description="Sem envios recentes" />
        ) : (
          <Table
            rowKey={(r: Record<string, unknown>) => String(r.id ?? Math.random())}
            dataSource={recentes}
            pagination={false}
            columns={[
              { title: 'Canal', dataIndex: 'canal' },
              { title: 'Destino', dataIndex: 'destino' },
              { title: 'Status', dataIndex: 'status' },
            ]}
          />
        )}
      </Card>
    </>
  );
}
