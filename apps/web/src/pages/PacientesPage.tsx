import { useState } from 'react';
import {
  Card,
  Table,
  Input,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Select,
  DatePicker,
  App,
  Checkbox,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { PageHeader } from '@/components/PageHeader';
import { pacientesApi } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import { toItems, formatCpf, idade } from '@/utils';
import { useAuth } from '@/auth/AuthContext';
import { Sexo, SEXO_LABEL, type Paciente } from '@/types';

export function PacientesPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [busca, setBusca] = useState('');
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const listQ = useQuery({
    queryKey: ['pacientes', busca],
    queryFn: () => pacientesApi.list({ nome: busca || undefined, limit: 50 }),
  });

  const createMut = useMutation({
    mutationFn: (payload: Record<string, unknown>) => pacientesApi.create(payload),
    onSuccess: () => {
      message.success('Paciente cadastrado.');
      setOpen(false);
      form.resetFields();
      void qc.invalidateQueries({ queryKey: ['pacientes'] });
    },
    onError: (e) => message.error(apiErrorMessage(e)),
  });

  const pacientes = toItems<Paciente>(listQ.data as never);

  function submit() {
    form.validateFields().then((v) => {
      createMut.mutate({
        clinicaId: user?.clinicaId,
        nome: v.nome,
        cpf: v.cpf,
        dataNascimento: dayjs(v.dataNascimento).format('YYYY-MM-DD'),
        sexo: v.sexo,
        telefone: v.telefone || undefined,
        email: v.email || undefined,
        consentimentoLGPD: {
          aceito: !!v.consentimento,
          dataAceite: new Date().toISOString(),
          versao: '1.0',
        },
      });
    });
  }

  return (
    <>
      <PageHeader
        title="Pacientes"
        subtitle="Cadastro e prontuário base dos pacientes da clínica"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setOpen(true)}
          >
            Novo paciente
          </Button>
        }
      />

      <Card variant="borderless">
        <Input
          allowClear
          size="large"
          prefix={<SearchOutlined />}
          placeholder="Buscar por nome..."
          style={{ maxWidth: 360, marginBottom: 16 }}
          onChange={(e) => setBusca(e.target.value)}
        />
        <Table<Paciente>
          rowKey="id"
          loading={listQ.isLoading}
          dataSource={pacientes}
          onRow={(r) => ({
            onClick: () => navigate(`/pacientes/${r.id}`),
            style: { cursor: 'pointer' },
          })}
          columns={[
            { title: 'Nome', dataIndex: 'nome', sorter: (a, b) => a.nome.localeCompare(b.nome) },
            { title: 'CPF', dataIndex: 'cpf', render: formatCpf },
            {
              title: 'Idade',
              dataIndex: 'dataNascimento',
              render: idade,
              width: 100,
            },
            {
              title: 'Sexo',
              dataIndex: 'sexo',
              render: (v: Sexo) => SEXO_LABEL[v] ?? '—',
              width: 120,
            },
            { title: 'Telefone', dataIndex: 'telefone', render: (v) => v || '—' },
            {
              title: 'Situação',
              dataIndex: 'ativo',
              width: 110,
              render: (v: boolean) =>
                v === false ? (
                  <Tag color="default">Inativo</Tag>
                ) : (
                  <Tag color="green">Ativo</Tag>
                ),
            },
            {
              title: '',
              width: 60,
              render: (_, r) => (
                <Space onClick={(e) => e.stopPropagation()}>
                  <Button
                    type="text"
                    icon={<ExportOutlined />}
                    title="Exportar dados (LGPD)"
                    onClick={() =>
                      pacientesApi
                        .export(r.id)
                        .then(() => message.success('Exportação LGPD gerada.'))
                        .catch((e) => message.error(apiErrorMessage(e)))
                    }
                  />
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title="Novo paciente"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={submit}
        okText="Cadastrar"
        confirmLoading={createMut.isPending}
        width={620}
        destroyOnClose
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item
            name="nome"
            label="Nome completo"
            rules={[{ required: true, message: 'Informe o nome.' }]}
          >
            <Input placeholder="Maria da Silva" />
          </Form.Item>
          <Space style={{ display: 'flex' }} align="start">
            <Form.Item
              name="cpf"
              label="CPF"
              rules={[
                { required: true, message: 'Informe o CPF.' },
                {
                  pattern: /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/,
                  message: 'CPF inválido.',
                },
              ]}
              style={{ flex: 1 }}
            >
              <Input placeholder="000.000.000-00" />
            </Form.Item>
            <Form.Item
              name="dataNascimento"
              label="Nascimento"
              rules={[{ required: true, message: 'Informe a data.' }]}
              style={{ flex: 1 }}
            >
              <DatePicker
                style={{ width: '100%' }}
                format="DD/MM/YYYY"
                placeholder="Selecione"
              />
            </Form.Item>
            <Form.Item
              name="sexo"
              label="Sexo"
              rules={[{ required: true, message: 'Selecione.' }]}
              style={{ flex: 1 }}
            >
              <Select
                options={Object.values(Sexo).map((s) => ({
                  value: s,
                  label: SEXO_LABEL[s],
                }))}
              />
            </Form.Item>
          </Space>
          <Space style={{ display: 'flex' }} align="start">
            <Form.Item name="telefone" label="Telefone" style={{ flex: 1 }}>
              <Input placeholder="(00) 00000-0000" />
            </Form.Item>
            <Form.Item
              name="email"
              label="E-mail"
              rules={[{ type: 'email', message: 'E-mail inválido.' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="paciente@email.com" />
            </Form.Item>
          </Space>
          <Form.Item
            name="consentimento"
            valuePropName="checked"
            rules={[
              {
                validator: (_, v) =>
                  v
                    ? Promise.resolve()
                    : Promise.reject(new Error('Consentimento obrigatório (LGPD).')),
              },
            ]}
          >
            <Checkbox>
              O paciente consente com o tratamento de seus dados (LGPD).
            </Checkbox>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
