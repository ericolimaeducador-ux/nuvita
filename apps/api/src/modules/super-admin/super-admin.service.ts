import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import { exigeTwoFactor, Modulo, Papel } from '../../../../../packages/shared/src/auth';
import { USER_REPOSITORY } from '../auth/auth.constants';
import { UserRepository } from '../auth/application/ports/user.repository';
import { toPublicUser } from '../auth/domain/user.entity';
import { AppConfigService } from '../../common/security/config.service';
import { ListUsersQueryDto } from './application/dto/list-users-query.dto';
import { UpdateUserDto } from './application/dto/update-user.dto';
import { CreateAdminUserDto } from './application/dto/create-admin-user.dto';

@Injectable()
export class SuperAdminService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly configService: AppConfigService,
  ) {}

  async listUsuarios(query: ListUsersQueryDto) {
    const { skip = 0, limit = 50, papel, clinicaId, ativo, search } = query;
    const filters = { papel, clinicaId, ativo, search };
    const [items, total] = await Promise.all([
      this.users.findAll(filters, skip, limit),
      this.users.count(filters),
    ]);
    return { items: items.map(toPublicUser), total, skip, limit };
  }

  async getUsuario(id: string) {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return toPublicUser(user);
  }

  async createUsuario(dto: CreateAdminUserDto) {
    const email = dto.email.toLowerCase();
    const existing = await this.users.findByEmail(email);
    if (existing) throw new ConflictException('E-mail já cadastrado.');

    const { bcryptRounds } = this.configService.getConfig();
    const passwordHash = await bcrypt.hash(dto.password, bcryptRounds);

    // Papéis com 2FA obrigatório precisam nascer com o secret, senão o login
    // fica impossível (o guard exige TOTP mas não há segredo cadastrado).
    const twoFactorSetup = this.buildTwoFactorSetup(dto.papel, email);
    const user = await this.users.create({
      nome: dto.nome,
      email,
      passwordHash,
      papel: dto.papel,
      clinicaId: dto.clinicaId ?? null,
      twoFactorSecret: twoFactorSetup?.base32,
    });

    return { ...toPublicUser(user), twoFactorSetup };
  }

  async updateUsuario(id: string, dto: UpdateUserDto) {
    const current = await this.users.findById(id);
    if (!current) throw new NotFoundException('Usuário não encontrado.');

    // Se a mudança de papel passa a exigir 2FA e o usuário ainda não tem
    // secret, gera um agora para não travar o próximo login.
    let twoFactorSetup: ReturnType<SuperAdminService['buildTwoFactorSetup']>;
    if (dto.papel && exigeTwoFactor(dto.papel)) {
      const withSecrets = await this.users.findByEmailWithSecrets(current.email);
      if (!withSecrets?.twoFactorSecret) {
        twoFactorSetup = this.buildTwoFactorSetup(dto.papel, current.email);
      }
    }

    // O módulo SUPER_ADMIN nunca é concedível por checkbox: só o papel dá acesso.
    const papelFinal = dto.papel ?? current.papel;
    const modulosConcedidos =
      papelFinal === Papel.SUPER_ADMIN
        ? dto.modulosConcedidos
        : dto.modulosConcedidos?.filter((m) => m !== Modulo.SUPER_ADMIN);

    const updated = await this.users.update(id, {
      ...dto,
      ...(modulosConcedidos !== undefined ? { modulosConcedidos } : {}),
      ...(twoFactorSetup ? { twoFactorSecret: twoFactorSetup.base32 } : {}),
    });
    if (!updated) throw new NotFoundException('Usuário não encontrado.');
    return { ...toPublicUser(updated), twoFactorSetup };
  }

  private buildTwoFactorSetup(
    papel: Papel,
    email: string,
  ): { required: true; otpauthUrl: string; base32: string } | undefined {
    if (!exigeTwoFactor(papel)) {
      return undefined;
    }

    const issuer = this.configService.getConfig().totpIssuer;
    const secret = speakeasy.generateSecret({
      issuer,
      name: `${issuer}:${email}`,
      length: 32,
    });

    return {
      required: true,
      otpauthUrl: secret.otpauth_url ?? '',
      base32: secret.base32,
    };
  }

  async resetPassword(id: string, novaSenha: string) {
    const { bcryptRounds } = this.configService.getConfig();
    const passwordHash = await bcrypt.hash(novaSenha, bcryptRounds);
    const updated = await this.users.update(id, { passwordHash });
    if (!updated) throw new NotFoundException('Usuário não encontrado.');
    return { ok: true };
  }
}
