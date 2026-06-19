import { useState } from 'react';
import {
  Card,
  Col,
  Row,
  Statistic,
  Table,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Space,
  App,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  CheckOutlined,
  CloseOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { PageHeader } from '@/components/PageHeader';
import { financeiroApi, type CreateLancamentoPayload } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import { toItems } from '@/utils';
import { useAuth } from '@/auth/AuthContext';
import {
  FormaPagamento,
  FORMA_PAGAMENTO_LABEL,
  StatusLancamento,
  STATUS_LANCAMENTO_COLOR,
  STATUS_LANCAMENTO_LABEL,
  TipoLancamento,
  TIPO_LANCAMENTO_LABEL,
  type DashboardFinanceiro,
  type Lancamento,
} from '@/types';

function fmtValor(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function FinanceiroPage() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const dashQ = useQuery<DashboardFinanceiro>({
    queryKey: ['financeiro', 'dashboard'],
    queryFn: () => financeiroApi.dashboard(),
  });

  const listQ = useQuery({
    queryKey: ['financeiro', 'lancamentos'],
    queryFn: () => financeiroApi.list(),
  });

  const createMut = useMutation({
    mutationFn: (payload: CreateLancamentoPayload) => financeiroApi.create(payload),
    onSuccess: () => {
      message.success('Lançamento criado.');
      form.resetFields();
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ['financeiro'] });
    },
    onError: (e) => message.error(apiErrorMessage(e)),
  });

  const receberMut = useMutation({
    mutationFn: (id: string) => financeiroApi.receber(id),
    onSuccess: () => {
      message.success('Lançamento marcado como recebido.');
      void qc.invalidateQueries({ queryKey: ['financeiro'] });
    },
    onError: (e) => message.error(apiErrorMessage(e)),
  });

  const cancelarMut = useMutation({
    mutationFn: (id: string) => financeiroApi.cancelar(id),
    onSuccess: () => {
      message.success('Lançamento cancelado.');
      void qc.invalidateQueries({ queryKey: ['financeiro'] });
    },
    onError: (e) => message.error(apiErrorMessage(e)),
  });

  function handleSubmit(values: Record<string, unknown>) {
    if (!user?.clinicaId) return;
    createMut.mutate({
      clinicaId: user.clinicaId,
      tipo: values.tipo as string,
      descricao: values.descricao as string,
      valor: values.valor as number,
      formaPagamento: values.formaPagamento as string | undefined,
      vencimento: values.vencimento
        ? dayjs(values.vencimento as string).toISOString()
        : undefined,
      observacoes: values.observacoes as string | undefined,
    });
  }

  const dash = dashQ.data;
  const lancamentos = toItems<Lancamento>(listQ.data as never);

  const columns = [
    { title: 'Descrição', dataIndex: 'descricao', key: 'descricao', ellipsis: true },
    {
      title: 'Tipo',
      dataIndex: 'tipo',
      key: 'tipo',
      width: 100,
      render: (v: TipoLancamento) => (
        <Tag color={v === TipoLancamento.RECEITA ? 'green' : 'red'}>
          {TIPO_LANCAMENTO_LABEL[v] ?? v}
        </Tag>
      ),
    },
    {
      title: 'Valor',
      dataIndex: 'valor',
      key: 'valor',
      width: 130,
      render: (v: number) => fmtValor(v),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (v: StatusLancamento) => (
        <Tag color={STATUS_LANCAMENTO_COLOR[v]}>{STATUS_LANCAMENTO_LABEL[v] ?? v}</Tag>
      ),
    },
    {
      title: 'Forma',
      dataIndex: 'formaPagamento',
      key: 'formaPagamento',
      width: 130,
      render: (v?: FormaPagamento) => (v ? (FORMA_PAGAMENTO_LABEL[v] ?? v) : '—'),
    },
    {
      title: 'Vencimento',
      dataIndex: 'vencimento',
      key: 'vencimento',
      width: 120,
      render: (v?: string) => (v ? dayjs(v).format('DD/MM/YYYY') : '—'),
    },
    {
      title: 'Ações',
      key: 'acoes',
      width: 120,
      render: (_: unknown, row: Lancamento) =>
        row.status === StatusLancamento.PENDENTE ? (
          <Space size="small">
            <Popconfirm
              title="Marcar como recebido?"
              onConfirm={() => receberMut.mutate(row.id)}
              okText="Sim"
              cancelText="Não"
            >
              <Button size="small" icon={<CheckOutlined />} type="link" />
            </Popconfirm>
            <Popconfirm
              title="Cancelar lançamento?"
              onConfirm={() => cancelarMut.mutate(row.id)}
              okText="Sim"
              cancelText="Não"
            >
              <Button size="small" icon={<CloseOutlined />} type="link" danger />
            </Popconfirm>
          </Space>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title="Financeiro"
        extra={
          <Button icon={<PlusOutlined />} type="primary" onClick={() => setOpen(true)}>
            Novo lançamento
          </Button>
        }
      />

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Receitas"
              value={dash?.totalReceitas ?? 0}
              prefix={<ArrowUpOutlined style={{ color: '#52c41a' }} />}
              formatter={(v) => fmtValor(Number(v))}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Despesas"
              value={dash?.totalDespesas ?? 0}
              prefix={<ArrowDownOutlined style={{ color: '#ff4d4f' }} />}
              formatter={(v) => fmtValor(Number(v))}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Pendente"
              value={dash?.totalPendente ?? 0}
              valueStyle={{ color: '#fa8c16' }}
              formatter={(v) => fmtValor(Number(v))}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Saldo"
              value={dash?.saldo ?? 0}
              valueStyle={{ color: (dash?.saldo ?? 0) >= 0 ? '#52c41a' : '#ff4d4f' }}
              formatter={(v) => fmtValor(Number(v))}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Table
          rowKey="id"
          dataSource={lancamentos}
          columns={columns}
          loading={listQ.isLoading}
          pagination={{ pageSize: 20 }}
          size="small"
        />
      </Card>

      <Modal
        title="Novo lançamento"
        open={open}
        onCancel={() => { setOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={createMut.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="tipo" label="Tipo" rules={[{ required: true }]}>
            <Select>
              {Object.values(TipoLancamento).map((t) => (
                <Select.Option key={t} value={t}>{TIPO_LANCAMENTO_LABEL[t]}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="descricao" label="Descrição" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="valor" label="Valor (R$)" rules={[{ required: true }]}>
            <InputNumber min={0} step={0.01} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="formaPagamento" label="Forma de pagamento">
            <Select allowClear>
              {Object.values(FormaPagamento).map((f) => (
                <Select.Option key={f} value={f}>{FORMA_PAGAMENTO_LABEL[f]}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="vencimento" label="Vencimento">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="observacoes" label="Observações">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
