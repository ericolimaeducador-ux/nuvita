import { PaginaLegal, type SecaoLegal } from '@/components/legal/PaginaLegal';

// Texto fornecido pelo responsável. Os marcadores [A CONFIRMAR ...] são
// INTENCIONAIS (pendências jurídicas): não remover nem "corrigir" sem decisão
// do responsável / advogado.
const secoes: SecaoLegal[] = [
  {
    titulo: '1. Objeto',
    blocos: [
      'Este contrato regula a assinatura dos serviços Nuvita: Nuvita Psicologia (Plano Único), Nuvita Estomoterapia (Básico, Premium, Enterprise) e Nuvita Urologia [A CONFIRMAR: contratação própria ou tratamento separado].',
    ],
  },
  {
    titulo: '2. Planos e preços',
    blocos: [
      'Nuvita Psicologia — Plano Único: R$599,90 à vista (Pix/débito) ou 12x de R$69,90 sem juros.',
      'Nuvita Estomoterapia:',
      [
        'Básico (200 MB): R$1.590,00 à vista ou 12x de R$149,90 sem juros',
        'Premium (1 GB): R$1.990,00 à vista ou 12x de R$219,90 sem juros',
        'Enterprise: sob consulta',
      ],
      'Limite de upload: 5 MB por foto, 10 MB por documento (Básico e Premium). Reajuste anual mediante aviso prévio de [A CONFIRMAR: prazo].',
    ],
  },
  {
    titulo: '3. Vigência e fidelidade',
    blocos: [
      'Assinatura anual, renovada automaticamente salvo cancelamento prévio. Pagamento parcelado (12x sem juros): fidelidade de 12 meses — cancelamento antecipado [A CONFIRMAR COM ADVOGADO: consequência exata]. Pagamento à vista: sem fidelidade.',
    ],
  },
  {
    titulo: '4. Garantia de satisfação (14 dias)',
    blocos: [
      '14 dias corridos, contados da confirmação do pagamento, para cancelamento com devolução integral (100%) do valor pago, sem necessidade de justificativa. Após esse prazo, aplicam-se as regras da cláusula 3. Solicitações via [A CONFIRMAR: canal], devolução em até [A CONFIRMAR: prazo].',
    ],
  },
  {
    titulo: '5. Ativação do acesso',
    blocos: [
      'Acesso liberado em até 24 horas úteis após confirmação do pagamento, via credenciais enviadas por e-mail e/ou WhatsApp.',
    ],
  },
  {
    titulo: '6. Forma de pagamento',
    blocos: [
      'Processado por [A CONFIRMAR: Mercado Pago ou outro]. A Nuvita não armazena dados completos de cartão de crédito.',
    ],
  },
  {
    titulo: '7. Obrigações do contratante',
    blocos: [
      'Manter dados cadastrais atualizados; usar a plataforma conforme legislação aplicável à sua área profissional; guardar suas credenciais de acesso; atuar como Controlador (LGPD) dos dados de pacientes/clientes que inserir na plataforma.',
    ],
  },
  {
    titulo: '8. Obrigações da Nuvita',
    blocos: [
      'Disponibilizar a plataforma conforme o plano contratado; realizar backups periódicos; atuar como Operadora dos dados de pacientes/clientes inseridos pelo contratante; comunicar indisponibilidades relevantes.',
    ],
  },
  {
    titulo: '9. Limitação de responsabilidade',
    blocos: ['[A CONFIRMAR COM ADVOGADO — cláusula ainda não redigida]'],
  },
  {
    titulo: '10. Rescisão',
    blocos: [
      'Cancelamento a qualquer momento via [A CONFIRMAR: canal], observadas as regras de fidelidade e garantia. Suspensão por inadimplência mediante aviso prévio de [A CONFIRMAR: prazo].',
    ],
  },
  {
    titulo: '11. Disposições gerais',
    blocos: [
      'Regido pelas leis brasileiras. Foro da comarca de Belo Horizonte/MG, ressalvado o direito do consumidor de optar pelo foro de seu domicílio (CDC).',
    ],
  },
];

export function TermosPage() {
  return (
    <PaginaLegal
      titulo="Termos de Uso e Contrato de Assinatura"
      atualizacao="Última atualização: [A CONFIRMAR: data]"
      secoes={secoes}
    />
  );
}
