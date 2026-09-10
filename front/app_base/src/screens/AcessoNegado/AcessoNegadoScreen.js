import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function AcessoNegadoScreen({ navigation }) {
  return (
    <View style={estilos.container}>
      <Text style={estilos.titulo}>Acesso Negado 🚫</Text>
      <Text style={estilos.mensagem}>
        Seu perfil de **Médico** não tem permissão para visualizar a lista de pacientes.
      </Text>
      <TouchableOpacity style={estilos.botao} onPress={() => navigation.navigate('Menu')}>
        <Text style={estilos.botaoTexto}>Voltar ao Menu</Text>
      </TouchableOpacity>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#fff' },
  titulo: { fontSize: 24, fontWeight: 'bold', color: '#a33', marginBottom: 12 },
  mensagem: { fontSize: 16, color: '#555', textAlign: 'center', marginBottom: 24 },
  botao: { backgroundColor: '#1F3B57', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 6 },
  botaoTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});