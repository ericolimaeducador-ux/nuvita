import type { ChangeEvent, FormEvent, ReactNode, Ref } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const CODIGOS_ENFERMEIRO_CAPTADOR = [
  'ENF-00126', 'ENF-00226', 'ENF-00326', 'ENF-00426', 'ENF-00526',
  'ENF-00626', 'ENF-00726', 'ENF-00826', 'ENF-00926', 'ENF-01026',
] as const;

export type CodigoEnfermeiroCaptador = (typeof CODIGOS_ENFERMEIRO_CAPTADOR)[number];

export interface CaptacaoFormValues {
  nome: string;
  cpf: string;
  dataNascimento: string;
  endereco: string;
  telefone: string;
  email: string;
  codigoEnfermeiro: CodigoEnfermeiroCaptador;
}

export const CAPTACAO_FORM_VAZIO: CaptacaoFormValues = {
  nome: '',
  cpf: '',
  dataNascimento: '',
  endereco: '',
  telefone: '',
  email: '',
  codigoEnfermeiro: CODIGOS_ENFERMEIRO_CAPTADOR[0],
};

const campo = 'space-y-1.5';

export function FormularioCaptacao({
  values,
  onChange,
  onSubmit,
  carregando,
  aviso,
  nomeRef,
}: {
  values: CaptacaoFormValues;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSubmit: (e: FormEvent) => void;
  carregando: boolean;
  aviso?: ReactNode;
  nomeRef?: Ref<HTMLInputElement>;
}) {
  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-x-4 gap-y-3 min-[480px]:grid-cols-2">
      {aviso && <div className="min-[480px]:col-span-2">{aviso}</div>}

      <div className={`${campo} min-[480px]:col-span-2`}>
        <Label htmlFor="codigoEnfermeiro">Código do enfermeiro</Label>
        <select
          id="codigoEnfermeiro"
          name="codigoEnfermeiro"
          value={values.codigoEnfermeiro}
          onChange={onChange}
          className="flex h-10 w-full rounded-md border border-border bg-secondary px-3 text-sm text-foreground"
        >
          {CODIGOS_ENFERMEIRO_CAPTADOR.map((code) => (
            <option key={code} value={code}>{code}</option>
          ))}
        </select>
      </div>

      <div className={`${campo} min-[480px]:col-span-2`}>
        <Label htmlFor="nome">Nome completo do paciente</Label>
        <Input
          ref={nomeRef}
          id="nome"
          name="nome"
          required
          value={values.nome}
          onChange={onChange}
          autoComplete="name"
        />
      </div>

      <div className={campo}>
        <Label htmlFor="cpf">CPF</Label>
        <Input
          id="cpf"
          name="cpf"
          required
          inputMode="numeric"
          placeholder="000.000.000-00"
          pattern="\d{3}\.?\d{3}\.?\d{3}-?\d{2}"
          title="Informe o CPF com 11 dígitos."
          value={values.cpf}
          onChange={onChange}
          autoComplete="off"
        />
      </div>

      <div className={campo}>
        <Label htmlFor="dataNascimento">Data de nascimento</Label>
        <Input
          id="dataNascimento"
          name="dataNascimento"
          type="date"
          required
          value={values.dataNascimento}
          onChange={onChange}
        />
      </div>

      <div className={`${campo} min-[480px]:col-span-2`}>
        <Label htmlFor="endereco">Endereço completo</Label>
        <Input
          id="endereco"
          name="endereco"
          required
          value={values.endereco}
          onChange={onChange}
          autoComplete="street-address"
        />
      </div>

      <div className={campo}>
        <Label htmlFor="telefone">Telefone / WhatsApp</Label>
        <Input
          id="telefone"
          name="telefone"
          type="tel"
          required
          placeholder="(00) 00000-0000"
          value={values.telefone}
          onChange={onChange}
          autoComplete="tel"
        />
      </div>

      <div className={campo}>
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          value={values.email}
          onChange={onChange}
          autoComplete="email"
        />
      </div>

      <div className="pt-1 min-[480px]:col-span-2">
        <Button type="submit" disabled={carregando} className="w-full">
          {carregando ? 'Salvando captação...' : 'Cadastrar paciente'}
        </Button>
      </div>
    </form>
  );
}
