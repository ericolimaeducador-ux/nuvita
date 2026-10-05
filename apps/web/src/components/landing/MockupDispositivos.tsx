const BASE = import.meta.env.BASE_URL;

// Molduras em CSS. A tela mostra o screenshot real quando o arquivo existe em
// public/landing/shots/; senão, um placeholder cinza liso (sem simular interface).
function Tela({ arquivo, existe, alt, largura, altura }: {
  arquivo: string; existe: boolean; alt: string; largura: number; altura: number;
}) {
  if (!existe) return <div className="h-full w-full bg-[#7C818B]" />;
  return (
    <img
      src={`${BASE}landing/shots/${arquivo}`}
      alt={alt}
      width={largura}
      height={altura}
      loading="lazy"
      decoding="async"
      className="h-full w-full object-cover object-top"
    />
  );
}

export function MockupDispositivos() {
  const shots = __SHOTS_PSICOLOGIA__;
  const algumShot = shots.desktop || shots.mobile;

  return (
    <div className="relative mx-auto w-full max-w-xl pb-6 pr-6 sm:pr-10" aria-hidden={algumShot ? undefined : true}>
      {/* Laptop */}
      <div className="rounded-t-xl border-[10px] border-b-[14px] border-[#1C1F27] bg-[#0B0D12] shadow-[0_0_70px_-12px_rgba(45,212,191,0.45)]">
        <div className="aspect-[16/10] overflow-hidden rounded-[2px]">
          <Tela
            arquivo="psicologia-desktop.png"
            existe={shots.desktop}
            alt="Tela do Nuvita Psicologia no computador"
            largura={1440}
            altura={900}
          />
        </div>
      </div>
      <div className="relative -mx-[6%] h-3 rounded-b-xl bg-gradient-to-b from-[#2A2E38] to-[#14161C]">
        <span className="absolute left-1/2 top-0 h-1.5 w-16 -translate-x-1/2 rounded-b-md bg-[#0B0D12]" />
      </div>

      {/* Celular */}
      <div className="absolute bottom-0 right-0 w-[24%] min-w-[84px] rounded-[1.4rem] border-[5px] border-[#1C1F27] bg-[#0B0D12] shadow-[0_0_40px_-8px_rgba(45,212,191,0.5)]">
        <div className="relative aspect-[9/19.5] overflow-hidden rounded-[1rem]">
          <Tela
            arquivo="psicologia-mobile.png"
            existe={shots.mobile}
            alt="Tela do Nuvita Psicologia no celular"
            largura={390}
            altura={844}
          />
          <span className="absolute left-1/2 top-1.5 h-1.5 w-8 -translate-x-1/2 rounded-full bg-[#0B0D12]" />
        </div>
      </div>
    </div>
  );
}
