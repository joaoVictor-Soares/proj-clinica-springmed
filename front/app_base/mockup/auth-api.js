// auth-api.js - API mock de autenticacao da clinica
//
// Rode com:   node auth-api.js   (sobe em http://0.0.0.0:3001)
// Este arquivo precisa ficar na MESMA pasta do db.json.
//
// Endpoints:
//   POST /login      { email, senha }  -> 200 { token, usuario } | 401
//   GET  /perfil     (Bearer token)    -> 200 {...} | 401
//   GET  /medicos    (Bearer token)    -> 200 [...] | 401 | 403 (paciente)
//   GET  /consultas  (Bearer token)    -> recepcao/medico: todas | paciente: so as dele
//
// ATENCAO - servidor didatico, NAO e modelo de producao (senhas em texto puro,
// token em memoria, HTTP sem TLS).

const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORTA = 3001;

// perfil: 'recepcao' | 'medico' | 'paciente'
// Usuarios com perfil 'paciente' apontam para o paciente do db.json via pacienteId.
const USUARIOS = [
  { id: 1, email: 'recepcao@clinica.com', senha: 'clinica123', nome: 'Recepção', perfil: 'recepcao' },
  { id: 2, email: 'joao@clinica.com', senha: 'medico123', nome: 'Dr. João de Oliveira', perfil: 'medico' },
  { id: 3, email: 'juliana@exemplo.com', senha: 'paciente123', nome: 'Juliana Alves', perfil: 'paciente', pacienteId: '7' },
  { id: 4, email: 'jvtrgmlcmsoares@gmail.com', senha: 'paciente123', nome: 'João Victor', perfil: 'paciente', pacienteId: 'VLiU-P21n5c' },
];

const SESSOES = new Map();

function json(res, status, corpo) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  res.end(JSON.stringify(corpo));
}

function lerCorpo(req) {
  return new Promise((resolve) => {
    let dados = '';
    req.on('data', (pedaco) => { dados += pedaco; });
    req.on('end', () => {
      try { resolve(JSON.parse(dados || '{}')); } catch (e) { resolve(null); }
    });
  });
}

// Le o db.json a cada chamada, assim edicoes feitas pelo json-server aparecem aqui.
function lerDb() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'db.json'), 'utf8'));
}

function usuarioDoToken(req) {
  const cabecalho = req.headers['authorization'] || '';
  const token = cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : null;
  if (!token) return null;
  const id = SESSOES.get(token);
  if (!id) return null;
  return USUARIOS.find((u) => u.id === id) || null;
}

function dadosPublicos(u) {
  return { id: u.id, nome: u.nome, perfil: u.perfil, pacienteId: u.pacienteId ?? null };
}

const servidor = http.createServer(async (req, res) => {
  const rota = req.url.split('?')[0];
  console.log(`${req.method} ${rota}`);

  if (req.method === 'OPTIONS') return json(res, 204, {});

  if (req.method === 'POST' && rota === '/login') {
    const corpo = await lerCorpo(req);
    if (!corpo || !corpo.email || !corpo.senha) {
      return json(res, 400, { erro: 'Informe e-mail e senha.' });
    }
    const usuario = USUARIOS.find((u) => u.email === corpo.email && u.senha === corpo.senha);
    if (!usuario) return json(res, 401, { erro: 'E-mail ou senha inválidos.' });

    const token = crypto.randomBytes(24).toString('hex');
    SESSOES.set(token, usuario.id);
    return json(res, 200, { token, usuario: dadosPublicos(usuario) });
  }

  if (req.method === 'GET' && ['/medicos', '/perfil', '/consultas'].includes(rota)) {
    const usuario = usuarioDoToken(req);
    if (!usuario) return json(res, 401, { erro: 'Token ausente ou inválido.' });

    if (rota === '/perfil') return json(res, 200, dadosPublicos(usuario));

    if (rota === '/medicos') {
      if (usuario.perfil === 'paciente') return json(res, 403, { erro: 'Acesso negado.' });
      return json(res, 200, lerDb().medicos);
    }

    // /consultas: o filtro do paciente e feito AQUI, no servidor.
    // Esconder a tela no app nao basta: quem controla o acesso e a API.
    const db = lerDb();
    let lista = db.consultas;
    if (usuario.perfil === 'paciente') {
      lista = lista.filter((c) => String(c.pacienteId) === String(usuario.pacienteId));
    }
    const resposta = lista.map((c) => {
      const m = db.medicos.find((x) => String(x.id) === String(c.medicoId));
      const p = db.pacientes.find((x) => String(x.id) === String(c.pacienteId));
      return {
        ...c,
        medico: m ? { id: m.id, nome: m.nome, especialidade: m.especialidade, crm: m.crm } : null,
        paciente: p ? { id: p.id, nome: p.nome, telefone: p.telefone, email: p.email } : null,
      };
    });
    return json(res, 200, resposta);
  }

  json(res, 404, { erro: 'Rota não encontrada.' });
});

servidor.listen(PORTA, '0.0.0.0', () => {
  console.log(`API da clínica em http://localhost:${PORTA}`);
  USUARIOS.forEach((u) => console.log(`  ${u.perfil.padEnd(9)} ${u.email} / ${u.senha}`));
});