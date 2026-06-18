import { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Modal,
  Form,
  Select,
  Input,
  DatePicker,
  App,
  Divider,
  AutoComplete,
} from 'antd';
import { PlusOutlined, SignatureOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { PageHeader } from '@/components/PageHeader';
import { prontuariosApi, pacientesApi } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import { toItems } from '@/utils';
import { useAuth } from '@/auth/AuthContext';
import {
  TipoAtendimento,
  TIPO_ATENDIMENTO_LABEL,
  type Prontuario,
  type Paciente,
} from '@/types';

export function ProntuariosPage() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [cidOpts, setCidOpts] = useState<{ value: string; label: string }[]>([]);

  const listQ = useQuery({
    queryKey: ['prontuarios'],
    queryFn: () => prontuariosApi.list(),
  });
  const pacientesQ = useQuery({
    queryKey: ['pacientes', 'select'],
    queryFn: () => pacientesApi.list({ limit: 100 }),
  });

  const createMut = useMutation({
    mutationFn: (payload: Record<string, unknown>) => prontuariosApi.create(payload),
    onSuccess: () => {
      message.success('Prontuário registrado.');
      setOpen(false);
      form.resetFields();
      void qc.invalidateQueries({ queryKey: ['prontuarios'] });
    },
    onError: (e) => message.error(apiErrorMessage(e)),
  });

  const assinarMut = useMutation({
    mutationFn: (id: string) => prontuariosApi.assinar(id),
    onSuccess: () => {
      message.success('Prontuário assinado.');
      void qc.invalidateQueries({ queryKey: ['prontuarios'] });
    },
    onError: (e) => message.error(apiErrorMessage(e)),
  });

  const prontuarios = toItems<Prontuario>(listQ.data as never);
  const pacientes = toItems<Paciente>(pacientesQ.data as never);

  async function buscarCid(q: string) {
    if (!q || q.length < 2) return setCidOpts([]);
    try {
      const r = await prontuariosApi.cid10(q);
      setCidOpts(
        (r ?? []).map((c) => ({
          value: c.codigo,
          label: `${c.codigo} — ${c.descricao}`,
        })),
      );
    } catch {
      setCidOpts([]);
    }
  }

  function submit() {
    form.validateFields().then((v) => {
      createMut.mutate({
        clinicaId: user?.clinicaId,
        pacienteId: v.pacienteId,
        dataAtendimento: dayjs(v.dataAtendimento).toISOString(),
        tipo: v.tipo,
        // Campos espelham o SOAP DTO da API (subjetivo.hda, avaliacao com arrays).
        subjetivo: { queixaPrincipal: v.queixa ?? '', hda: v.historia || undefined },
        objetivo: { exameFisico: v.exameFisico || undefined },
        avaliacao: {
          hipotesesDiagnosticas: v.avaliacao ? [v.avaliacao] : undefined,
          cid10: v.cid10 ? [v.cid10] : undefined,
        },
        plano: { conduta: v.conduta || undefined },
      });
    });
  }

  return (
    <>
      <PageHeader
        title="Prontuários"
        subtitle="Registros clínicos SOAP com assinatura imutável"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            Novo prontuário
          </Button>
        }
      />

      <Card variant="borderless">
        <Table<Prontuario>
          rowKey="id"
          loading={listQ.isLoading}
          dataSource={prontuarios}
          columns={[
            {
              title: 'Data',
              dataIndex: 'dataAtendimento',
              render: (v) => (v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '—'),
            },
            { title: 'Paciente', dataIndex: 'pacienteId' },
            {
              title: 'Tipo',
              dataIndex: 'tipo',
              render: (v: TipoAtendimento) => TIPO_ATENDIMENTO_LABEL[v] ?? v,
            },
            {
              title: 'Situação',
              dataIndex: 'assinado',
              render: (v) =>
                v ? <Tag color="green">Assinado</Tag> : <Tag color="gold">Rascunho</Tag>,
            },
            {
              title: '',
              width: 130,
              render: (_, r) =>
                r.assinado ? null : (
                  <Button
                    size="small"
                    icon={<SignatureOutlined />}
                    loading={assinarMut.isPending}
                    onClick={() => assinarMut.mutate(r.id)}
                  >
                    Assinar
                  </Button>
                ),
            },
          ]}
        />
      </Card>

      <Modal
        title="Novo prontuário (SOAP)"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={submit}
        okText="Registrar"
        confirmLoading={createMut.isPending}
        width={720}
        destroyOnClose
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item
            name="pacienteId"
            label="Paciente"
            rules={[{ required: true, message: 'Selecione o paciente.' }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Buscar paciente"
              options={pacientes.map((p) => ({ value: p.id, label: p.nome }))}
            />
          </Form.Item>
          <Form.Item
            name="dataAtendimento"
            label="Data do atendimento"
            rules={[{ required: true, message: 'Informe a data.' }]}
            initialValue={dayjs()}
          >
            <DatePicker
              showTime={{ format: 'HH:mm' }}
              format="DD/MM/YYYY HH:mm"
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item
            name="tipo"
            label="Tipo de atendimento"
            rules={[{ required: true, message: 'Selecione.' }]}
            initialValue={TipoAtendimento.CONSULTA}
          >
            <Select
              options={Object.values(TipoAtendimento).map((t) => ({
                value: t,
                label: TIPO_ATENDIMENTO_LABEL[t],
              }))}
            />
          </Form.Item>

          <Divider orientation="left">S — Subjetivo</Divider>
          <Form.Item
            name="queixa"
            label="Queixa principal"
            rules={[{ required: true, message: 'Informe a queixa.' }]}
          >
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="historia" label="História da doença atual">
            <Input.TextArea rows={2} />
          </Form.Item>

          <Divider orientation="left">O — Objetivo</Divider>
          <Form.Item name="exameFisico" label="Exame físico">
            <Input.TextArea rows={2} />
          </Form.Item>

          <Divider orientation="left">A — Avaliação</Divider>
          <Form.Item name="avaliacao" label="Hipótese diagnóstica">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="cid10" label="CID-10">
            <AutoComplete
              options={cidOpts}
              onSearch={buscarCid}
              placeholder="Digite para buscar (ex.: J11)"
              filterOption={false}
            />
          </Form.Item>

          <Divider orientation="left">P — Plano</Divider>
          <Form.Item name="conduta" label="Conduta">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
