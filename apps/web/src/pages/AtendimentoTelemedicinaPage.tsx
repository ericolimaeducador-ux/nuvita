import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { teleAcessoApi } from '@/api/resources';
import { brand } from '@/lib/brand';
import {
  MODALIDADE_LABEL,
  PapelSala,
  StatusSala,
  TipoEventoSala,
  TipoSinal,
  type ModalidadeAtendimento,
  type SalaAcessoInfo,
  type SinalSala,
} from '@/types';

type Fase = 'carregando' | 'indisponivel' | 'lobby' | 'chamada' | 'finalizada';
type EstadoConexao = 'aguardando' | 'conectando' | 'conectado' | 'reconectando';

const ESTADO_CONEXAO_LABEL: Record<EstadoConexao, string> = {
  aguardando: 'Aguardando o outro participante',
  conectando: 'Conectando…',
  conectado: 'Conectado',
  reconectando: 'Reconectando…',
};

function formatarDuracao(inicio: Date, agora: Date): string {
  const total = Math.max(0, Math.floor((agora.getTime() - inicio.getTime()) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Sala de atendimento por vídeo (WebRTC ponto-a-ponto).
 *
 * A página é pública: o token UUID do link é a credencial (paciente entra sem
 * login). A sinalização SDP/ICE vai por HTTP polling na API — o Firebase
 * Hosting na frente do Cloud Run não aceita WebSocket — e a mídia flui direto
 * entre os dois navegadores, criptografada (DTLS-SRTP), sem passar pelo servidor.
 *
 * Protocolo: o profissional é sempre quem oferta. O paciente anuncia PRONTO ao
 * entrar e o profissional responde com uma (re)oferta com ICE restart — isso
 * cobre entrada em qualquer ordem, refresh de página e reconexões.
 */
export function AtendimentoTelemedicinaPage() {
  const { token = '' } = useParams();

  const [fase, setFase] = useState<Fase>('carregando');
  const [mensagemFinal, setMensagemFinal] = useState('');
  const [info, setInfo] = useState<SalaAcessoInfo | null>(null);
  const [erroMidia, setErroMidia] = useState('');
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [conexao, setConexao] = useState<EstadoConexao>('aguardando');
  const [remotoPresente, setRemotoPresente] = useState(false);
  const [duracao, setDuracao] = useState('00:00');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const lobbyVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const lastSinalRef = useRef<string | undefined>(undefined);
  const pollRef = useRef<number | null>(null);
  const pollBusyRef = useRef(false);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const teveQuedaRef = useRef(false);
  const inicioRef = useRef<Date | null>(null);
  const faseRef = useRef<Fase>('carregando');
  const midiaSolicitadaRef = useRef(false);

  faseRef.current = fase;
  const papel = info?.papel;

  // ---- carga inicial: estado da sala pelo token ----
  useEffect(() => {
    let ativo = true;
    teleAcessoApi
      .info(token)
      .then((data) => {
        if (!ativo) return;
        setInfo(data);
        if (data.status === StatusSala.ENCERRADA) {
          setMensagemFinal('Este atendimento já foi encerrado.');
          setFase('indisponivel');
        } else if (data.status === StatusSala.EXPIRADA || new Date(data.expiresAt) < new Date()) {
          setMensagemFinal('O link deste atendimento expirou.');
          setFase('indisponivel');
        } else {
          setFase('lobby');
        }
      })
      .catch(() => {
        if (!ativo) return;
        setMensagemFinal('Link de atendimento inválido.');
        setFase('indisponivel');
      });
    return () => {
      ativo = false;
    };
  }, [token]);

  // ---- lobby: liga a câmera para o participante se ver antes de entrar ----
  useEffect(() => {
    if (fase !== 'lobby' || midiaSolicitadaRef.current) return;
    midiaSolicitadaRef.current = true;

    navigator.mediaDevices
      .getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true })
      .then((stream) => {
        localStreamRef.current = stream;
        if (lobbyVideoRef.current) lobbyVideoRef.current.srcObject = stream;
      })
      .catch(() => {
        setErroMidia(
          'Não foi possível acessar câmera e microfone. Verifique as permissões do navegador e recarregue a página.',
        );
        void teleAcessoApi.evento(token, TipoEventoSala.MIDIA_NEGADA).catch(() => undefined);
      });
  }, [fase, token]);

  const limparConexao = useCallback(() => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
  }, []);

  const finalizar = useCallback(
    (mensagem: string) => {
      limparConexao();
      setMensagemFinal(mensagem);
      setFase('finalizada');
      // Atualiza o ref já: o polling checa faseRef no mesmo tick e não pode
      // sobrescrever esta mensagem com a genérica de status.
      faseRef.current = 'finalizada';
    },
    [limparConexao],
  );

  const enviarSinal = useCallback(
    (tipo: TipoSinal, payload: unknown) =>
      teleAcessoApi.enviarSinal(token, tipo, payload).catch(() => undefined),
    [token],
  );

  const criarOferta = useCallback(
    async (iceRestart: boolean) => {
      const pc = pcRef.current;
      if (!pc) return;
      const offer = await pc.createOffer(iceRestart ? { iceRestart: true } : undefined);
      await pc.setLocalDescription(offer);
      await enviarSinal(TipoSinal.OFFER, { type: offer.type, sdp: offer.sdp });
    },
    [enviarSinal],
  );

  const processarSinal = useCallback(
    async (sinal: SinalSala) => {
      const pc = pcRef.current;
      if (!pc) return;

      if (sinal.tipo === TipoSinal.PRONTO && papel === PapelSala.PROFISSIONAL) {
        // Paciente entrou (ou voltou): renegocia do zero com ICE restart.
        await criarOferta(true);
        return;
      }

      if (sinal.tipo === TipoSinal.OFFER && papel === PapelSala.PACIENTE) {
        await pc.setRemoteDescription(sinal.payload as RTCSessionDescriptionInit);
        for (const c of pendingCandidatesRef.current) {
          await pc.addIceCandidate(c).catch(() => undefined);
        }
        pendingCandidatesRef.current = [];
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await enviarSinal(TipoSinal.ANSWER, { type: answer.type, sdp: answer.sdp });
        return;
      }

      if (sinal.tipo === TipoSinal.ANSWER && papel === PapelSala.PROFISSIONAL) {
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(sinal.payload as RTCSessionDescriptionInit);
          for (const c of pendingCandidatesRef.current) {
            await pc.addIceCandidate(c).catch(() => undefined);
          }
          pendingCandidatesRef.current = [];
        }
        return;
      }

      if (sinal.tipo === TipoSinal.CANDIDATE) {
        const candidate = sinal.payload as RTCIceCandidateInit;
        if (pc.remoteDescription) {
          await pc.addIceCandidate(candidate).catch(() => undefined);
        } else {
          pendingCandidatesRef.current.push(candidate);
        }
        return;
      }

      if (sinal.tipo === TipoSinal.BYE) {
        const motivo = (sinal.payload as { motivo?: string } | null)?.motivo;
        if (motivo === 'encerrada') {
          finalizar('O atendimento foi encerrado pelo profissional.');
        } else {
          setRemotoPresente(false);
          setConexao('aguardando');
        }
      }
    },
    [papel, criarOferta, enviarSinal, finalizar],
  );

  const processarSinalRef = useRef(processarSinal);
  processarSinalRef.current = processarSinal;

  const consultarSinais = useCallback(async () => {
    if (pollBusyRef.current) return;
    pollBusyRef.current = true;
    try {
      const { status, sinais } = await teleAcessoApi.sinais(token, lastSinalRef.current);
      for (const sinal of sinais) {
        lastSinalRef.current = sinal.id;
        await processarSinalRef.current(sinal).catch(() => undefined);
      }
      // Rede de segurança: se o BYE se perdeu, o status do servidor finaliza a tela.
      if (
        (status === StatusSala.ENCERRADA || status === StatusSala.EXPIRADA) &&
        faseRef.current === 'chamada'
      ) {
        finalizar('O atendimento foi encerrado.');
      }
    } catch (err) {
      // 403 = sala encerrada/expirada no servidor (cobre o caso de o BYE se perder).
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 403 && faseRef.current === 'chamada') {
        finalizar('O atendimento foi encerrado.');
      }
    } finally {
      pollBusyRef.current = false;
    }
  }, [token, finalizar]);

  const registrarEvento = useCallback(
    (tipo: TipoEventoSala, detalhes?: string) =>
      teleAcessoApi.evento(token, tipo, detalhes).catch(() => undefined),
    [token],
  );

  const entrarNaChamada = useCallback(async () => {
    const stream = localStreamRef.current;
    if (!stream || !info) return;

    const { iceServers } = await teleAcessoApi.entrar(token);

    // Descarta a sinalização de negociações anteriores: o protocolo PRONTO →
    // oferta nova garante que tudo que importa é gerado a partir de agora.
    const historico = await teleAcessoApi.sinais(token);
    lastSinalRef.current = historico.sinais[historico.sinais.length - 1]?.id;

    const pc = new RTCPeerConnection({ iceServers });
    pcRef.current = pc;
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.onicecandidate = (event) => {
      if (event.candidate) void enviarSinal(TipoSinal.CANDIDATE, event.candidate.toJSON());
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
      setRemotoPresente(true);
    };

    pc.onconnectionstatechange = () => {
      const estado = pc.connectionState;
      if (estado === 'connected') {
        if (!inicioRef.current) inicioRef.current = new Date();
        if (teveQuedaRef.current) {
          teveQuedaRef.current = false;
          void registrarEvento(TipoEventoSala.RECONECTOU);
        }
        setConexao('conectado');
      } else if (estado === 'disconnected') {
        teveQuedaRef.current = true;
        setConexao('reconectando');
        void registrarEvento(TipoEventoSala.DESCONECTOU);
      } else if (estado === 'failed') {
        teveQuedaRef.current = true;
        setConexao('reconectando');
        void registrarEvento(TipoEventoSala.FALHA_CONEXAO, 'Negociação ICE falhou');
        if (info.papel === PapelSala.PROFISSIONAL) void criarOferta(true);
      }
    };

    setFase('chamada');
    setConexao(info.papel === PapelSala.PROFISSIONAL ? 'aguardando' : 'conectando');

    if (localVideoRef.current) localVideoRef.current.srcObject = stream;

    if (info.papel === PapelSala.PROFISSIONAL) {
      await criarOferta(false);
    } else {
      await enviarSinal(TipoSinal.PRONTO, {});
    }

    pollRef.current = window.setInterval(() => void consultarSinais(), 1200);
  }, [info, token, enviarSinal, criarOferta, consultarSinais, registrarEvento]);

  // ---- encerrar (profissional) / sair (paciente) ----
  const sairOuEncerrar = useCallback(async () => {
    if (papel === PapelSala.PROFISSIONAL) {
      if (!window.confirm('Encerrar o atendimento para todos?')) return;
      await registrarEvento(TipoEventoSala.ENCERRADA);
      finalizar('Atendimento encerrado. O registro completo fica disponível na página de Telemedicina.');
    } else {
      await registrarEvento(TipoEventoSala.SAIU);
      await enviarSinal(TipoSinal.BYE, { motivo: 'saiu' });
      finalizar('Você saiu do atendimento. Se foi engano, abra o link novamente para voltar.');
    }
  }, [papel, registrarEvento, enviarSinal, finalizar]);

  // ---- fechar a aba no meio da chamada conta como saída ----
  useEffect(() => {
    const handler = () => {
      if (faseRef.current === 'chamada') teleAcessoApi.eventoBeacon(token, TipoEventoSala.SAIU);
    };
    window.addEventListener('pagehide', handler);
    return () => window.removeEventListener('pagehide', handler);
  }, [token]);

  // ---- cleanup ao desmontar ----
  useEffect(() => limparConexao, [limparConexao]);

  // ---- prende o stream local ao PiP quando a tela de chamada monta ----
  // (na hora do "entrar" o <video> da chamada ainda não existe no DOM)
  useEffect(() => {
    if (fase === 'chamada' && localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [fase]);

  // ---- cronômetro ----
  useEffect(() => {
    if (fase !== 'chamada') return;
    const id = window.setInterval(() => {
      if (inicioRef.current) setDuracao(formatarDuracao(inicioRef.current, new Date()));
    }, 1000);
    return () => window.clearInterval(id);
  }, [fase]);

  function alternarMic() {
    const stream = localStreamRef.current;
    if (!stream) return;
    const ligado = !micOn;
    stream.getAudioTracks().forEach((t) => (t.enabled = ligado));
    setMicOn(ligado);
  }

  function alternarCam() {
    const stream = localStreamRef.current;
    if (!stream) return;
    const ligado = !camOn;
    stream.getVideoTracks().forEach((t) => (t.enabled = ligado));
    setCamOn(ligado);
  }

  const tituloModalidade = info
    ? `Teleatendimento — ${MODALIDADE_LABEL[info.modalidade as ModalidadeAtendimento] ?? info.modalidade}`
    : 'Teleatendimento';

  // ---------- telas ----------

  if (fase === 'carregando') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">
        <p>Carregando…</p>
      </div>
    );
  }

  if (fase === 'indisponivel' || fase === 'finalizada') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <img src={brand.logo.light} alt={brand.nome} className="h-10 mx-auto" />
          <h1 className="text-xl font-semibold text-white">{tituloModalidade}</h1>
          <p className="text-slate-300">{mensagemFinal}</p>
        </div>
      </div>
    );
  }

  if (fase === 'lobby') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
        <div className="max-w-lg w-full space-y-5">
          <div className="text-center space-y-2">
            <img src={brand.logo.light} alt={brand.nome} className="h-10 mx-auto" />
            <h1 className="text-xl font-semibold text-white">{tituloModalidade}</h1>
            <p className="text-sm text-slate-400">
              Confira sua câmera e microfone antes de entrar.
            </p>
          </div>

          <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
            <video
              ref={lobbyVideoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover -scale-x-100"
            />
            {erroMidia && (
              <div className="absolute inset-0 flex items-center justify-center p-6 bg-slate-900/95">
                <p className="text-sm text-amber-400 text-center">{erroMidia}</p>
              </div>
            )}
          </div>

          <Button className="w-full" size="lg" disabled={!!erroMidia} onClick={() => void entrarNaChamada()}>
            Entrar no atendimento
          </Button>
        </div>
      </div>
    );
  }

  // fase === 'chamada'
  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 h-full w-full object-cover" />

      {!remotoPresente && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
          <div className="text-center space-y-3">
            <img src={brand.logo.light} alt={brand.nome} className="h-8 mx-auto opacity-80" />
            <p className="text-slate-300">{ESTADO_CONEXAO_LABEL[conexao]}</p>
            <p className="text-xs text-slate-500">
              {papel === PapelSala.PROFISSIONAL
                ? 'Envie o link ao paciente caso ainda não tenha enviado.'
                : 'O profissional entrará em instantes.'}
            </p>
          </div>
        </div>
      )}

      <div className="absolute top-0 inset-x-0 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-slate-950/90 to-transparent">
        <div className="flex items-center gap-3">
          <img src={brand.mark.light} alt="" className="h-7" />
          <div>
            <p className="text-sm font-medium text-white leading-tight">{tituloModalidade}</p>
            <p className="text-xs text-slate-400 leading-tight">{ESTADO_CONEXAO_LABEL[conexao]}</p>
          </div>
        </div>
        {inicioRef.current && (
          <span className="text-sm font-mono text-slate-200 bg-slate-900/70 rounded-md px-2 py-1">{duracao}</span>
        )}
      </div>

      <div className="absolute bottom-24 right-4 w-36 sm:w-44 aspect-video rounded-lg overflow-hidden border border-slate-700 shadow-lg bg-slate-900">
        <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover -scale-x-100" />
        {!camOn && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <VideoOff className="h-6 w-6 text-slate-500" />
          </div>
        )}
      </div>

      <div className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-3 px-4 py-5 bg-gradient-to-t from-slate-950/90 to-transparent">
        <Button
          variant={micOn ? 'secondary' : 'destructive'}
          size="icon"
          className="h-12 w-12 rounded-full"
          onClick={alternarMic}
          title={micOn ? 'Desativar microfone' : 'Ativar microfone'}
        >
          {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </Button>
        <Button
          variant={camOn ? 'secondary' : 'destructive'}
          size="icon"
          className="h-12 w-12 rounded-full"
          onClick={alternarCam}
          title={camOn ? 'Desligar câmera' : 'Ligar câmera'}
        >
          {camOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </Button>
        <Button
          variant="destructive"
          size="icon"
          className="h-12 w-12 rounded-full"
          onClick={() => void sairOuEncerrar()}
          title={papel === PapelSala.PROFISSIONAL ? 'Encerrar atendimento' : 'Sair do atendimento'}
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
