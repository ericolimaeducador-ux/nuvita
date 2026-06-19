import { useState } from 'react';
import {
  Card,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  Descriptions,
  Alert,
  Space,
  App,
  Typography,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  CopyOutlined,
  PoweroffOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { PageHeader } from '@/components/PageHeader';
import { telemedicinaApi, type CreateSalaPayload } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import {
  ModalidadeAtendimento,
  MODALIDADE_LABEL,
  StatusSala,
  STATUS_SALA_COLOR,
  STATUS_SALA_LABEL,
  type SalaTelemedicina,
} from '@/types';

const { Text } = Typography;

function SalaCard({
  sala,
  onEncerrar,
  loading,
}: {
  sala: SalaTelemedicina;
  onEncerrar: () => void;
  loading: boolean;
}) {
  const { message } = App.useApp();

  function copiar(token: string) {
    void navigator.clipboard.writeText(token);
    void message.success('Token copiado.');
  }

  return (
    <Card
      title={
        <Space>
          Sala de telemedicina
          <Tag color={STATUS_SALA_COLOR[sala.status as StatusSala]}>
            {STATUS_SALA_LABEL[sala.status as StatusSala] ?? sala.status}
          </Tag>
        </Space>
      }
      extra={
        sala.status === StatusSala.AGUARDANDO || sala.status === StatusSala.EM_ANDAMENTO ? (
          <Popconfirm
            title="Encerrar a sala de telemedicina?"
            onConfirm={onEncerrar}
            okText="Sim"
            cancelText="Não"
          >
            <Button danger icon={<PoweroffOutlined />} loading={loading}>
              Encerrar
            </Button>
          </Popconfirm>
        ) : null
      }
    >
      <Descriptions column={1} size="small">
        <Descriptions.Item label="Modalidade">
          {MODALIDADE_LABEL[sala.modalidade] ?? sala.modalidade}
        </Descriptions.Item>
        <Descriptions.Item label="Criada em">
          {dayjs(sala.criadoEm).format('DD/MM/YYYY HH:mm')}
        </Descriptions.Item>
        <Descriptions.Item label="Expira em">
          {dayjs(sala.expiresAt).format('DD/MM/YYYY HH:mm')}
        </Descriptions.Item>
        {sala.iniciadaEm && (
          <Descriptions.Item label="Iniciada em">
            {dayjs(sala.iniciadaEm).format('DD/MM/YYYY HH:mm')}
          </Descriptions.Item>
        )}
      </Descriptions>

      <Card size="small" style={{ marginTop: 16 }} title="Token do profissional">
        <Space>
          <Text code copyable={{ text: sala.tokenMedico, icon: <CopyOutlined /> }}>
            {sala.tokenMedico.slice(0, 20)}…
          </Text>
          <Button size="small" onClick={() => copiar(sala.tokenMedico)}>
            Copiar
          </Button>
        </Space>
      </Card>
      <Card size="small" style={{ marginTop: 8 }} title="Token do paciente">
        <Space>
          <Text code copyable={{ text: sala.tokenPaciente, icon: <CopyOutlined /> }}>
            {sala.tokenPaciente.slice(0, 20)}…
          </Text>
          <Button size="small" onClick={() => copiar(sala.tokenPaciente)}>
            Copiar
          </Button>
        </Space>
      </Card>
    </Card>
  );
}

export function TelemedicinaPage() {
  const { message } = App.useApp();
  const { user } = useAuth();
  const [openCreate, setOpenCreate] = useState(false);
  const [createForm] = Form.useForm();
  const [agendamentoId, setAgendamentoId] = useState('');
  const [buscarId, setBuscarId] = useState('');
  const [sala, setSala] = useState<SalaTelemedicina | null>(null);

  const buscarQ = useQuery({
    queryKey: ['telemedicina', 'sala', buscarId],
    queryFn: () => telemedicinaApi.findByAgendamento(buscarId),
    enabled: buscarId.length > 0,
    retry: false,
  });

  const createMut = useMutation({
    mutationFn: (payload: CreateSalaPayload) => telemedicinaApi.createSala(payload),
    onSuccess: (data) => {
      message.success('Sala criada com sucesso.');
      createForm.resetFields();
      setOpenCreate(false);
      setSala(data);
    },
    onError: (e) => message.error(apiErrorMessage(e)),
  });

  const encerrarMut = useMutation({
    mutationFn: (id: string) => telemedicinaApi.encerrar(id),
    onSuccess: (data) => {
      message.success('Sala encerrada.');
      setSala(data as SalaTelemedicina);
    },
    onError: (e) => message.error(apiErrorMessage(e)),
  });

  function handleBuscar() {
    if (!agendamentoId.trim()) return;
    setSala(null);
    setBuscarId(agendamentoId.trim());
  }

  function handleCreate(values: Record<string, unknown>) {
    if (!user?.clinicaId) return;
    createMut.mutate({
      clinicaId: user.clinicaId,
      agendamentoId: values.agendamentoId as string,
      pacienteId: values.pacienteId as string,
      modalidade: values.modalidade as string,
    });
  }

  const salaExibida = sala ?? (buscarQ.data as SalaTelemedicina | undefined);

  return (
    <>
      <PageHeader
        title="Telemedicina"
        extra={
          <Button icon={<PlusOutlined />} type="primary" onClick={() => setOpenCreate(true)}>
            Nova sala
          </Button>
        }
      />

      <Card title="Buscar sala por agendamento" style={{ marginBottom: 16 }}>
        <Space.Compact style={{ width: '100%', maxWidth: 480 }}>
          <Input
            placeholder="ID do agendamento"
            value={agendamentoId}
            onChange={(e) => setAgendamentoId(e.target.value)}
            onPressEnter={handleBuscar}
          />
          <Button
            icon={<SearchOutlined />}
            onClick={handleBuscar}
            loading={buscarQ.isFetching}
          >
            Buscar
          </Button>
        </Space.Compact>

        {buscarQ.isError && (
          <Alert
            type="warning"
            message="Nenhuma sala encontrada para este agendamento."
            style={{ marginTop: 12 }}
          />
        )}
      </Card>

      {salaExibida && (
        <SalaCard
          sala={salaExibida}
          onEncerrar={() => encerrarMut.mutate(salaExibida.id)}
          loading={encerrarMut.isPending}
        />
      )}

      <Modal
        title="Nova sala de telemedicina"
        open={openCreate}
        onCancel={() => { setOpenCreate(false); createForm.resetFields(); }}
        onOk={() => createForm.submit()}
        confirmLoading={createMut.isPending}
        destroyOnClose
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            name="agendamentoId"
            label="ID do agendamento"
            rules={[{ required: true, message: 'Informe o ID do agendamento' }]}
          >
            <Input placeholder="ID do agendamento" />
          </Form.Item>
          <Form.Item
            name="pacienteId"
            label="ID do paciente"
            rules={[{ required: true, message: 'Informe o ID do paciente' }]}
          >
            <Input placeholder="ID do paciente" />
          </Form.Item>
          <Form.Item
            name="modalidade"
            label="Modalidade"
            rules={[{ required: true, message: 'Selecione a modalidade' }]}
          >
            <Select>
              {Object.values(ModalidadeAtendimento).map((m) => (
                <Select.Option key={m} value={m}>{MODALIDADE_LABEL[m]}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
