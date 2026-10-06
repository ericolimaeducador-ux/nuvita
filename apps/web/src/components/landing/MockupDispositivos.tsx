const BASE = import.meta.env.BASE_URL;

// Molduras em CSS com telas reais do Nuvita Psicologia (capturas com dados fictícios) em
// public/landing/telas/, em duas larguras cada (srcset). O topo da tela é o que importa:
// object-cover + object-top.
function Tela({ nome, larguras, sizes, alt, largura, altura }: {
  nome: string; larguras: [number, number]; sizes: string; alt: string; largura: number; altura: number;
}) {
  const url = (w: number) => `${BASE}landing/telas/${nome}-${w}.webp`;
  const [pequena, grande] = larguras;
  return (
    <img
      src={url(pequena)}
      srcSet={`${url(pequena)} ${pequena}w, ${url(grande)} ${grande}w`}
      sizes={sizes}
      alt={alt}
      width={largura}
      height={altura}
      loading="lazy"
      decoding="async"
      draggable={false}
      className="h-full w-full select-none object-cover object-top"
    />
  );
}

/** Reflexo de vidro bem sutil por cima da tela (não reduz a legibilidade). */
const REFLEXO = 'pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.07] via-transparent to-transparent';

export function MockupDispositivos() {
  return (
    <div className="relative mx-auto w-full max-w-xl pb-6 pr-6 sm:pr-10">
      {/* Laptop */}
      <div className="rounded-t-xl border-[10px] border-b-[14px] border-[#1C1F27] bg-[#0B0D12] shadow-[0_0_70px_-12px_rgba(45,212,191,0.45)]">
        <div className="relative aspect-[16/10] overflow-hidden rounded-[2px]">
          <Tela
            nome="ficha-paciente"
            larguras={[1440, 2880]}
            sizes="(min-width: 640px) 556px, 90vw"
            alt="Ficha do paciente no Nuvita Psicologia, vista no computador"
            largura={1440}
            altura={900}
          />
          <span aria-hidden="true" className={REFLEXO} />
        </div>
      </div>
      <div className="relative -mx-[6%] h-3 rounded-b-xl bg-gradient-to-b from-[#2A2E38] to-[#14161C]">
        <span className="absolute left-1/2 top-0 h-1.5 w-16 -translate-x-1/2 rounded-b-md bg-[#0B0D12]" />
      </div>

      {/* Celular */}
      <div className="absolute bottom-0 right-0 w-[24%] min-w-[84px] rounded-[1.4rem] border-[5px] border-[#1C1F27] bg-[#0B0D12] shadow-[0_0_40px_-8px_rgba(45,212,191,0.5)]">
        <div className="relative aspect-[9/19.5] overflow-hidden rounded-[1rem]">
          <Tela
            nome="historico-sessoes"
            larguras={[390, 780]}
            sizes="140px"
            alt="Histórico de sessões do Nuvita Psicologia, visto no celular"
            largura={390}
            altura={844}
          />
          <span aria-hidden="true" className={REFLEXO} />
          <span className="absolute left-1/2 top-1.5 h-1.5 w-8 -translate-x-1/2 rounded-full bg-[#0B0D12]" />
        </div>
      </div>
    </div>
  );
}
