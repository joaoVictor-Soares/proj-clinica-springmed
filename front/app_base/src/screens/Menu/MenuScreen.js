import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
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

  // Recarrega as informações do usuário logado toda vez que o Menu ganha foco
  useEffect(() => {
    const carregarPerfil = async () => {
      const dadosUsuario = await obterUsuario();
      setUsuario(dadosUsuario);
    };
    if (isFocused) {
      carregarPerfil();
    }
  }, [isFocused]);

  // Controle de Permissão
  const handleNavegarPacientes = () => {
    if (usuario?.perfil === 'medico') {
      // Médico não possui permissão para ver pacientes -> Redireciona para Acesso Negado
      navigation.navigate('AcessoNegado');
    } else {
      // Recepção acessa normalmente
      navigation.navigate('Pacientes');
    }
  };

  // Função para deslogar e retornar à tela de Login
  const handleNovoLogin = async () => {
    await limparSessao();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  return (
    <View style={styles.container}>
      <Image style={styles.logo} source={Logo} />
      <Text style={styles.header}>
        Gerenciando sua Clínica {usuario?.nome ? `— Olá, ${usuario.nome}` : ''}
      </Text>
      
      <View style={styles.btns}>
        <Text style={styles.subtitulo}>Escolha qual seção deseja iniciar.</Text>

         <TouchableOpacity style={styles.botaoTrocarConta} onPress={handleNovoLogin}>
          <Text style={styles.textoBotaoTrocar}>Trocar de Conta / Sair</Text>
        </TouchableOpacity>
        
        <BotaoMenu
          icone={IconeMedic}
          titulo="Médico(a)s" 
          onPress={() => navigation.navigate('Medicos')}
        />
     
        <BotaoMenu
          icone={IconePaciente} 
          titulo="Pacientes" 
          onPress={handleNavegarPacientes}
        />
    
        <BotaoMenu 
          icone={IconeConsulta}
          titulo="Consultas" 
          onPress={() => navigation.navigate('EmConstrucao')}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column', 
    justifyContent: 'flex-start',
    padding: 20,
    backgroundColor: '#fff',
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
  btns: { marginTop: 40, flex: 1 },
  botaoTrocarConta: {
    backgroundColor: '#a33',
    padding: 14,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 24,
  },
  textoBotaoTrocar: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default MenuScreen;