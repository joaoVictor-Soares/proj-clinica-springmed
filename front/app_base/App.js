import React, { useEffect, useRef } from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from './src/screens/Login/LoginScreen';
import AcessoNegadoScreen from './src/screens/AcessoNegado/AcessoNegadoScreen';
import Splash from './src/screens/Splash/Splash';
import MenuScreen from './src/screens/Menu/MenuScreen';
import Medico from './src/screens/Medico/Medico';
import Paciente from './src/screens/Paciente/Paciente';
import CadastroEdicaoMedicoScreen from './src/screens/Medico/CadastroEdicaoMedicoScreen';
import PacienteForm from './src/components/PacienteForm';
import LoginBiometrico from './src/screens/Login/LoginBiometrico';
import Consulta from './src/screens/Consulta/Consulta';
import comPerfil from './src/components/RotaProtegida';
// Aulas 8 e 10 ↓
import AgendarConsulta from './src/screens/Consulta/AgendarConsulta';
import SincronizarAgenda from './src/screens/Agenda/SincronizarAgenda';
import { navigationRef, navegar } from './src/services/navegacao';
import { configurarHandler, prepararCanal, registrarToqueNotificacao } from './src/services/lembretes';

configurarHandler(); // uma vez, no topo (Aula 8)

const Stack = createNativeStackNavigator();

const EQUIPE = ['recepcao', 'medico'];

// Criadas fora do App para não remontar a cada render.
// Paciente (perfil 'paciente') só passa em Menu e Consultas.
const MedicoProtegido = comPerfil(Medico, EQUIPE);
// Médico já era barrado em Pacientes no MenuScreen original; mantemos a regra.
const PacientesProtegido = comPerfil(Paciente, ['recepcao']);
const PacienteFormProtegido = comPerfil(PacienteForm, ['recepcao']);
const MedicoFormProtegido = comPerfil(CadastroEdicaoMedicoScreen, EQUIPE);

const SincronizarProtegida = comPerfil(SincronizarAgenda, EQUIPE);

const EmConstrucao = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontSize: 24 }}>Em Construção!</Text>
  </View>
);

function App() {
  useEffect(() => { prepararCanal(); }, []);

  // Toque na notificação: Caminho A (listener) e B (app fechado). Registrado em onReady
  // e removido ao desmontar.
  const removerListener = useRef(null);
  const aoPronto = () => {
    removerListener.current = registrarToqueNotificacao((dados) =>
      navegar(dados.tela || 'Consultas', { consultaId: dados.consultaId }));
  };
  useEffect(() => () => removerListener.current?.(), []);

  return (
    <NavigationContainer ref={navigationRef} onReady={aoPronto}>
      {/* O app sempre abre no LoginBiometrico; ele mesmo encaminha para
          o Login por senha quando não há sessão no aparelho. */}
      <Stack.Navigator initialRouteName="LoginBiometrico">
        <Stack.Screen name="LoginBiometrico" component={LoginBiometrico} options={{ headerShown: false }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />

        <Stack.Screen name="Splash" component={Splash} options={{ headerShown: false }} />
        <Stack.Screen name="Menu" component={MenuScreen} options={{ title: 'Menu Principal' }} />

        <Stack.Screen name="Medicos" component={MedicoProtegido} options={{ title: 'Médico(a)s' }} />
        <Stack.Screen name="Pacientes" component={PacientesProtegido} options={{ title: 'Pacientes' }} />
        <Stack.Screen name="Consultas" component={Consulta} options={{ title: 'Consultas' }} />
        <Stack.Screen name="PacienteForm" component={PacienteFormProtegido} options={{ title: 'Formulário do Paciente' }} />
        <Stack.Screen name="MedicoForm" component={MedicoFormProtegido} options={{ title: 'Gerenciar Médico' }} />

        <Stack.Screen name="AgendarConsulta" component={AgendarConsulta} options={{ title: 'Agendar consulta' }} />
        <Stack.Screen name="SincronizarAgenda" component={SincronizarProtegida} options={{ title: 'Sincronizar agenda' }} />

        <Stack.Screen name="AcessoNegado" component={AcessoNegadoScreen} options={{ title: 'Acesso Negado' }} />
        <Stack.Screen name="EmConstrucao" component={EmConstrucao} options={{ title: 'Em Construção' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;