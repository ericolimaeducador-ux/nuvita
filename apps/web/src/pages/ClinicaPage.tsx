import { Card, Form, Input, Select, Button, App, Row, Col, Alert } from 'antd';
import { useMutation } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { clinicasApi } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Papel, PAPEL_LABEL } from '@/types';

// Papéis que um ADMIN pode criar dentro da própria clínica.
const PAPEIS_CRIAVEIS = [
  Papel.MEDICO,
  Papel.ENFERMEIRO,
  Papel.ADVOGADO,
  Papel.SECRETARIA,
];

export function ClinicaPage() {
  const { message } = App.useApp();
  const { user } = useAuth();
  const [form] = Form.useForm();

  const mut = useMutation({
    mutationFn: (payload: {
      nome: string;
      email: string;
      password: string;
      papel: Papel;
    }) => clinicasApi.criarUsuario(user?.clinicaId ?? '', payload),
    onSuccess: () => {
      message.success('Usuário criado com sucesso.');
      form.resetFields();
    },
    onError: (e) => message.error(apiErrorMessage(e)),
  });

  function submit() {
    form.validateFields().then((v) =>
      mut.mutate({
        nome: v.nome,
        email: v.email,
        password: v.password,
        papel: v.papel,
      }),
    );
  }

  return (
    <>
      <PageHeader
        title="Clínica · Usuários"
        subtitle="Cadastro de profissionais e equipe da sua clínica (multi-tenant)"
      />

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Novo usuário da clínica"
        description="Crie médicos, enfermeiros, advogados ou secretaria. Profissionais (médico, enfermeiro e advogado) recebem 2FA obrigatório no primeiro acesso. Disponível apenas para ADMIN."
      />

      <Card variant="borderless" style={{ maxWidth: 720 }}>
        <Form
          form={form}
          layout="vertical"
          requiredMark="optional"
          initialValues={{ papel: Papel.MEDICO }}
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="nome"
                label="Nome completo"
                rules={[{ required: true, message: 'Informe o nome.' }]}
              >
                <Input placeholder="Dra. Helena Martins" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="papel"
                label="Perfil"
                rules={[{ required: true, message: 'Selecione o perfil.' }]}
              >
                <Select
                  options={PAPEIS_CRIAVEIS.map((p) => ({
                    value: p,
                    label: PAPEL_LABEL[p],
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="email"
                label="E-mail"
                rules={[
                  { required: true, message: 'Informe o e-mail.' },
                  { type: 'email', message: 'E-mail inválido.' },
                ]}
              >
                <Input placeholder="profissional@clinica.com.br" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="password"
                label="Senha provisória"
                rules={[
                  { required: true, message: 'Informe a senha.' },
                  { min: 10, message: 'Mínimo de 10 caracteres.' },
                ]}
              >
                <Input.Password placeholder="mínimo 10 caracteres" />
              </Form.Item>
            </Col>
          </Row>

          <Button
            type="primary"
            size="large"
            onClick={submit}
            loading={mut.isPending}
          >
            Criar usuário
          </Button>
        </Form>
      </Card>
    </>
  );
}
