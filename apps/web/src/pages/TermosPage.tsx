import { PaginaLegal, type SecaoLegal } from '@/components/legal/PaginaLegal';
import { EMPRESA } from '@/lib/empresa';

const secoes: SecaoLegal[] = [
  {
    titulo: '1. Objeto',
    blocos: [
      'Este contrato regula a assinatura dos serviços Nuvita: Nuvita Psicologia (Plano Único) e Nuvita Urologia. Nuvita Estomoterapia ainda não foi lançada; seus planos e preços serão publicados, e passarão a ser regidos por este contrato, somente no lançamento.',
    ],
  },
  {
    titulo: '2. Planos e preços',
    blocos: [
      'Nuvita Psicologia — Plano Único: R$789,90 à vista (Pix/débito) ou 12x de R$69,90 no cartão (total R$838,80).',
      'Nuvita Estomoterapia: ainda não lançada. Planos, preços e limites de uso serão publicados nesta cláusula no lançamento.',
      'Os valores dos planos contratados poderão ser reajustados anualmente, ou na menor periodicidade permitida por lei, com base na variação positiva do IPCA/IBGE acumulado no período. A licenciante notificará o USUÁRIO sobre o reajuste com antecedência mínima de 30 (trinta) dias da data efetiva da cobrança do novo valor.',
    ],
  },
  {
    titulo: '3. Vigência e fidelidade',
    blocos: [
      '3.1. A assinatura tem vigência anual. Ao final de cada ciclo anual, a assinatura é renovada automaticamente por igual período, salvo cancelamento prévio pelo contratante. Para o pagamento parcelado (12x no cartão), cada ciclo anual renovado inicia um novo período de fidelidade de 12 (doze) meses, nos termos da cláusula 3.2.',
      '3.2. Pagamento parcelado (12x no cartão): fidelidade de 12 meses. Pagamento à vista: sem fidelidade.',
      'Caso o USUÁRIO solicite o cancelamento de um plano com compromisso de fidelidade (exemplo: plano anual com pagamento parcelado) antes do término do período contratado, será cobrada uma multa rescisória equivalente a 20% (vinte por cento) sobre o valor total das parcelas vincendas.',
    ],
  },
  {
    titulo: '4. Garantia de satisfação (14 dias)',
    blocos: [
      '14 dias corridos, contados da confirmação do pagamento, para cancelamento com devolução integral (100%) do valor pago, sem necessidade de justificativa. Após esse prazo, aplicam-se as regras da cláusula 3.',
      'Qualquer solicitação de cancelamento da assinatura ou pedido de estorno e devolução deverá ser formalizada exclusivamente por e-mail, através do endereço cancelamento@nuvita.app.br. O processamento da solicitação contará a partir da data de recebimento da comunicação neste canal oficial.',
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
      'O processamento das transações financeiras e a gestão do faturamento são realizados por meio do gateway de pagamento Mercado Pago. O USUÁRIO reconhece que os dados financeiros são compartilhados com o Mercado Pago estritamente para a finalidade de cobrança, manutenção de assinaturas e prevenção à fraude, atuando o Mercado Pago como Operador de Dados nos termos da LGPD. A Nuvita não armazena dados completos de cartão de crédito.',
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
    blocos: [
      '9.1. O SOFTWARE é fornecido no estado em que se encontra ("as is"), sem garantias implícitas de adequação a uma finalidade específica além daquelas expressamente declaradas nestes Termos.',
      '9.2. A LICENCIANTE atua exclusivamente como provedora de tecnologia e ferramenta de gestão, não prestando serviços médicos ou de saúde. A responsabilidade por diagnósticos, prescrições, tratamentos e pela precisão clínica das informações inseridas no prontuário é exclusiva do USUÁRIO (Profissional de Saúde).',
      '9.3. Em nenhuma hipótese a LICENCIANTE será responsabilizada por danos indiretos, lucros cessantes, paralisação de negócios ou perda de dados decorrentes do mau uso do sistema, falhas de conexão de internet do usuário ou eventos de força maior.',
      '9.4. A responsabilidade civil máxima da LICENCIANTE, em caso de falha sistêmica ou danos comprovadamente causados por sua culpa exclusiva, limitar-se-á ao valor total pago pelo USUÁRIO nos 12 (doze) meses anteriores à ocorrência do evento danoso.',
    ],
  },
  {
    titulo: '10. Rescisão',
    blocos: [
      'Cancelamento a qualquer momento, observadas as regras de fidelidade e garantia.',
      'Em caso de atraso no pagamento, o USUÁRIO receberá notificações prévias de cobrança durante 5 (cinco) dias consecutivos. Persistindo a inadimplência, a prestação do serviço será suspensa após o 7º (sétimo) dia do vencimento original. Para garantir a segurança jurídica e o cumprimento das normativas do Conselho Federal de Psicologia (CFP), todo o histórico de prontuários psicológicos gerado pelo USUÁRIO permanecerá integralmente guardado na infraestrutura de backend e em rotinas de backup da plataforma pelo prazo legal de 5 (cinco) anos, garantindo a integridade do acervo clínico.',
    ],
  },
  {
    titulo: '11. Disposições gerais',
    blocos: [
      `Regido pelas leis brasileiras. Foro da comarca de ${EMPRESA.foro}, ressalvado o direito do consumidor de optar pelo foro de seu domicílio (CDC).`,
    ],
  },
];

export function TermosPage() {
  return (
    <PaginaLegal
      titulo="Termos de Uso e Contrato de Assinatura"
      atualizacao={`Última atualização: ${EMPRESA.atualizacaoLegal}`}
      secoes={secoes}
    />
  );
}
