# 06 — Telemedicina (tema 4)

> Executado: navegação completa como psicólogo, criação de sala pela tela, e **chamada de vídeo real entre dois
> navegadores na mesma máquina** com câmera/microfone falsos do Chromium. Screenshots em `../screenshots/telemedicina/`.

## O que foi e o que NÃO foi verificado
| Verificado | Como |
|---|---|
| Criar sala (UI e API), copiar link, encerrar | tela + API local |
| Paciente entra **sem login**, em janela sem sessão | contexto de navegador limpo (`storage` vazio) |
| Chamada de vídeo conecta e transmite nos dois lados | dois navegadores locais, mídia falsa: ambos mostram "Conectado", 2 trilhas por lado, vídeo tocando (640 e 1280 px) |
| Expiração (4 h), reutilização do link, enumeração, encerramento | API local (cap. 10) |
| **NÃO verificado** | câmera/microfone reais; redes diferentes e NAT (a conexão local usa candidatos diretos); servidor TURN em produção; qualidade/latência; entrada de mais de 2 pessoas; gravação (não há) |

## Telemedicina — `/telemedicina`
**Perfis com acesso:** psicólogo, admin (e super-admin com clínica). Secretária não tem o módulo.
**O que faz:** cria e gerencia a sala de vídeo de um agendamento e mostra o histórico de atendimentos por data.
**Screenshot:**

![telemedicina/02-tela](../screenshots/telemedicina/02-tela.png)

![telemedicina/03-nova-sala](../screenshots/telemedicina/03-nova-sala.png)

![telemedicina/04-nova-sala-agendamentos](../screenshots/telemedicina/04-nova-sala-agendamentos.png)

![telemedicina/05-sala-criada](../screenshots/telemedicina/05-sala-criada.png)

**Campos e ações:** **Nova sala** (Agendamento, Modalidade); "Buscar sala por agendamento"; cartão da sala com
situação (Aguardando…), paciente + CPF, Modalidade, Criada em, **Expira em** (4 horas depois), **Entrar na sala
(profissional)**, **Copiar link do paciente**, **Encerrar**, "Registro do atendimento"; "Histórico de atendimentos"
por data/paciente.
**Estado:** FUNCIONA
**Observado:** sala criada ("Sala criada com sucesso."). A tela diz "Envie o link ao paciente por WhatsApp ou
e-mail — ele entra direto pelo navegador, sem login. O link expira em 21:16." Ao criar a sala o sistema também
**enfileira um e-mail** ao paciente com o link; localmente a notificação ficou "pendente"/"falhou" (sem provedor).
**Falta:** conferir na tela o que o paciente vê quando o link expirou.
**Comentário do Erico:** _

## Sala do paciente — `/tele/:token`
**Perfis com acesso:** **qualquer pessoa com o link** (rota pública).
**O que faz:** tela de entrada ("Confira sua câmera e microfone antes de entrar") e a chamada.
**Screenshot:**

![telemedicina/01-sala-paciente-janela-anonima](../screenshots/telemedicina/01-sala-paciente-janela-anonima.png)

![telemedicina/06-chamada-lado-profissional](../screenshots/telemedicina/06-chamada-lado-profissional.png)

![telemedicina/07-chamada-lado-paciente](../screenshots/telemedicina/07-chamada-lado-paciente.png)

**Campos e ações:** botão "Entrar no atendimento"; durante a chamada "Conectado" + cronômetro.
**Estado:** FUNCIONA COM RESSALVA
**Observado:** a tela não mostra o nome do paciente nem da clínica, só "Teleatendimento — Psicologia". O **link do
profissional** (`tokenMedico`) usa a mesma rota pública: quem tiver esse link entra como profissional sem login.
Com muitas tentativas inválidas a tela mostra **"Link de atendimento inválido."** também quando o motivo é o limite
de requisições (HTTP 429), o que confunde.
**Falta:** sala de espera/confirmação de identidade; mensagem própria para "muitas tentativas"; token de uso único.
**Comentário do Erico:** _

Os achados de segurança do token estão no capítulo 10 (item B.1).
