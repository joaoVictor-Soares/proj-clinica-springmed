// src/services/httpExterno.js

const USER_AGENT = 'AplicMobileSenai-Aula05/1.0 (material didatico)';
const TIMEOUT_MS = 8000;

// Erro customizado para identificar qual serviço falhou na interface
export class ServicoExternoIndisponivel extends Error {
  constructor(nomeServico, message) {
    super(message);
    this.name = 'ServicoExternoIndisponivel';
    this.nomeServico = nomeServico;
  }
}

export async function buscarExterno(nomeServico, url, opcoes = {}) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TIMEOUT_MS);

  // Define User-Agent sem incluir tokens de autenticação internos
  const headers = {
    'User-Agent': USER_AGENT,
    ...(opcoes.headers || {}),
  };

  try {
    const resposta = await fetch(url, {
      ...opcoes,
      headers,
      signal: controlador.signal,
    });

    // Tratamento de limite de requisições (HTTP 429)
    if (resposta.status === 429) {
      throw new ServicoExternoIndisponivel(
        nomeServico,
        'Muitas requisições seguidas. Aguarde um instante e tente novamente.'
      );
    }

    if (!resposta.ok) {
      throw new ServicoExternoIndisponivel(
        nomeServico,
        `O serviço ${nomeServico} recusou a consulta (HTTP ${resposta.status}).`
      );
    }

    return resposta;
  } catch (erro) {
    // Converte AbortError para mensagem amigável de tempo esgotado
    if (erro.name === 'AbortError') {
      throw new ServicoExternoIndisponivel(
        nomeServico,
        `Tempo de resposta esgotado ao consultar ${nomeServico}.`
      );
    }

    if (erro instanceof ServicoExternoIndisponivel) {
      throw erro;
    }

    throw new ServicoExternoIndisponivel(
      nomeServico,
      `Falha de conexão com ${nomeServico}: ${erro.message}`
    );
  } finally {
    clearTimeout(temporizador);
  }
}