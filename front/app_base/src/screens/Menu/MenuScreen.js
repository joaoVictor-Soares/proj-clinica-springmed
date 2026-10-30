import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import BotaoMenu from '../../components/BotaoMenu'; 
import { obterUsuario, limparSessao } from '../../services/sessao';

const Logo = require('../../../assets/logo.png');
const IconeMedic = require('../../../assets/usuario-md.png');
const IconePaciente = require('../../../assets/utilizador.png');
const IconeConsulta = require('../../../assets/calendario.png');

const MenuScreen = ({ navigation }) => {
  const [usuario, setUsuario] = useState(null);
  const isFocused = useIsFocused();

  useEffect(() => {
    const carregarPerfil = async () => {
      const dadosUsuario = await obterUsuario();
      setUsuario(dadosUsuario);
    };
    if (isFocused) {
      carregarPerfil();
    }
  }, [isFocused]);

  const perfil = usuario?.perfil;
  const ehPaciente = perfil === 'paciente';

  const handleNavegarPacientes = () => {
    if (perfil === 'medico') {
      navigation.navigate('AcessoNegado');
    } else {
      navigation.navigate('Pacientes');
    }
  };

  // Bloquear: mantém a sessão no aparelho e volta para a biometria
  const handleBloquear = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'LoginBiometrico' }],
    });
  };

  // Sair: apaga a sessão e exige e-mail e senha de novo
  const handleSair = async () => {
    await limparSessao();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Image style={styles.logo} source={Logo} />
        <Text style={styles.header}>
          Gerenciando sua Clínica {usuario?.nome ? `— Olá, ${usuario.nome}` : ''}
        </Text>
        
        <View style={styles.btns}>
          <Text style={styles.subtitulo}>Escolha qual seção deseja iniciar.</Text>
          
          {/* Paciente só vê Consultas (as dele) */}
          {!ehPaciente && (
            <BotaoMenu
              icone={IconeMedic}
              titulo="Médico(a)s" 
              onPress={() => navigation.navigate('Medicos')}
            />
          )}

          {!ehPaciente && (
            <BotaoMenu
              icone={IconePaciente} 
              titulo="Pacientes" 
              onPress={handleNavegarPacientes}
            />
          )}
      
          <BotaoMenu 
            icone={IconeConsulta}
            titulo={ehPaciente ? 'Minhas Consultas' : 'Consultas'}
            onPress={() => navigation.navigate('Consultas')}
          />

          {!ehPaciente && (
            <TouchableOpacity style={styles.botaoSincronizar} onPress={() => navigation.navigate('SincronizarAgenda')}>
              <Text style={styles.textoBotaoSincronizar}>Sincronizar agenda (conflitos)</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.botaoBloquear} onPress={handleBloquear}>
            <Text style={styles.textoBotaoBloquear}>Bloquear (voltar à biometria)</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.botaoTrocarConta} onPress={handleSair}>
            <Text style={styles.textoBotaoTrocar}>Trocar de Conta / Sair</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1, 
    padding: 20,
  },
  logo: {
    width: '50%',
    height: 100, 
    resizeMode: 'contain',
    alignSelf: 'flex-start',
    marginBottom: 1,
  },
  header: { fontSize: 14, textAlign: 'left', fontWeight: 'bold', color: '#1F3B57' },
  subtitulo: { fontSize: 12, color: '#666', marginBottom: 15 },
  btns: { 
    marginTop: 40,
  },
  botaoSincronizar: {
    backgroundColor: '#1F3B57',
    padding: 14,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 16,
  },
  textoBotaoSincronizar: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  botaoBloquear: {
    borderWidth: 1,
    borderColor: '#1F3B57',
    padding: 14,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 24,
  },
  textoBotaoBloquear: {
    color: '#1F3B57',
    fontWeight: 'bold',
    fontSize: 16,
  },
  botaoTrocarConta: {
    backgroundColor: '#a33',
    padding: 14,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  textoBotaoTrocar: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default MenuScreen;