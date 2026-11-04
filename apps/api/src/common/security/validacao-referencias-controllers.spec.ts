// D4 (portado do nuvita-psi): os ids do payload de criação (pacienteId, medicoId, agendamentoId) precisam
// ser validados como pertencentes à clínica ANTES de criar o registro.
//
// No Nuvita esse mecanismo AINDA NÃO EXISTE: os controllers não chamam `validarReferencias` e os services
// gravam `dto.pacienteId` / `dto.medicoId` direto (ver AgendamentosService.create e ProntuariosService.create).
// Não é diferença estrutural de teste, é lacuna real do produto — registrada em
// docs/seguranca/ACHADOS-MATRIZ-2026-11-03.md. Como esta etapa NÃO altera código de produto, os casos ficam
// como `todo` (aparecem no relatório do jest) e devem virar testes de verdade quando o produto for corrigido
// (ver o spec equivalente no nuvita-psi: controllers recusam com NotFoundException e o service nunca é chamado).
describe('controllers validam referências do payload (D4) — PENDENTE no Nuvita', () => {
  it.todo('agendamento: create (pacienteId, medicoId), update (medicoId) e createBloqueio (medicoId)');
  it.todo('telemedicina: createSala (pacienteId e agendamentoId)');
  it.todo('documentos: createUploadUrl / presign (pacienteId)');
  it.todo('prontuário: create (pacienteId e agendamentoId)');
});
