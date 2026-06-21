import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
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

    const user = await this.users.create({
      nome: dto.nome,
      email,
      passwordHash,
      papel: dto.papel,
      clinicaId: dto.clinicaId ?? null,
    });

    return toPublicUser(user);
  }

  async updateUsuario(id: string, dto: UpdateUserDto) {
    const updated = await this.users.update(id, dto);
    if (!updated) throw new NotFoundException('Usuário não encontrado.');
    return toPublicUser(updated);
  }

  async resetPassword(id: string, novaSenha: string) {
    const { bcryptRounds } = this.configService.getConfig();
    const passwordHash = await bcrypt.hash(novaSenha, bcryptRounds);
    const updated = await this.users.update(id, { passwordHash });
    if (!updated) throw new NotFoundException('Usuário não encontrado.');
    return { ok: true };
  }
}
