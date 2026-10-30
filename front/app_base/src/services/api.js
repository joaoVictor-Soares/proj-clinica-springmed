import { obterToken, limparSessao } from './sessao.js';
import { JSON_URL, AUTH_URL } from '../config';

// Rotas atendidas pela auth-api (porta 3001): login e leituras filtradas por perfil.
// Todo o resto (e toda escrita) vai para o json-server (porta 3000).
const ROTAS_AUTH_GET = ['/perfil', '/consultas', '/medicos'];

const baseDe = (caminho, metodo = 'GET') => {
  if (caminho === '/login') return AUTH_URL;
  if (metodo === 'GET' && ROTAS_AUTH_GET.includes(caminho.split('?')[0])) return AUTH_URL;
  return JSON_URL;
};

export const requisicao = async (caminho, opcoes = {}, baseForcada) => {
  const metodo = opcoes.method || 'GET';
  const token = await obterToken();
  const headers = { ...opcoes.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (opcoes.body && typeof opcoes.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }

  const base = baseForcada || baseDe(caminho, metodo);
  const resposta = await fetch(`${base}${caminho}`, { ...opcoes, headers });

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
export const patch = (caminho, body) => requisicao(caminho, { method: 'PATCH', body: JSON.stringify(body) });
export const del = (caminho) => requisicao(caminho, { method: 'DELETE' });

// Leitura direta no json-server (sem filtro de perfil). Usada para listar médicos/pacientes
// na tela de agendamento, já que a auth-api devolve 403 em /medicos para o paciente.
export const getJson = (caminho) => requisicao(caminho, { method: 'GET' }, JSON_URL);
