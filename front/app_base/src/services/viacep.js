// src/services/viacep.js
import { buscarExterno, ServicoExternoIndisponivel } from './httpExterno';

export async function consultarCep(cepDigitado) {
  const cep = (cepDigitado || '').replace(/\D/g, '');

  if (cep.length !== 8) {
    throw new Error('CEP deve conter exatamente 8 dígitos.');
  }

  const resposta = await buscarExterno('ViaCEP', `https://viacep.com.br/ws/${cep}/json/`);

  let dados;
  try {
    dados = await resposta.json();
  } catch (e) {
    // Caso em que a API responde 400 em HTML em vez de JSON
    throw new ServicoExternoIndisponivel('ViaCEP', 'Resposta inválida recebida do servidor.');
  }

  // Tratamento do erro de negócio do ViaCEP (HTTP 200 com { "erro": "true" })
  if (dados.erro === true || dados.erro === 'true') {
    throw new Error('CEP não encontrado.');
  }

  // Tradução dos atributos para o vocabulário da aplicação
  return {
    logradouro: dados.logradouro || '',
    bairro: dados.bairro || '',
    cidade: dados.localidade || '', // 'localidade' vira 'cidade'
    uf: dados.uf || '',
  };
}