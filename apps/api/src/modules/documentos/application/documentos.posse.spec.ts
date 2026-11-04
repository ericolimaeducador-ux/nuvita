import { ForbiddenException } from '@nestjs/common';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { DocumentosService } from './documentos.service';

// Documento é do paciente: qualquer papel da clínica abre; excluir é restrito a quem enviou (enfermeiro).
const doc = (uploadPor: string) => ({
  id: 'd1', clinicaId: 'cli-1', pacienteId: 'pac-1', nome: 'n', tipo: 'EXAME', mimeType: 'application/pdf',
  tamanho: 1, url: 'k', hash: 'h', uploadPor, confirmadoEm: new Date(), criadoEm: new Date(),
});
const ctxDe = (sub: string, papel: Papel) => ({
  ip: '127.0.0.1', userAgent: 'jest',
  user: { sub, email: `${sub}@x.test`, papel, clinicaId: 'cli-1', jti: 'j', typ: 'access' as const },
});

function criar(uploadPor: string) {
  const documentos = {
    findById: jest.fn().mockResolvedValue(doc(uploadPor)),
    softDelete: jest.fn().mockResolvedValue(doc(uploadPor)),
  };
  const storage = { createReadUrl: jest.fn().mockResolvedValue('https://u'), deleteObject: jest.fn() };
  const service = new DocumentosService(
    documentos as never, storage as never, { create: jest.fn() } as never, {} as never, {} as never,
  );
  return { service, documentos, storage };
}

describe('DocumentosService – posse (D2)', () => {
  const psiB = ctxDe('psi-B', Papel.ENFERMEIRO);

  it('enfermeiro ABRE documento enviado por outro (encaminhamento/exame da secretária)', async () => {
    const { service, storage } = criar('sec-1');
    await expect(service.createAccessUrl('d1', undefined, psiB)).resolves.toBeDefined();
    expect(storage.createReadUrl).toHaveBeenCalled();
  });

  it('enfermeiro NÃO exclui documento enviado por outro', async () => {
    const { service, documentos } = criar('psi-A');
    await expect(service.softDelete('d1', undefined, psiB)).rejects.toThrow(ForbiddenException);
    expect(documentos.softDelete).not.toHaveBeenCalled();
  });

  it('enfermeiro exclui o que ele mesmo enviou', async () => {
    const { service } = criar('psi-B');
    await expect(service.softDelete('d1', undefined, psiB)).resolves.toBeDefined();
  });

  it('secretária e admin abrem e excluem na clínica inteira', async () => {
    const { service } = criar('psi-A');
    await expect(service.createAccessUrl('d1', undefined, ctxDe('sec', Papel.SECRETARIA))).resolves.toBeDefined();
    await expect(service.softDelete('d1', undefined, ctxDe('adm', Papel.ADMIN))).resolves.toBeDefined();
  });
});
