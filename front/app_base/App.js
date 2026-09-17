import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Serviços de Sessão
import { estaLogado } from './src/services/sessao';

// Importação das Telas
import LoginScreen from './src/screens/Login/LoginScreen';
import AcessoNegadoScreen from './src/screens/AcessoNegado/AcessoNegadoScreen';
import Splash from './src/screens/Splash/Splash';
import MenuScreen from './src/screens/Menu/MenuScreen';
import Medico from './src/screens/Medico/Medico';
import Paciente from './src/screens/Paciente/Paciente';
import CadastroEdicaoMedicoScreen from './src/screens/Medico/CadastroEdicaoMedicoScreen';
import PacienteForm from './src/components/PacienteForm';

const Stack = createStackNavigator();

function App() {
  const [medicos, setMedicos] = useState([
    {id:1, "nome":"João de Oliveira", "especialidade":"Cardiologista", "crm": "12345/MG", "email": "joao@clinica.com", "telefone": "(31) 98765-4321", "endereco": "Rua A, 100"},
    {id:2, "nome":"Antônio de Oliveira", "especialidade":"Pediatra", "crm": "23456/MG", "email": "antonio@clinica.com", "telefone": "(31) 99876-5432", "endereco": "Av. B, 200"},
    {id:3, "nome":"Maria da Silva", "especialidade":"Dermatologista", "crm": "34567/SP", "email": "maria@clinica.com", "telefone": "(11) 97654-3210", "endereco": "Rua C, 300"},
    {id:4, "nome":"Beatriz Souza", "especialidade":"Ginecologista", "crm": "45678/RJ", "email": "beatriz@clinica.com", "telefone": "(21) 96543-2109", "endereco": "Av. D, 400"},
    {id:5, "nome":"Carlos Santos", "especialidade":"Neurologista", "crm": "56789/BA", "email": "carlos@clinica.com", "telefone": "(71) 95432-1098", "endereco": "Praça E, 500"},
  ]);

  const [verificandoSessao, setVerificandoSessao] = useState(true);
  const [usuarioLogado, setUsuarioLogado] = useState(false);

  // Verifica se há token salvo antes de carregar a interface inicial
  useEffect(() => {
    const checarSessao = async () => {
      const logado = await estaLogado();
      setUsuarioLogado(logado);
      setVerificandoSessao(false);
    };
    checarSessao();
  }, []);

  const MedicoList = (props) => (
    <Medico {...props} medicos={medicos} />
  );

  // Tela de carregamento enquanto valida a sessão
  if (verificandoSessao) {
    return (
      <View style={styles.carregandoContainer}>
        <ActivityIndicator size="large" color="#1F3B57" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={usuarioLogado ? 'Menu' : 'Login'}>
        {/* Rota de Login */}
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }} 
        />

        <Stack.Screen name="Splash" component={Splash} options={{ headerShown: false }} />
        <Stack.Screen name="Menu" component={MenuScreen} options={{ title: 'Menu Principal' }} />
        
        {/* Rotas protegidas da aplicação */}
        <Stack.Screen name="Medicos" component={MedicoList} options={{ title: 'Médico(a)s' }} />
        <Stack.Screen name="Pacientes" component={Paciente} options={{ title: 'Pacientes' }} />
        <Stack.Screen 
          name="PacienteForm" 
          component={PacienteForm} 
          options={{ title: 'Formulário do Paciente' }}
        />
        <Stack.Screen name="MedicoForm" component={CadastroEdicaoMedicoScreen} options={{ title: 'Gerenciar Médico' }} />

        {/* Rota de Acesso Recusado / Negado */}
        <Stack.Screen 
          name="AcessoNegado" 
          component={AcessoNegadoScreen} 
          options={{ title: 'Acesso Negado' }} 
        />

        <Stack.Screen name="EmConstrucao" component={() => (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 24 }}>Em Construção!</Text>
            </View>
        )} options={{ title: 'Em Construção' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  carregandoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

export default App;