import { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  DatePicker,
  Modal,
  Form,
  Select,
  Input,
  App,
  Dropdown,
} from 'antd';
import { PlusOutlined, MoreOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs, { type Dayjs } from 'dayjs';
import { PageHeader } from '@/components/PageHeader';
import { agendaApi, pacientesApi } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import { toItems } from '@/utils';
import { useAuth } from '@/auth/AuthContext';
import {
  ModalidadeAtendimento,
  MODALIDADE_LABEL,
  Papel,
  PAPEIS_PROFISSIONAIS,
  StatusAgendamento,
  STATUS_AGENDAMENTO_COLOR,
  STATUS_AGENDAMENTO_LABEL,
  TipoAgendamento,
  TIPOS_POR_MODALIDADE,
  TIPO_AGENDAMENTO_LABEL,
  type Agendamento,
  type Paciente,
} from '@/types';

const { RangePicker } = DatePicker;

export function AgendaPage() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [dia, setDia] = useState<Dayjs>(dayjs());
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const modalidade = Form.useWatch('modalidade', form) as
    | ModalidadeAtendimento
    | undefined;

  const podeConcluir =
    !!user &&
    (PAPEIS_PROFISSIONAIS.includes(user.papel) || user.papel === Papel.ADMIN);

  const dataInicio = dia.startOf('day').toISOString();
  const dataFim = dia.endOf('day').toISOString();

  const listQ = useQuery({
    queryKey: ['agenda', dataInicio, dataFim],
    queryFn: () => agendaApi.list({ dataInicio, dataFim }),
  });
  const pacientesQ = useQuery({
    queryKey: ['pacientes', 'select'],
    queryFn: () => pacientesApi.list({ limit: 100 }),
  });

  const createMut = useMutation({
    mutationFn: (payload: Parameters<typeof agendaApi.create>[0]) =>
      agendaApi.create(payload),
    onSuccess: () => {
      message.success('Agendamento criado.');
      setOpen(false);
      form.resetFields();
      void qc.invalidateQueries({ queryKey: ['agenda'] });
    },
    onError: (e) => message.error(apiErrorMessage(e)),
  });

  const acaoMut = useMutation({
    mutationFn: (v: { id: string; acao: 'cancelar' | 'concluir' }) =>
      v.acao === 'cancelar' ? agendaApi.cancelar(v.id) : agendaApi.concluir(v.id),
    onSuccess: () => {
      message.success('Agendamento atualizado.');
      void qc.invalidateQueries({ queryKey: ['agenda'] });
    },
    onError: (e) => message.error(apiErrorMessage(e)),
  });

  const agendamentos = toItems<Agendamento>(listQ.data as never);
  const pacientes = toItems<Paciente>(pacientesQ.data as never);

  const tiposDisponiveis = modalidade
    ? TIPOS_POR_MODALIDADE[modalidade]
    : Object.values(TipoAgendamento);

  function submit() {
    form.validateFields().then((v) => {
      const [ini, f] = v.intervalo as [Dayjs, Dayjs];
      createMut.mutate({
        clinicaId: user?.clinicaId ?? '',
        pacienteId: v.pacienteId,
        medicoId: v.medicoId,
        modalidade: v.modalidade,
        dataHoraInicio: ini.toISOString(),
        dataHoraFim: f.toISOString(),
        tipo: v.tipo,
        observacoes: v.observacoes || undefined,
      });
    });
  }

  return (
    <>
      <PageHeader
        title="Agenda"
        subtitle="Agendamentos das três modalidades: médica, enfermagem e jurídica"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            Novo agendamento
          </Button>
        }
      />

      <Card variant="borderless">
        <DatePicker
          value={dia}
          onChange={(d) => d && setDia(d)}
          format="DD/MM/YYYY"
          allowClear={false}
          style={{ marginBottom: 16 }}
        />
        <Table<Agendamento>
          rowKey="id"
          loading={listQ.isLoading}
          dataSource={agendamentos}
          columns={[
            {
              title: 'Horário',
              dataIndex: 'dataHoraInicio',
              width: 140,
              render: (v, r) =>
                `${dayjs(v).format('HH:mm')} – ${dayjs(r.dataHoraFim).format('HH:mm')}`,
              sorter: (a, b) =>
                dayjs(a.dataHoraInicio).valueOf() - dayjs(b.dataHoraInicio).valueOf(),
              defaultSortOrder: 'ascend',
            },
            { title: 'Paciente', dataIndex: 'pacienteId' },
            {
              title: 'Modalidade',
              dataIndex: 'modalidade',
              width: 130,
              render: (v: ModalidadeAtendimento) => MODALIDADE_LABEL[v] ?? v,
            },
            {
              title: 'Tipo',
              dataIndex: 'tipo',
              render: (v: TipoAgendamento) => TIPO_AGENDAMENTO_LABEL[v] ?? v,
            },
            {
              title: 'Status',
              dataIndex: 'status',
              width: 120,
              render: (v: StatusAgendamento) => (
                <Tag color={STATUS_AGENDAMENTO_COLOR[v]}>
                  {STATUS_AGENDAMENTO_LABEL[v] ?? v}
                </Tag>
              ),
            },
            {
              title: '',
              width: 56,
              render: (_, r) => {
                const encerrado =
                  r.status === StatusAgendamento.CANCELADO ||
                  r.status === StatusAgendamento.CONCLUIDO;
                if (encerrado) return null;
                const items = [
                  ...(podeConcluir
                    ? [
                        {
                          key: 'concluir',
                          label: 'Concluir atendimento',
                          onClick: () =>
                            acaoMut.mutate({ id: r.id, acao: 'concluir' }),
                        },
                      ]
                    : []),
                  {
                    key: 'cancelar',
                    danger: true,
                    label: 'Cancelar',
                    onClick: () => acaoMut.mutate({ id: r.id, acao: 'cancelar' }),
                  },
                ];
                return (
                  <Dropdown menu={{ items }}>
                    <Button type="text" icon={<MoreOutlined />} />
                  </Dropdown>
                );
              },
            },
          ]}
        />
      </Card>

      <Modal
        title="Novo agendamento"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={submit}
        okText="Agendar"
        confirmLoading={createMut.isPending}
        width={560}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark="optional"
          initialValues={{ modalidade: ModalidadeAtendimento.MEDICO }}
        >
          <Form.Item
            name="modalidade"
            label="Modalidade"
            rules={[{ required: true, message: 'Selecione a modalidade.' }]}
          >
            <Select
              onChange={() => form.setFieldValue('tipo', undefined)}
              options={Object.values(ModalidadeAtendimento).map((m) => ({
                value: m,
                label: MODALIDADE_LABEL[m],
              }))}
            />
          </Form.Item>
          <Form.Item
            name="pacienteId"
            label="Paciente"
            rules={[{ required: true, message: 'Selecione o paciente.' }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Buscar paciente"
              loading={pacientesQ.isLoading}
              options={pacientes.map((p) => ({ value: p.id, label: p.nome }))}
            />
          </Form.Item>
          <Form.Item
            name="medicoId"
            label="ID do profissional responsável"
            rules={[{ required: true, message: 'Informe o profissional.' }]}
            initialValue={
              user && PAPEIS_PROFISSIONAIS.includes(user.papel) ? user.id : undefined
            }
          >
            <Input placeholder="ID do médico, enfermeiro ou advogado" />
          </Form.Item>
          <Form.Item
            name="intervalo"
            label="Início e fim"
            rules={[{ required: true, message: 'Informe o intervalo.' }]}
          >
            <RangePicker
              showTime={{ format: 'HH:mm' }}
              format="DD/MM/YYYY HH:mm"
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item
            name="tipo"
            label="Tipo"
            rules={[{ required: true, message: 'Selecione o tipo.' }]}
          >
            <Select
              placeholder="Selecione"
              options={tiposDisponiveis.map((t) => ({
                value: t,
                label: TIPO_AGENDAMENTO_LABEL[t],
              }))}
            />
          </Form.Item>
          <Form.Item name="observacoes" label="Observações">
            <Input.TextArea rows={3} maxLength={1000} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
