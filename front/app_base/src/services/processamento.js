// src/services/processamento.js
// Trabalho pesado SEM monopolizar a (única) thread de JS: fatiar e ceder a vez.
// Não é paralelismo — é boa educação com o event loop.

// setTimeout (macrotarefa) deixa a tela repintar e atender toques entre as fatias.
// Promise.resolve() (microtarefa) NÃO serviria: microtarefas rodam antes da renderização.
export const cederAVez = () => new Promise((resolve) => setTimeout(resolve, 0));

// Mesmo espírito do AbortController (Aula 5), mas para CPU em vez de rede.
export function criarSinalDeCancelamento() {
  return {
    cancelado: false,
    cancelar() {
      this.cancelado = true;
    },
  };
}

/**
 * Processa `itens` em fatias, cedendo a vez entre elas.
 * @param {Array} itens
 * @param {(item, indice) => void} processarItem  trabalho síncrono por item
 * @param {{tamanhoFatia?: number, onProgresso?: (fracao, feitos, total) => void, sinal?: {cancelado: boolean}}} opcoes
 * @returns {Promise<{cancelado: boolean, processados: number}>}
 */
export async function processarEmFatias(itens, processarItem, opcoes = {}) {
  const { tamanhoFatia = 500, onProgresso, sinal } = opcoes;
  const total = itens.length;

  for (let inicio = 0; inicio < total; inicio += tamanhoFatia) {
    if (sinal?.cancelado) {
      console.log(`[processamento] cancelado: laço parou no item ${inicio} de ${total}`);
      return { cancelado: true, processados: inicio };
    }
    const fim = Math.min(inicio + tamanhoFatia, total);
    for (let i = inicio; i < fim; i++) processarItem(itens[i], i);

    onProgresso?.(fim / total, fim, total);
    await cederAVez();
  }

  if (sinal?.cancelado) return { cancelado: true, processados: total };
  return { cancelado: false, processados: total };
}
