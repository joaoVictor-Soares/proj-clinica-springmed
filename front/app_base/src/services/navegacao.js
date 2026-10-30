// src/services/navegacao.js — navegar de fora das telas (toque em notificação).
import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

// Telas anteriores à autenticação: o toque na notificação NÃO pode pular biometria/login.
const TELAS_DE_ACESSO = ['LoginBiometrico', 'Login', 'Splash'];
let pendente = null;

export function navegar(nome, params) {
  if (!navigationRef.isReady()) { pendente = { nome, params }; return; }
  const atual = navigationRef.getCurrentRoute()?.name;
  if (!atual || TELAS_DE_ACESSO.includes(atual)) {
    pendente = { nome, params }; // guarda até o usuário se autenticar
    return;
  }
  navigationRef.navigate(nome, params);
}

// Use no lugar de reset para 'Menu' após autenticar: se houve toque em notificação, abre a consulta.
export function entrarNoApp(navigation) {
  const p = pendente;
  pendente = null;
  navigation.reset({
    index: p ? 1 : 0,
    routes: p ? [{ name: 'Menu' }, { name: p.nome, params: p.params }] : [{ name: 'Menu' }],
  });
}
