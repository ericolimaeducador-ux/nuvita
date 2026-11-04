// Identidade do produto Nuvita Psi — SÓ para a interface do app (ex.: rodapé do app).
// Nunca usar no corpo clínico dos documentos: o timbre vem da clínica (GET /clinicas/minha).
// Assets de logo ainda são os do Nuvita original — trocar quando houver arte própria.
import logoColor from '@/assets/nuvita-logo.png';
import logoLight from '@/assets/nuvita-logo-light.png';
import markColor from '@/assets/nuvita-mark.png';
import markLight from '@/assets/nuvita-mark-light.png';

export const brand = {
  nome: 'Nuvita Psi',
  // Logo completo (ícone + marca nominativa). `color` para superfícies claras;
  // `light` para o tema escuro do app.
  logo: { color: logoColor, light: logoLight },
  // Apenas o ícone (nuvem + batimento).
  mark: { color: markColor, light: markLight },
} as const;
