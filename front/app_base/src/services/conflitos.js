// src/services/conflitos.js
// Verificação de conflitos de agenda: mesmo médico + horários que se sobrepõem.
import { processarEmFatias } from './processamento';

// ---------- Preparação ----------
// Aceita { dataHora } (ISO) ou { data: 'AAAA-MM-DD', hora: 'HH:MM' } (formato atual do db.json).
// Horário sem "Z" é interpretado como local, igual no app e no Node.
export function paraIntervalo(c) {
  const inicio = c.dataHora ? Date.parse(c.dataHora) : Date.parse(`${c.data}T${c.hora}:00`);
  const duracao = Number(c.duracaoMinutos) || 30;
  return { id: String(c.id), medicoId: String(c.medicoId), inicio, fim: inicio + duracao * 60000 };
}

const ativas = (consultas) =>
  consultas.filter((c) => c.status !== 'cancelada' && c.status !== 'realizada').map(paraIntervalo);

// Passo 3, item 11 — cuidado com a condição de sobreposição.
export const conflita = (a, b) =>
  a.medicoId === b.medicoId && a.inicio < b.fim && b.inicio < a.fim;

const par = (a, b) => (a.id < b.id ? [a.id, b.id] : [b.id, a.id]);

// ---------- Passo 2: versão INGÊNUA (todas × todas), bloqueante ----------
export function detectarConflitosIngenuo(consultas) {
  const lista = ativas(consultas);
  const conflitos = [];
  let comparacoes = 0;
  for (let i = 0; i < lista.length; i++) {
    for (let j = i + 1; j < lista.length; j++) {
      comparacoes++;
      if (conflita(lista[i], lista[j])) conflitos.push(par(lista[i], lista[j]));
    }
  }
  return { conflitos, comparacoes, total: lista.length };
}

// ---------- Passo 3: algoritmo melhor (agrupa por médico + ordena por horário) ----------
function agruparEOrdenar(lista) {
  const porMedico = new Map();
  for (const c of lista) {
    if (!porMedico.has(c.medicoId)) porMedico.set(c.medicoId, []);
    porMedico.get(c.medicoId).push(c);
  }
  for (const agenda of porMedico.values()) agenda.sort((a, b) => a.inicio - b.inicio);
  return porMedico;
}

// Compara a consulta i com as seguintes enquanto ainda começam antes de ela terminar.
// Só comparar com a imediatamente seguinte perderia casos como:
//   A 09:00-10:00, B 09:15-09:30, C 09:30-09:45  → A conflita com B e com C.
// Como a agenda está ordenada, assim que uma seguinte começa depois do fim de i, as demais também.
function conflitosDaConsulta(agenda, i, conflitos) {
  let comparacoes = 0;
  for (let j = i + 1; j < agenda.length; j++) {
    comparacoes++;
    if (agenda[j].inicio >= agenda[i].fim) break;
    if (conflita(agenda[i], agenda[j])) conflitos.push(par(agenda[i], agenda[j]));
  }
  return comparacoes;
}

// Versão melhorada, síncrona (usada na medição do Passo 3).
export function detectarConflitosRapido(consultas) {
  const lista = ativas(consultas);
  const conflitos = [];
  let comparacoes = 0;
  for (const agenda of agruparEOrdenar(lista).values()) {
    for (let i = 0; i < agenda.length; i++) comparacoes += conflitosDaConsulta(agenda, i, conflitos);
  }
  return { conflitos, comparacoes, total: lista.length };
}

// ---------- Passo 4: versão melhorada + fatiada (a que a tela usa) ----------
export async function detectarConflitos(consultas, { tamanhoFatia = 500, onProgresso, sinal } = {}) {
  const lista = ativas(consultas);
  const porMedico = agruparEOrdenar(lista);

  // Achata em tarefas (agenda, índice). A fatia conta consultas, então a tela respira
  // várias vezes por médico — e não só uma vez a cada médico.
  const tarefas = [];
  for (const agenda of porMedico.values()) {
    for (let i = 0; i < agenda.length; i++) tarefas.push([agenda, i]);
  }

  const conflitos = [];
  let comparacoes = 0;
  const estado = await processarEmFatias(
    tarefas,
    ([agenda, i]) => { comparacoes += conflitosDaConsulta(agenda, i, conflitos); },
    { tamanhoFatia, onProgresso, sinal },
  );

  return { conflitos, comparacoes, total: lista.length, cancelado: estado.cancelado };
}

// ---------- Passo 3, item 16: as duas versões precisam achar OS MESMOS conflitos ----------
export const chavesDeConflitos = (conflitos) => conflitos.map(([a, b]) => `${a}|${b}`).sort();

export function mesmosConflitos(a, b) {
  const ka = chavesDeConflitos(a);
  const kb = chavesDeConflitos(b);
  return ka.length === kb.length && ka.every((k, i) => k === kb[i]);
}
