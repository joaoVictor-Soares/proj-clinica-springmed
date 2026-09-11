import { obterToken, limparSessao } from './sessao';

// Se for testar no Expo Go no celular físico, troque localhost pelo IP da sua máquina
const BASE_URL = 'http://192.168.1.9:3001';

export const requisicao = async (caminho, opcoes = {}) => {
  const token = await obterToken();
  const headers = { ...opcoes.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (opcoes.body && typeof opcoes.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }

  const resposta = await fetch(`${BASE_URL}${caminho}`, { ...opcoes, headers });

  if (resposta.status === 401) {
    await limparSessao();
    throw new Error('401');
  }

  if (!resposta.ok) {
    throw new Error(`Erro HTTP ${resposta.status}`);
  }

  if (resposta.status === 204) return null;

  return await resposta.json();
};

export const get = (caminho) => requisicao(caminho, { method: 'GET' });
export const post = (caminho, body) => requisicao(caminho, { method: 'POST', body: JSON.stringify(body) });