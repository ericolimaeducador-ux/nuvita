import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { CLASSIFICACAO_AREA_LABEL, ClassificacaoArea } from '@/types';

/**
 * Seletor múltiplo da classificação de área do paciente (IU, FA, OT). Ao menos uma é obrigatória (a validação
 * fica no formulário). Só a combinação exata "somente IU" coloca o paciente no fluxo clínico.
 */
export function ClassificacaoAreaSelector({
  value,
  onChange,
  idPrefix = 'classificacao',
}: {
  value: ClassificacaoArea[];
  onChange: (valor: ClassificacaoArea[]) => void;
  idPrefix?: string;
}) {
  function alternar(area: ClassificacaoArea, marcada: boolean) {
    const sem = value.filter((a) => a !== area);
    onChange(marcada ? [...sem, area] : sem);
  }

  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2" role="group" aria-label="Classificação de área">
      {Object.values(ClassificacaoArea).map((area) => (
        <div key={area} className="flex items-center gap-2">
          <Checkbox
            id={`${idPrefix}-${area}`}
            checked={value.includes(area)}
            onCheckedChange={(c) => alternar(area, !!c)}
          />
          <Label htmlFor={`${idPrefix}-${area}`} className="font-normal">
            {CLASSIFICACAO_AREA_LABEL[area]}
          </Label>
        </div>
      ))}
    </div>
  );
}
