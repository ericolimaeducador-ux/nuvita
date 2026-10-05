// PENDENTE DE REVISÃO JURÍDICA (identificação da empresa, papel na LGPD e data alterados em 04/10/2026).
import { PaginaLegal, type SecaoLegal } from '@/components/legal/PaginaLegal';
import { EMPRESA } from '@/lib/empresa';

// Texto fornecido pelo responsável. Os marcadores [A CONFIRMAR: ...] e
// [EM CONVERSÃO: ...] são INTENCIONAIS (pendências jurídicas/contábeis): não
// remover nem "corrigir" sem decisão do responsável.
const secoes: SecaoLegal[] = [
  {
    titulo: '1. Quem somos',
    blocos: [
      'Esta Política de Privacidade se aplica ao uso da plataforma Nuvita (nuvita.app.br e subdomínios), incluindo os módulos de Urologia, Estomoterapia e Psicologia, operada por:',
      `${EMPRESA.razaoSocial}, CNPJ ${EMPRESA.cnpj}`,
      `Endereço: ${EMPRESA.endereco}`,
      'Para fins da Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD), a empresa acima atua como Operadora dos dados de pacientes/clientes inseridos na plataforma pelos profissionais, que são os Controladores desses dados, e como Controladora apenas dos dados cadastrais dos próprios assinantes.',
      `Encarregado de Proteção de Dados (DPO): ${EMPRESA.email}`,
    ],
  },
  {
    titulo: '2. Quais dados coletamos',
    blocos: [
      '2.1. Dados fornecidos diretamente por você (profissional de saúde, cliente da assinatura): nome, e-mail, telefone, dados de pagamento (processados por terceiro — ver seção 4), dados profissionais (registro em conselho de classe, quando aplicável), credenciais de acesso (login e senha, armazenada de forma criptografada).',
      '2.2. Dados de pacientes/clientes inseridos por você no sistema: ao utilizar a plataforma, você (profissional de saúde) pode inserir dados de seus próprios pacientes/clientes (nome, histórico clínico, evolução, fotos de lesão, quando aplicável). Nesses casos, você atua como Controlador desses dados de terceiros, e a Nuvita atua como Operadora, processando esses dados exclusivamente conforme suas instruções e para viabilizar o funcionamento do sistema que você contratou.',
      '2.3. Dados de navegação (cookies e analytics): coletamos dados de navegação na página institucional (nuvita.app.br) por meio do Google Analytics, somente mediante seu consentimento explícito dado através do banner de cookies. Você pode recusar esse consentimento a qualquer momento, e a navegação básica do site não é prejudicada por essa recusa. Não utilizamos cookies de analytics dentro da área logada do sistema (dashboard, prontuários e demais telas autenticadas).',
    ],
  },
  {
    titulo: '3. Para que usamos seus dados (finalidade e base legal)',
    blocos: [
      [
        'Viabilizar cadastro, login e uso da plataforma — Execução de contrato (art. 7º, V, LGPD)',
        'Processar pagamento da assinatura — Execução de contrato',
        'Armazenar prontuário eletrônico e dados clínicos inseridos por você — Execução de contrato, na qualidade de Operadora',
        'Enviar comunicações sobre a conta — Execução de contrato',
        'Analisar uso da página institucional (Google Analytics) — Consentimento (art. 7º, I), apenas mediante aceite no banner',
        'Cumprir obrigações legais/regulatórias do setor de saúde — Cumprimento de obrigação legal ou regulatória (art. 7º, II)',
      ],
    ],
  },
  {
    titulo: '4. Com quem compartilhamos dados',
    blocos: [
      [
        'Google Analytics: apenas para visitantes que consentirem',
        'Não vendemos nem compartilhamos dados com terceiros para fins de publicidade.',
      ],
      'O processamento das transações financeiras e a gestão do faturamento são realizados por meio do gateway de pagamento Mercado Pago. O USUÁRIO reconhece que os dados financeiros são compartilhados com o Mercado Pago estritamente para a finalidade de cobrança, manutenção de assinaturas e prevenção à fraude, atuando o Mercado Pago como Operador de Dados nos termos da LGPD.',
      'Para garantir a disponibilidade e segurança da aplicação e dos dados de saúde dos pacientes, a plataforma utiliza infraestrutura de nuvem de terceiros. Os dados são armazenados e processados utilizando os serviços do Google Cloud (incluindo Cloud Run e Firebase), MongoDB Atlas e Cloudflare R2. Ao utilizar nossos serviços, o Usuário concorda com o compartilhamento e a potencial transferência internacional destes dados para servidores localizados nos Estados Unidos ou em outras regiões globais operadas por estes provedores, os quais adotam os mais altos padrões de criptografia e conformidade legal compatíveis com a LGPD.',
    ],
  },
  {
    titulo: '5. Por quanto tempo guardamos os dados',
    blocos: [
      'Os dados são mantidos durante a vigência da sua assinatura e pelo prazo necessário ao cumprimento de obrigações legais e regulatórias aplicáveis. Após o encerramento da conta e decorridos esses prazos, os dados são eliminados ou anonimizados, ressalvadas as hipóteses legais de retenção.',
    ],
  },
  {
    titulo: '6. Seus direitos como titular de dados',
    blocos: [
      `Você pode solicitar a qualquer momento: confirmação da existência de tratamento, acesso, correção, anonimização/bloqueio/eliminação, portabilidade, eliminação de dados tratados com base no consentimento, informação sobre compartilhamento, e revogação do consentimento. Contato: ${EMPRESA.email}`,
    ],
  },
  {
    titulo: '7. Segurança dos dados',
    blocos: [
      'Adotamos medidas técnicas e administrativas para proteger os dados pessoais, incluindo criptografia de dados sensíveis, controle de acesso por perfil de usuário e backups periódicos. Em caso de incidente de segurança relevante, notificaremos você e a Autoridade Nacional de Proteção de Dados (ANPD), conforme exigido em lei.',
    ],
  },
  {
    titulo: '8. Alterações desta política',
    blocos: [
      'Podemos atualizar esta Política periodicamente. A data da última atualização estará sempre indicada no topo deste documento.',
    ],
  },
  {
    titulo: '9. Contato',
    blocos: [EMPRESA.email],
  },
];

export function PrivacidadePage() {
  return (
    <PaginaLegal
      titulo="Política de Privacidade"
      atualizacao={`Última atualização: ${EMPRESA.atualizacaoLegal}`}
      secoes={secoes}
    />
  );
}
