import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../../common/security/config.service';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthTokenPayload } from '../../../../../../../packages/shared/src/auth';
import { AuthService } from '../../application/auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: appConfigService.getConfig().jwtAccessSecret,
    });
  }

  async validate(payload: AuthTokenPayload): Promise<AuthTokenPayload> {
    return this.authService.validateAccessPayload(payload);
  }
}
