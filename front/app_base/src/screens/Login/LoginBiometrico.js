import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { obterToken, obterUsuario } from '../../services/sessao';

// IDEIA CENTRAL: a biometria NÃO autentica na API da clínica.
// Ela só destranca, neste aparelho, o token que a Aula 4 já guardou no cofre.
// Quem diz "esta pessoa pode entrar" continua sendo o servidor.

export default function LoginBiometrico({ navigation }) {
  const [verificando, setVerificando] = useState(true);
  const [podeUsarBiometria, setPodeUsarBiometria] = useState(false);
  const [autenticando, setAutenticando] = useState(false);
  const [nomeUsuario, setNomeUsuario] = useState(null);
  const [erro, setErro] = useState(null);

  // Passo 12: as três checagens iniciais
  useEffect(() => {
    let ativo = true;

    const verificar = async () => {
      try {
        const temSensor = await LocalAuthentication.hasHardwareAsync();
        const temCadastro = await LocalAuthentication.isEnrolledAsync();
        const token = await obterToken();

        if (!ativo) return;

        // Passo 13: sem token não há sessão para destrancar
        if (!token) {
          navigation.replace('Login');
          return;
        }

        const usuario = await obterUsuario();
        if (!ativo) return;
        setNomeUsuario(usuario?.nome ?? null);

        // Passo 14: botão só com sensor + biometria cadastrada + token
        setPodeUsarBiometria(temSensor && temCadastro);
      } catch (e) {
        // Qualquer falha nas checagens: segue sem biometria, o app continua usável
        if (ativo) setPodeUsarBiometria(false);
      } finally {
        if (ativo) setVerificando(false);
      }
    };

    verificar();
    return () => {
      ativo = false;
    };
  }, [navigation]);

  const entrarComBiometria = async () => {
    setErro(null);
    setAutenticando(true);

    try {
      // Passo 15: promptMessage explica o que está sendo liberado;
      // cancelLabel aponta a saída alternativa.
      const resultado = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirme sua digital para acessar os dados da clínica',
        cancelLabel: 'Usar e-mail e senha',
      });

      if (resultado.success) {
        // Passo 18: reset para o Menu, como na Aula 4
        navigation.reset({
          index: 0,
          routes: [{ name: 'Menu' }],
        });
        return;
      }

      // Passo 16: cancelar é escolha, não erro — nenhuma mensagem
      if (resultado.error === 'user_cancel') {
        return;
      }

      if (resultado.error === 'lockout') {
        setErro('Muitas tentativas. Aguarde um pouco ou entre com e-mail e senha.');
      } else {
        setErro('Não foi possível confirmar sua digital. Tente de novo ou use e-mail e senha.');
      }
    } catch (e) {
      setErro('A biometria não está disponível agora. Entre com e-mail e senha.');
    } finally {
      setAutenticando(false);
    }
  };

  // Passo 17: este link existe em TODOS os estados da tela
  const linkEmailSenha = (
    <TouchableOpacity style={estilos.link} onPress={() => navigation.navigate('Login')}>
      <Text style={estilos.linkTexto}>Entrar com e-mail e senha</Text>
    </TouchableOpacity>
  );

  if (verificando) {
    return (
      <View style={estilos.container}>
        <ActivityIndicator size="large" color="#1F3B57" />
        {linkEmailSenha}
      </View>
    );
  }

  return (
    <View style={estilos.container}>
      <Text style={estilos.titulo}>Clínica — Acesso Restrito</Text>
      {nomeUsuario && <Text style={estilos.saudacao}>Olá, {nomeUsuario}</Text>}

      {podeUsarBiometria && (
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

      {linkEmailSenha}
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
  erro: { color: '#a33', marginTop: 12, textAlign: 'center' },
  link: { marginTop: 20, padding: 8, alignItems: 'center' },
  linkTexto: { color: '#1F3B57', fontSize: 15, textDecorationLine: 'underline' },
});