import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { salvarSessao } from '../../services/sessao';
import { post } from '../../services/api';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('recepcao@clinica.com');
  const [senha, setSenha] = useState('');
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState(null);

  const entrar = async () => {
    setErro(null);
    if (!email.trim() || !senha) {
      setErro('Preencha e-mail e senha.');
      return;
    }

    setEntrando(true);
    try {
      const dados = await post('/login', { email: email.trim(), senha });
      await salvarSessao(dados.token, dados.usuario);
      setSenha('');
      
      navigation.reset({
        index: 0,
        routes: [{ name: 'Menu' }],
      });
    } catch (e) {
      if (e.message.includes('401')) {
        setErro('E-mail ou senha inválidos.');
      } else {
        setErro('Não foi possível conectar à API.');
      }
    } finally {
      setEntrando(false);
    }
  };

  return (
    <View style={estilos.container}>
      <Text style={estilos.titulo}>Clínica — Acesso Restrito</Text>

      <Text style={estilos.rotulo}>E-mail</Text>
      <TextInput style={estilos.campo} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />

      <Text style={estilos.rotulo}>Senha</Text>
      <TextInput style={estilos.campo} value={senha} onChangeText={setSenha} secureTextEntry autoCapitalize="none" />

      {erro && <Text style={estilos.erro}>{erro}</Text>}

      <TouchableOpacity style={[estilos.botao, entrando && estilos.botaoDesativado]} onPress={entrar} disabled={entrando}>
        {entrando ? <ActivityIndicator color="#fff" /> : <Text style={estilos.botaoTexto}>Entrar</Text>}
      </TouchableOpacity>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#fff' },
  titulo: { fontSize: 22, fontWeight: 'bold', marginBottom: 24, color: '#1F3B57', textAlign: 'center' },
  rotulo: { fontSize: 14, color: '#444', marginBottom: 4 },
  campo: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10, marginBottom: 14, fontSize: 16 },
  botao: { backgroundColor: '#1F3B57', padding: 14, borderRadius: 6, alignItems: 'center', marginTop: 8 },
  botaoDesativado: { backgroundColor: '#8a9aa8' },
  botaoTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  erro: { color: '#a33', marginBottom: 12, textAlign: 'center' },
});