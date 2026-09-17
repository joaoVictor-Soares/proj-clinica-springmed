import * as SecureStore from 'expo-secure-store';

const CHAVE_TOKEN = 'clinica.token';
const CHAVE_USUARIO = 'clinica.usuario';

export const salvarSessao = async (token, usuario) => {
  try {
    await SecureStore.setItemAsync(CHAVE_TOKEN, token);
    await SecureStore.setItemAsync(CHAVE_USUARIO, JSON.stringify(usuario));
  } catch (e) {
    console.log('Erro ao salvar no cofre:', e.message);
  }
};

export const obterToken = async () => {
  try {
    return await SecureStore.getItemAsync(CHAVE_TOKEN);
  } catch (e) {
    return null;
  }
};

export const obterUsuario = async () => {
  try {
    const usuarioStr = await SecureStore.getItemAsync(CHAVE_USUARIO);
    return usuarioStr ? JSON.parse(usuarioStr) : null;
  } catch (e) {
    return null;
  }
};

export const limparSessao = async () => {
  try {
    await SecureStore.deleteItemAsync(CHAVE_TOKEN);
    await SecureStore.deleteItemAsync(CHAVE_USUARIO);
  } catch (e) {
    console.log('Erro ao limpar cofre:', e.message);
  }
};

export const estaLogado = async () => {
  const token = await obterToken();
  return !!token;
};