import { Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.REQUEST })
export class TenantContextService {
  private clinicaId?: string;
  private subdomain?: string;

  setClinicaId(clinicaId: string | undefined): void {
    this.clinicaId = clinicaId;
  }

  getClinicaId(): string | undefined {
    return this.clinicaId;
  }

  requireClinicaId(): string {
    if (!this.clinicaId) {
      throw new Error('Tenant context missing clinicaId.');
    }

    return this.clinicaId;
  }

  setSubdomain(subdomain: string | undefined): void {
    this.subdomain = subdomain;
  }

  getSubdomain(): string | undefined {
    return this.subdomain;
  }
}
