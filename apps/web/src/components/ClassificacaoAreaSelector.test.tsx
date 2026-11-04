import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClassificacaoAreaSelector } from './ClassificacaoAreaSelector';
import { ClassificacaoArea, elegivelFluxoClinico } from '@/types';

describe('ClassificacaoAreaSelector', () => {
  it('mostra IU, FA e OT e marca as selecionadas', () => {
    render(<ClassificacaoAreaSelector value={[ClassificacaoArea.IU, ClassificacaoArea.OT]} onChange={() => {}} />);
    expect(screen.getByRole('checkbox', { name: /IU/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /FA/ })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /OT/ })).toBeChecked();
  });

  it('permite múltiplas: marcar acrescenta, desmarcar remove', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(<ClassificacaoAreaSelector value={[ClassificacaoArea.IU]} onChange={onChange} />);

    await user.click(screen.getByRole('checkbox', { name: /FA/ }));
    expect(onChange).toHaveBeenLastCalledWith([ClassificacaoArea.IU, ClassificacaoArea.FA]);

    rerender(<ClassificacaoAreaSelector value={[ClassificacaoArea.IU, ClassificacaoArea.FA]} onChange={onChange} />);
    await user.click(screen.getByRole('checkbox', { name: /IU/ }));
    expect(onChange).toHaveBeenLastCalledWith([ClassificacaoArea.FA]);
  });
});

describe('elegivelFluxoClinico (espelho do backend)', () => {
  it('só "exatamente IU" é elegível', () => {
    expect(elegivelFluxoClinico([ClassificacaoArea.IU])).toBe(true);
    expect(elegivelFluxoClinico([ClassificacaoArea.IU, ClassificacaoArea.FA])).toBe(false);
    expect(elegivelFluxoClinico([ClassificacaoArea.FA])).toBe(false);
    expect(elegivelFluxoClinico([])).toBe(false);
    expect(elegivelFluxoClinico(undefined)).toBe(false);
  });
});
