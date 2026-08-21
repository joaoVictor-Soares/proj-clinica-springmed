// src/screens/Paciente/Op1Screen.js
import { useFocusEffect } from '@react-navigation/native';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  SectionList, 
  TouchableOpacity, 
  Platform,
  LayoutAnimation,
  UIManager,
  Button,
  Image,
  ActivityIndicator
} from 'react-native';

const IconeLupa = require('../../../assets/lupa.png');
const IconeSeta = require('../../../assets/seta.png');

const BASE_URL = 'http://10.110.12.44:3000';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

// =========================================================================
// FUNÇÃO AUXILIAR PARA AGRUPAR E FILTRAR OS PACIENTES
// =========================================================================
const groupAndFilterPacientes = (pacientes, searchText) => {
  if (!pacientes) return [];

  const filteredPacientes = pacientes.filter(paciente => 
    paciente.nome.toLowerCase().includes(searchText.toLowerCase()) || 
    paciente.cpf.includes(searchText)
  );

  const grouped = filteredPacientes.reduce((acc, paciente) => {
    const firstLetter = paciente.nome[0].toUpperCase();
    if (!acc[firstLetter]) {
      acc[firstLetter] = [];
    }
    acc[firstLetter].push(paciente);
    return acc;
  }, {});

  const sections = Object.keys(grouped)
    .sort()
    .map(letter => ({
      title: letter,
      data: grouped[letter],
    }));

  return sections;
};

// =========================================================================
// COMPONENTE CARD EXPANSÍVEL DO PACIENTE
// =========================================================================
const PacienteCard = ({ paciente, navigation }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  return (
    <View style={cardStyles.card}>
      {/* SEÇÃO PRINCIPAL VISÍVEL */}
      <TouchableOpacity onPress={toggleExpand} style={cardStyles.mainInfo}>
        <View>
          <Text style={cardStyles.nome}>{paciente.nome}</Text>
          <Text style={cardStyles.subtitulo}>CPF: {paciente.cpf}</Text>
        </View>
        
        <Image
          source={IconeSeta}
          style={[
            cardStyles.arrowIcon,
            { transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] },
          ]}
        />
      </TouchableOpacity>

      {/* SEÇÃO EXPANSÍVEL (Detalhes) */}
      {isExpanded && (
        <View style={cardStyles.details}>
          <Text style={cardStyles.detailText}>Nascimento: {paciente.dataNascimento}</Text>
          <Text style={cardStyles.detailText}>Telefone: {paciente.telefone}</Text>
          <Text style={cardStyles.detailText}>Email: {paciente.email}</Text>
          
          <View style={cardStyles.actionButtons}>
            <Button
              title="Editar"
              onPress={() => navigation.navigate('PacienteForm', paciente)}
            />
            <Button
              title="Desativar Perfil"
              color="red"
              onPress={() => navigation.navigate('EmConstrucao')} 
            />
          </View>
        </View>
      )}
    </View>
  );
};

// =========================================================================
// TELA PRINCIPAL
// =========================================================================
const Paciente = ({ navigation }) => {
  const [pacientes, setPacientes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [searchText, setSearchText] = useState('');

  // Busca pacientes no servidor backend
  const buscarPacientes = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const resposta = await fetch(`${BASE_URL}/pacientes`);
      if (!resposta.ok) {
        throw new Error(`Erro HTTP ${resposta.status}`);
      }
      const dados = await resposta.json();
      setPacientes(dados);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  };

    useFocusEffect(
      useCallback(() => {
        buscarPacientes();
      }, [])
    );

  const sections = useMemo(() => groupAndFilterPacientes(pacientes, searchText), [pacientes, searchText]);

  return (
    <View style={styles.container}>
      
      {/* CAMPO PESQUISAR */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Pesquisar por Nome ou CPF"
          value={searchText}
          onChangeText={setSearchText}
        />
        <Image source={IconeLupa} style={styles.searchIcon} />
      </View>

      {/* TRATAMENTO DE STATUS DA API */}
      {carregando && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text>Carregando pacientes...</Text>
        </View>
      )}

      {erro && (
        <View style={styles.centerContainer}>
          <Text style={styles.erroText}>Falha ao carregar: {erro}</Text>
          <Button title="Tentar Novamente" onPress={buscarPacientes} />
        </View>
      )}

      {/* LISTA ROLÁVEL */}
      {!carregando && !erro && (
        <View style={styles.listWrapper}>
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => <PacienteCard paciente={item} navigation={navigation} />}
            renderSectionHeader={({ section: { title } }) => (
              <Text style={styles.sectionHeader}>{title}</Text>
            )}
            contentContainerStyle={styles.sectionListContent}
            stickySectionHeadersEnabled={true}
          />
        </View>
      )}

      {/* BOTÃO FIXO */}
      <View style={styles.fixedButtonContainer}>
        <Button
          title="Cadastrar Novo Paciente"
          onPress={() => navigation.navigate('PacienteForm')}
        />
      </View>
    </View>
  );
};

// =========================================================================
// ESTILOS
// =========================================================================
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5', 
    padding: 10 
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
  },
  searchIcon: {
    width: 20,
    height: 20,
    marginLeft: 10,
    tintColor: '#aaa',
  },
  listWrapper: {
    flex: 1, 
  },
  sectionListContent: {
    paddingBottom: 10,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    backgroundColor: '#f5f5f5',
    paddingVertical: 5,
    paddingHorizontal: 10,
    color: '#333',
  },
  fixedButtonContainer: {
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    marginBottom: 25,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  erroText: {
    color: 'red',
    marginBottom: 10,
  }
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginVertical: 5,
    marginHorizontal: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
  },
  mainInfo: {
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nome: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  subtitulo: {
    fontSize: 14,
    color: '#555',
  },
  arrowIcon: {
    width: 15,
    height: 15,
    tintColor: '#007AFF',
  },
  details: {
    padding: 15,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  detailText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#333',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  }
});

export default Paciente;