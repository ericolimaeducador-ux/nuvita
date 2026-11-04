import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { TrocarSenhaObrigatoriaDto } from './trocar-senha-obrigatoria.dto';

/**
 * A política de senha (mín. 10) é a mesma do resto do sistema (register,
 * reset-password, create-clinica). Aqui garantimos que ela vale também no
 * endpoint de troca obrigatória — é o único ponto onde a força mínima é
 * checada nesse fluxo (o serviço não re-valida tamanho).
 */
describe('TrocarSenhaObrigatoriaDto (Fase 6)', () => {
  it('rejeita novaSenha com menos de 10 caracteres', async () => {
    const errors = await validate(plainToInstance(TrocarSenhaObrigatoriaDto, { novaSenha: 'curta' }));
    expect(errors).not.toHaveLength(0);
  });

  it('rejeita novaSenha ausente', async () => {
    const errors = await validate(plainToInstance(TrocarSenhaObrigatoriaDto, {}));
    expect(errors).not.toHaveLength(0);
  });

  it('aceita novaSenha com 10+ caracteres', async () => {
    const errors = await validate(
      plainToInstance(TrocarSenhaObrigatoriaDto, { novaSenha: 'senhaForte123' }),
    );
    expect(errors).toHaveLength(0);
  });
});
