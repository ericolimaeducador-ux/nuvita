import { useState } from 'react';
import { Form, Input, Button, App, Typography, Divider } from 'antd';
import { LockOutlined, MailOutlined, SafetyOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { apiErrorMessage } from '@/api/client';

export function LoginPage() {
  const { login } = useAuth();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [needs2fa, setNeeds2fa] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/';

  async function onFinish(values: {
    email: string;
    password: string;
    totpCode?: string;
  }) {
    setLoading(true);
    try {
      await login(values.email, values.password, values.totpCode || undefined);
      message.success('Bem-vindo ao Nuvita.');
      navigate(from, { replace: true });
    } catch (err) {
      const msg = apiErrorMessage(err, 'Não foi possível entrar.');
      if (/2fa|totp|c[óo]digo|two.?factor/i.test(msg)) {
        setNeeds2fa(true);
        message.warning('Informe o código de verificação (2FA).');
      } else {
        message.error(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-hero">
        <div className="brand-row" style={{ color: '#fff' }}>
          <span className="brand-mark">N</span> Nuvita
        </div>
        <div>
          <h1>
            Gestão clínica
            <br />
            que cuida de quem cuida.
          </h1>
          <p>
            Prontuário eletrônico, agenda, pacientes e documentos em uma
            plataforma segura, multi-tenant e em conformidade com a LGPD.
          </p>
        </div>
        <Typography.Text style={{ color: 'rgba(255,255,255,0.6)' }}>
          © {new Date().getFullYear()} Nuvita · Plataforma de saúde
        </Typography.Text>
      </div>

      <div className="login-panel">
        <div className="login-card">
          <Typography.Title level={3} style={{ marginBottom: 4 }}>
            Acessar painel
          </Typography.Title>
          <Typography.Text type="secondary">
            Entre com suas credenciais corporativas.
          </Typography.Text>
          <Divider />
          <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
            <Form.Item
              name="email"
              label="E-mail"
              rules={[
                { required: true, message: 'Informe o e-mail.' },
                { type: 'email', message: 'E-mail inválido.' },
              ]}
            >
              <Input
                size="large"
                prefix={<MailOutlined />}
                placeholder="voce@clinica.com.br"
                autoComplete="username"
              />
            </Form.Item>
            <Form.Item
              name="password"
              label="Senha"
              rules={[{ required: true, message: 'Informe a senha.' }]}
            >
              <Input.Password
                size="large"
                prefix={<LockOutlined />}
                placeholder="••••••••••"
                autoComplete="current-password"
              />
            </Form.Item>
            {needs2fa && (
              <Form.Item
                name="totpCode"
                label="Código de verificação (2FA)"
                rules={[{ len: 6, message: '6 dígitos.' }]}
              >
                <Input
                  size="large"
                  prefix={<SafetyOutlined />}
                  placeholder="000000"
                  maxLength={6}
                  inputMode="numeric"
                />
              </Form.Item>
            )}
            <Button
              type="primary"
              size="large"
              htmlType="submit"
              block
              loading={loading}
            >
              Entrar
            </Button>
          </Form>
        </div>
      </div>
    </div>
  );
}
