import { Card, Col, Row, Statistic, Table, Tag, Empty, Skeleton } from 'antd';
import {
  TeamOutlined,
  CalendarOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { agendaApi, pacientesApi } from '@/api/resources';
import { toItems } from '@/utils';
import { useAuth } from '@/auth/AuthContext';
import {
  StatusAgendamento,
  STATUS_AGENDAMENTO_COLOR,
  STATUS_AGENDAMENTO_LABEL,
  TIPO_AGENDAMENTO_LABEL,
  type Agendamento,
} from '@/types';

export function DashboardPage() {
  const { user } = useAuth();

  const hojeIni = dayjs().startOf('day').toISOString();
  const hojeFim = dayjs().endOf('day').toISOString();

  const pacientesQ = useQuery({
    queryKey: ['pacientes', 'count'],
    queryFn: () => pacientesApi.list({ limit: 1 }),
  });

  const agendaHojeQ = useQuery({
    queryKey: ['agenda', 'hoje'],
    queryFn: () => agendaApi.list({ dataInicio: hojeIni, dataFim: hojeFim }),
  });

  const agendamentos = toItems<Agendamento>(agendaHojeQ.data as never);
  const realizados = agendamentos.filter(
    (a) => a.status === StatusAgendamento.CONCLUIDO,
  ).length;
  const totalPacientes =
    (pacientesQ.data as { total?: number })?.total ??
    toItems(pacientesQ.data as never).length;

  return (
    <>
      <PageHeader
        title={`Olá, ${user?.nome ?? user?.email ?? ''}`}
        subtitle={dayjs().format('dddd, DD [de] MMMM [de] YYYY')}
      />

      <Row gutter={[16, 16]}>
        {[
          {
            title: 'Pacientes ativos',
            value: totalPacientes,
            icon: <TeamOutlined style={{ color: '#0d6e9e' }} />,
            loading: pacientesQ.isLoading,
          },
          {
            title: 'Agendamentos hoje',
            value: agendamentos.length,
            icon: <CalendarOutlined style={{ color: '#15a0a0' }} />,
            loading: agendaHojeQ.isLoading,
          },
          {
            title: 'Atendimentos realizados',
            value: realizados,
            icon: <CheckCircleOutlined style={{ color: '#16a34a' }} />,
            loading: agendaHojeQ.isLoading,
          },
          {
            title: 'Prontuários',
            value: '—',
            icon: <FileTextOutlined style={{ color: '#d97706' }} />,
            loading: false,
          },
        ].map((s) => (
          <Col xs={24} sm={12} xl={6} key={s.title}>
            <Card className="stat-card" variant="borderless">
              {s.loading ? (
                <Skeleton active paragraph={false} />
              ) : (
                <Statistic title={s.title} value={s.value} prefix={s.icon} />
              )}
            </Card>
          </Col>
        ))}
      </Row>

      <Card
        title="Agenda de hoje"
        style={{ marginTop: 16 }}
        extra={<Link to="/agenda">Ver agenda completa</Link>}
        variant="borderless"
      >
        {agendaHojeQ.isLoading ? (
          <Skeleton active />
        ) : agendamentos.length === 0 ? (
          <Empty description="Nenhum agendamento para hoje" />
        ) : (
          <Table<Agendamento>
            rowKey="id"
            size="middle"
            pagination={false}
            dataSource={agendamentos}
            columns={[
              {
                title: 'Horário',
                dataIndex: 'dataHoraInicio',
                render: (v: string, r) =>
                  `${dayjs(v).format('HH:mm')} – ${dayjs(r.dataHoraFim).format('HH:mm')}`,
                width: 140,
              },
              {
                title: 'Tipo',
                dataIndex: 'tipo',
                render: (v: keyof typeof TIPO_AGENDAMENTO_LABEL) =>
                  TIPO_AGENDAMENTO_LABEL[v] ?? v,
              },
              { title: 'Paciente', dataIndex: 'pacienteId' },
              {
                title: 'Status',
                dataIndex: 'status',
                render: (v: keyof typeof STATUS_AGENDAMENTO_LABEL) => (
                  <Tag color={STATUS_AGENDAMENTO_COLOR[v]}>
                    {STATUS_AGENDAMENTO_LABEL[v] ?? v}
                  </Tag>
                ),
              },
            ]}
          />
        )}
      </Card>
    </>
  );
}
