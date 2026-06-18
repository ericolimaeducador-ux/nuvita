import {
  Card,
  Descriptions,
  Tag,
  Button,
  Tabs,
  Table,
  Skeleton,
  Result,
  Avatar,
  Space,
} from 'antd';
import {
  ArrowLeftOutlined,
  UserOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { pacientesApi, prontuariosApi, agendaApi } from '@/api/resources';
import { formatCpf, idade, toItems } from '@/utils';
import {
  SEXO_LABEL,
  STATUS_AGENDAMENTO_COLOR,
  STATUS_AGENDAMENTO_LABEL,
  type Agendamento,
  type Prontuario,
  type Sexo,
} from '@/types';

export function PacienteDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const pacQ = useQuery({
    queryKey: ['paciente', id],
    queryFn: () => pacientesApi.get(id),
    enabled: !!id,
  });
  const prontQ = useQuery({
    queryKey: ['prontuarios', 'paciente', id],
    queryFn: () => prontuariosApi.list({ pacienteId: id }),
    enabled: !!id,
  });
  const agendaQ = useQuery({
    queryKey: ['agenda', 'paciente', id],
    queryFn: () => agendaApi.list({ pacienteId: id }),
    enabled: !!id,
  });

  if (pacQ.isLoading) return <Skeleton active />;
  if (pacQ.isError || !pacQ.data)
    return (
      <Result
        status="404"
        title="Paciente não encontrado"
        extra={
          <Button type="primary" onClick={() => navigate('/pacientes')}>
            Voltar
          </Button>
        }
      />
    );

  const p = pacQ.data;

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/pacientes')}>
          Voltar
        </Button>
      </Space>

      <Card variant="borderless" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Avatar size={64} style={{ background: '#0d6e9e' }} icon={<UserOutlined />} />
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0 }}>{p.nome}</h2>
            <Space size="large" style={{ color: '#64748b' }}>
              <span>{formatCpf(p.cpf)}</span>
              <span>{idade(p.dataNascimento)}</span>
              {p.ativo === false ? (
                <Tag color="default">Inativo</Tag>
              ) : (
                <Tag color="green">Ativo</Tag>
              )}
            </Space>
          </div>
          <Button
            icon={<ExportOutlined />}
            onClick={() => pacientesApi.export(p.id)}
          >
            Exportar (LGPD)
          </Button>
        </div>
      </Card>

      <Card variant="borderless">
        <Tabs
          items={[
            {
              key: 'dados',
              label: 'Dados cadastrais',
              children: (
                <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
                  <Descriptions.Item label="Nome">{p.nome}</Descriptions.Item>
                  <Descriptions.Item label="CPF">{formatCpf(p.cpf)}</Descriptions.Item>
                  <Descriptions.Item label="Nascimento">
                    {p.dataNascimento
                      ? dayjs(p.dataNascimento).format('DD/MM/YYYY')
                      : '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Sexo">
                    {p.sexo ? SEXO_LABEL[p.sexo as Sexo] : '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Telefone">
                    {p.telefone || '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="E-mail">
                    {p.email || '—'}
                  </Descriptions.Item>
                </Descriptions>
              ),
            },
            {
              key: 'prontuarios',
              label: 'Prontuários',
              children: (
                <Table<Prontuario>
                  rowKey="id"
                  size="small"
                  loading={prontQ.isLoading}
                  dataSource={toItems<Prontuario>(prontQ.data as never)}
                  pagination={false}
                  columns={[
                    {
                      title: 'Data',
                      dataIndex: 'dataAtendimento',
                      render: (v) => (v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '—'),
                    },
                    { title: 'Tipo', dataIndex: 'tipo' },
                    {
                      title: 'Assinado',
                      dataIndex: 'assinado',
                      render: (v) =>
                        v ? <Tag color="green">Sim</Tag> : <Tag>Rascunho</Tag>,
                    },
                  ]}
                />
              ),
            },
            {
              key: 'agenda',
              label: 'Histórico de agenda',
              children: (
                <Table<Agendamento>
                  rowKey="id"
                  size="small"
                  loading={agendaQ.isLoading}
                  dataSource={toItems<Agendamento>(agendaQ.data as never)}
                  pagination={false}
                  columns={[
                    {
                      title: 'Início',
                      dataIndex: 'dataHoraInicio',
                      render: (v) => dayjs(v).format('DD/MM/YYYY HH:mm'),
                    },
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
              ),
            },
          ]}
        />
      </Card>
    </>
  );
}
