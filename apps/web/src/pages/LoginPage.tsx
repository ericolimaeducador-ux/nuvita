import { Logo } from '@/components/Logo';
import { LoginForm } from '@/components/LoginForm';

export function LoginPage() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left — hero */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-bg-dark to-brand-cobalt p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-brand-cobalt/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-accent-gold/10 rounded-full blur-3xl" />

        <div className="relative flex items-center">
          <Logo
            width={230}
            iconColor="#FFB800"
            textColor="#FFFFFF"
            className="drop-shadow-[0_2px_16px_rgba(255,184,0,0.35)]"
          />
        </div>

        <div className="relative">
          <h1 className="text-[2.75rem] font-medium text-white leading-tight mb-4">
            Gestão clínica
            <br />
            <span className="text-accent-gold">que cuida</span> de
            <br />
            quem cuida.
          </h1>
          <p className="text-blue-100/90 text-lg leading-relaxed">
            Prontuário eletrônico, agenda, pacientes e documentos
            em uma plataforma segura, multi-tenant e em
            conformidade com a LGPD.
          </p>
        </div>

        <p className="relative text-blue-300/70 text-sm">
          © {new Date().getFullYear()} Nuvita · Plataforma de saúde
        </p>
      </div>
      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo (fundo claro) */}
          <div className="flex items-center mb-8 lg:hidden">
            <Logo width={160} iconColor="#E6A600" textColor="#1F2937" />
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}
