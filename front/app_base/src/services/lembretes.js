// src/services/lembretes.js
// Único ponto do app que fala com expo-notifications. Nenhuma tela importa a biblioteca.
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CHAVE_MAPA = 'clinica.lembretes'; // { [consultaId]: identificadorDaNotificacao } — não é segredo
const CANAL_ID = 'lembretes';
export const ANTECEDENCIA_PADRAO_MIN = 60;
export const TELA_DESTINO = 'Consultas';

// ---------- Inicialização (chamar uma vez no topo do App.js) ----------
export function configurarHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function prepararCanal() {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(CANAL_ID, {
      name: 'Lembretes de consulta',
      importance: Notifications.AndroidImportance.HIGH,
      // Campos explícitos: em algumas versões do módulo nativo, deixar `sound`/vibração
      // indefinidos causa NullPointerException no Android.
      sound: 'default',
      enableVibrate: true,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#007AFF',
    });
  } catch (e) {
    // Não derruba o app: sem o canal, o Android usa o canal padrão (menos destaque).
    console.warn('[lembretes] não foi possível criar o canal:', e.message);
  }
}

export async function garantirPermissao() {
  const atual = await Notifications.getPermissionsAsync();
  if (atual.granted) return true;
  if (!atual.canAskAgain) return false; // negou "para sempre": não insistir
  const pedido = await Notifications.requestPermissionsAsync();
  return pedido.granted;
}

// ---------- Vínculo consultaId -> identificador (AsyncStorage) ----------
// Fila simples: evita duas operações lerem/gravarem o mapa ao mesmo tempo.
let fila = Promise.resolve();
const serializar = (fn) => {
  const r = fila.then(fn, fn);
  fila = r.catch(() => {});
  return r;
};

const lerMapa = async () => {
  try {
    return JSON.parse((await AsyncStorage.getItem(CHAVE_MAPA)) || '{}');
  } catch {
    return {};
  }
};
const gravarMapa = (mapa) => AsyncStorage.setItem(CHAVE_MAPA, JSON.stringify(mapa));

// ---------- Cálculo do horário ----------
export function dataHoraDaConsulta(consulta) {
  const [a, m, d] = String(consulta.data).split('-').map(Number);
  const [h, min] = String(consulta.hora).split(':').map(Number);
  return new Date(a, m - 1, d, h, min, 0);
}

export function horarioDoLembrete(consulta, antecedenciaMin = ANTECEDENCIA_PADRAO_MIN) {
  return new Date(dataHoraDaConsulta(consulta).getTime() - antecedenciaMin * 60 * 1000);
}

// true se o lembrete ainda vai acontecer (horário no futuro)
export const lembretePossivel = (consulta, antecedenciaMin = ANTECEDENCIA_PADRAO_MIN) =>
  horarioDoLembrete(consulta, antecedenciaMin).getTime() > Date.now() + 1000;

// ---------- Texto: NÃO expõe dado sensível na tela bloqueada ----------
// Sem nome de médico, especialidade ou motivo. Ver README (decisão do Passo 6).
const textoDoLembrete = (consulta) => ({
  title: 'Lembrete de consulta',
  body: `Você tem uma consulta às ${consulta.hora}.`,
});

// ---------- Agendar / cancelar ----------
export function cancelarLembrete(consultaId) {
  return serializar(async () => {
    const mapa = await lerMapa();
    const chave = String(consultaId);
    const id = mapa[chave];
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
      delete mapa[chave];
      await gravarMapa(mapa);
    }
  });
}

// Versão detalhada: diz POR QUE não agendou (a tela usa isso para ser honesta com o paciente).
export function agendarLembreteDetalhado(consulta, antecedenciaMin = ANTECEDENCIA_PADRAO_MIN) {
  return serializar(async () => {
    const chave = String(consulta.id);
    const mapa = await lerMapa();

    // Um lembrete por consulta: remove o anterior ANTES de criar o novo.
    if (mapa[chave]) {
      await Notifications.cancelScheduledNotificationAsync(mapa[chave]).catch(() => {});
      delete mapa[chave];
      await gravarMapa(mapa);
    }

    if (!lembretePossivel(consulta, antecedenciaMin)) return { ok: false, motivo: 'passou', id: null };
    if (!(await garantirPermissao())) return { ok: false, motivo: 'sem_permissao', id: null };

    const quando = horarioDoLembrete(consulta, antecedenciaMin);
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        ...textoDoLembrete(consulta),
        data: { consultaId: chave, tela: TELA_DESTINO },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: quando,
        channelId: CANAL_ID,
      },
    });

    mapa[chave] = id;
    await gravarMapa(mapa);
    return { ok: true, motivo: 'ok', id, quando };
  });
}

// Contrato do exercício: devolve o identificador (ou null se não agendou).
export const agendarLembrete = async (consulta, antecedenciaMin) =>
  (await agendarLembreteDetalhado(consulta, antecedenciaMin)).id;

// ---------- Extensão: sincronizar com a lista vinda do servidor ----------
// Cancela lembretes de consultas que não existem mais (ex.: cancelada pela recepção)
// e agenda os que faltam.
export async function sincronizarLembretes(consultas, antecedenciaMin = ANTECEDENCIA_PADRAO_MIN) {
  const vivas = consultas.filter((c) => c.status === 'agendada');
  const idsVivos = new Set(vivas.map((c) => String(c.id)));

  const mapa = await lerMapa();
  for (const consultaId of Object.keys(mapa)) {
    if (!idsVivos.has(consultaId)) await cancelarLembrete(consultaId);
  }

  const pendentes = new Set((await Notifications.getAllScheduledNotificationsAsync()).map((n) => n.identifier));
  const mapaAtual = await lerMapa();
  for (const c of vivas) {
    const existente = mapaAtual[String(c.id)];
    if (existente && pendentes.has(existente)) continue;
    if (lembretePossivel(c, antecedenciaMin)) await agendarLembreteDetalhado(c, antecedenciaMin);
  }
}

// ---------- Depuração / prova do cancelamento (Passo 3, item 17) ----------
export const listarAgendadas = () => Notifications.getAllScheduledNotificationsAsync();

// ---------- Toque na notificação ----------
let ultimoTratado = null; // guarda: o "último toque" continua disponível após tratado

// Caminho A (app aberto/segundo plano): listener.
// Caminho B (app fechado): getLastNotificationResponseAsync() na inicialização.
export function registrarToqueNotificacao(aoTocar) {
  const tratar = (resposta) => {
    const identificador = resposta?.notification?.request?.identifier;
    if (!identificador || identificador === ultimoTratado) return;
    ultimoTratado = identificador;
    const dados = resposta.notification.request.content.data;
    if (dados?.consultaId) aoTocar(dados);
  };

  const assinatura = Notifications.addNotificationResponseReceivedListener(tratar);
  Notifications.getLastNotificationResponseAsync().then(tratar);

  return () => assinatura.remove(); // sem vazamento de listener
}