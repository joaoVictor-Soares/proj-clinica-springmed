import { entrarNoApp } from '../../services/navegacao';

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { obterToken, obterUsuario } from '../../services/sessao';
import { get } from '../../services/api';
 
// Tela inicial do app. A biometria NÃO autentica na API: ela só destranca,
// neste aparelho, o token da sessão que já está guardada no cofre.
// Quem decide se o token vale é o servidor (conferimos com GET /perfil).
 
export default function LoginBiometrico({ navigation }) {
  const [verificando, setVerificando] = useState(true);
  const [temSessao, setTemSessao] = useState(false);
  const [podeUsarBiometria, setPodeUsarBiometria] = useState(false);
  const [autenticando, setAutenticando] = useState(false);
  const [nomeUsuario, setNomeUsuario] = useState(null);
  const [erro, setErro] = useState(null);
  const tentouAutomatico = useRef(false);
 
  useEffect(() => {
    let ativo = true;
 
    const verificar = async () => {
      try {
        const token = await obterToken();
        if (!ativo) return;
        setTemSessao(!!token);
 
        if (token) {
          const usuario = await obterUsuario();
          if (!ativo) return;
          setNomeUsuario(usuario?.nome ?? null);
 
          const temSensor = await LocalAuthentication.hasHardwareAsync();
          const temCadastro = await LocalAuthentication.isEnrolledAsync();
          if (!ativo) return;
          setPodeUsarBiometria(temSensor && temCadastro);
        }
      } catch (e) {
        if (ativo) setPodeUsarBiometria(false);
      } finally {
        if (ativo) setVerificando(false);
      }
    };
 
    verificar();
    return () => { ativo = false; };
  }, []);
 
  // Abre o prompt da biometria sozinho, uma única vez, quando tudo está pronto
  useEffect(() => {
    if (!verificando && podeUsarBiometria && !tentouAutomatico.current) {
      tentouAutomatico.current = true;
      entrarComBiometria();
    }
  }, [verificando, podeUsarBiometria]);
 
  const irParaSenha = () => navigation.navigate('Login');
 
  const entrarComBiometria = async () => {
    setErro(null);
    setAutenticando(true);
 
    try {
      const resultado = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirme sua digital para acessar os dados da clínica',
        cancelLabel: 'Usar senha',
      });
 
      if (!resultado.success) {
        if (resultado.error === 'user_cancel') return; // cancelar é escolha, não erro
        if (resultado.error === 'lockout') {
          setErro('Muitas tentativas. Aguarde um pouco ou entre com e-mail e senha.');
        } else {
          setErro('Não foi possível confirmar sua digital. Tente de novo ou use e-mail e senha.');
        }
        return;
      }
 
      // Biometria ok: confere se a sessão guardada ainda vale no servidor.
      try {
        await get('/perfil');
      } catch (e) {
        if (e.message.includes('401')) {
          // api.js já limpou a sessão
          setTemSessao(false);
          setPodeUsarBiometria(false);
          setNomeUsuario(null);
          setErro('Sua sessão expirou. Entre com e-mail e senha.');
        } else {
          setErro('Não foi possível conectar à API.');
        }
        return;
      }
 
      entrarNoApp(navigation);
    } catch (e) {
      setErro('A biometria não está disponível agora. Entre com e-mail e senha.');
    } finally {
      setAutenticando(false);
    }
  };
 
  if (verificando) {
    return (
      <View style={estilos.container}>
        <ActivityIndicator size="large" color="#1F3B57" />
      </View>
    );
  }
 
  return (
    <View style={estilos.container}>
      <Text style={estilos.titulo}>Clínica — Acesso Restrito</Text>
      {nomeUsuario && <Text style={estilos.saudacao}>Olá, {nomeUsuario}</Text>}
 
      {temSessao && podeUsarBiometria && (
        <TouchableOpacity
          style={[estilos.botao, autenticando && estilos.botaoDesativado]}
          onPress={entrarComBiometria}
          disabled={autenticando}
        >
          {autenticando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={estilos.botaoTexto}>Entrar com biometria</Text>
          )}
        </TouchableOpacity>
      )}
 
      {erro && <Text style={estilos.erro}>{erro}</Text>}
 
      {/* Botão de acesso com senha: presente em todos os estados */}
      <TouchableOpacity style={estilos.botaoSecundario} onPress={irParaSenha}>
        <Text style={estilos.botaoSecundarioTexto}>Entrar com senha</Text>
      </TouchableOpacity>
    </View>
  );
}
 
const estilos = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#fff' },
  titulo: { fontSize: 22, fontWeight: 'bold', marginBottom: 8, color: '#1F3B57', textAlign: 'center' },
  saudacao: { fontSize: 16, color: '#444', textAlign: 'center', marginBottom: 24 },
  botao: { backgroundColor: '#1F3B57', padding: 14, borderRadius: 6, alignItems: 'center', marginTop: 8 },
  botaoDesativado: { backgroundColor: '#8a9aa8' },
  botaoTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  botaoSecundario: {
    borderWidth: 1, borderColor: '#1F3B57', padding: 14, borderRadius: 6,
    alignItems: 'center', marginTop: 12,
  },
  botaoSecundarioTexto: { color: '#1F3B57', fontWeight: 'bold', fontSize: 16 },
  erro: { color: '#a33', marginTop: 12, textAlign: 'center' },
});
 
