// src/screens/Consulta/Consulta.js
import React, { useState, useMemo, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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

const BASE_URL = 'http://192.168.1.5:3000';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

// =========================================================================
// CONSTANTES
// =========================================================================
const FILTROS = [
  { chave: 'todas', rotulo: 'Todas' },
  { chave: 'agendada', rotulo: 'Agendadas' },
  { chave: 'realizada', rotulo: 'Realizadas' },
  { chave: 'cancelada', rotulo: 'Canceladas' },
];

const STATUS = {
  agendada: { rotulo: 'Agendada', cor: '#1F7A3F', fundo: '#E3F4E8' },
  realizada: { rotulo: 'Realizada', cor: '#1F3B57', fundo: '#E1EAF3' },
  cancelada: { rotulo: 'Cancelada', cor: '#a33', fundo: '#F9E3E3' },
};

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// =========================================================================
// FUNÇÕES AUXILIARES
// =========================================================================

// '2026-10-05' -> 'Seg, 05/10/2026' (sem usar new Date(string), que muda o dia por fuso)
const formatarData = (iso) => {
  if (!iso) return 'Sem data';
  const [ano, mes, dia] = iso.split('-').map(Number);
  const diaSemana = DIAS_SEMANA[new Date(ano, mes - 1, dia).getDay()];
  return `${diaSemana}, ${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}`;
};

// A consulta guarda só medicoId e pacienteId; aqui juntamos com os dados completos.
// String(id) porque no mock os ids são texto e em outras bases podem ser número.
const montarConsultas = (consultas, medicos, pacientes) => {
  const porMedico = new Map(medicos.map((m) => [String(m.id), m]));
  const porPaciente = new Map(pacientes.map((p) => [String(p.id), p]));

  return consultas.map((c) => ({
    ...c,
    medico: porMedico.get(String(c.medicoId)) || null,
    paciente: porPaciente.get(String(c.pacienteId)) || null,
  }));
};

const filtrarEAgrupar = (consultas, searchText, filtro) => {
  const texto = searchText.trim().toLowerCase();

  const filtradas = consultas
    .filter((c) => {
      if (filtro !== 'todas' && c.status !== filtro) return false;
      if (!texto) return true;
      return (
        (c.paciente?.nome || '').toLowerCase().includes(texto) ||
        (c.medico?.nome || '').toLowerCase().includes(texto) ||
        (c.medico?.especialidade || '').toLowerCase().includes(texto)
      );
    })
    .sort((a, b) => `${a.data} ${a.hora}`.localeCompare(`${b.data} ${b.hora}`));

  // Já ordenadas por data, então os grupos saem em ordem cronológica
  const grupos = new Map();
  filtradas.forEach((c) => {
    if (!grupos.has(c.data)) grupos.set(c.data, []);
    grupos.get(c.data).push(c);
  });

  return Array.from(grupos.entries()).map(([data, itens]) => ({
    title: formatarData(data),
    data: itens,
  }));
};

// =========================================================================
// COMPONENTE CARD EXPANSÍVEL
// =========================================================================
const ConsultaCard = ({ consulta }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  const status = STATUS[consulta.status] || STATUS.agendada;
  const { paciente, medico } = consulta;

  return (
    <View style={cardStyles.card}>
      <TouchableOpacity onPress={toggleExpand} style={cardStyles.mainInfo}>
        <View style={cardStyles.textos}>
          <Text style={cardStyles.hora}>{consulta.hora}</Text>
          <Text style={cardStyles.nome}>{paciente?.nome || 'Paciente não encontrado'}</Text>
          <Text style={cardStyles.subtitulo}>
            {medico ? `${medico.nome} | ${medico.especialidade}` : 'Médico não encontrado'}
          </Text>
          <View style={[cardStyles.badge, { backgroundColor: status.fundo }]}>
            <Text style={[cardStyles.badgeTexto, { color: status.cor }]}>{status.rotulo}</Text>
          </View>
        </View>
        <Image
          source={IconeSeta}
          style={[
            cardStyles.arrowIcon,
            { transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] },
          ]}
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={cardStyles.details}>
          <Text style={cardStyles.detailText}>Motivo: {consulta.motivo || 'Não informado'}</Text>
          {medico && <Text style={cardStyles.detailText}>CRM: {medico.crm}</Text>}
          {paciente && (
            <>
              <Text style={cardStyles.detailText}>Telefone do paciente: {paciente.telefone}</Text>
              <Text style={cardStyles.detailText}>E-mail do paciente: {paciente.email}</Text>
            </>
          )}
        </View>
      )}
    </View>
  );
};

// =========================================================================
// TELA PRINCIPAL
// =========================================================================
const Consulta = () => {
  const [consultas, setConsultas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [filtro, setFiltro] = useState('todas');

  const buscarConsultas = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [respConsultas, respMedicos, respPacientes] = await Promise.all([
        fetch(`${BASE_URL}/consultas`),
        fetch(`${BASE_URL}/medicos`),
        fetch(`${BASE_URL}/pacientes`),
      ]);

      if (!respConsultas.ok || !respMedicos.ok || !respPacientes.ok) {
        throw new Error('Erro ao buscar consultas');
      }

      const [dadosConsultas, dadosMedicos, dadosPacientes] = await Promise.all([
        respConsultas.json(),
        respMedicos.json(),
        respPacientes.json(),
      ]);

      setConsultas(montarConsultas(dadosConsultas, dadosMedicos, dadosPacientes));
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  };

  // Recarrega sempre que a tela ganha foco (ex.: voltando de outra tela)
  useFocusEffect(
    useCallback(() => {
      buscarConsultas();
    }, [])
  );

  const sections = useMemo(
    () => filtrarEAgrupar(consultas, searchText, filtro),
    [consultas, searchText, filtro]
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Pesquisar Paciente, Médico ou Especialidade"
          value={searchText}
          onChangeText={setSearchText}
        />
        <Image source={IconeLupa} style={styles.searchIcon} />
      </View>

      <View style={styles.filtros}>
        {FILTROS.map((f) => (
          <TouchableOpacity
            key={f.chave}
            style={[styles.chip, filtro === f.chave && styles.chipAtivo]}
            onPress={() => setFiltro(f.chave)}
          >
            <Text style={[styles.chipTexto, filtro === f.chave && styles.chipTextoAtivo]}>
              {f.rotulo}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {carregando && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text>Carregando consultas...</Text>
        </View>
      )}

      {erro && (
        <View style={styles.centerContainer}>
          <Text style={styles.erroText}>Falha ao carregar: {erro}</Text>
          <Button title="Tentar Novamente" onPress={buscarConsultas} />
        </View>
      )}

      {!carregando && !erro && (
        <View style={styles.listWrapper}>
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => <ConsultaCard consulta={item} />}
            renderSectionHeader={({ section: { title } }) => (
              <Text style={styles.sectionHeader}>{title}</Text>
            )}
            ListEmptyComponent={
              <Text style={styles.vazio}>Nenhuma consulta encontrada.</Text>
            }
            contentContainerStyle={styles.sectionListContent}
            stickySectionHeadersEnabled={true}
          />
        </View>
      )}
    </View>
  );
};

// =========================================================================
// ESTILOS
// =========================================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 10 },
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
  searchInput: { flex: 1, height: 40 },
  searchIcon: { width: 20, height: 20, marginLeft: 10, tintColor: '#aaa' },
  filtros: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    marginRight: 8,
    marginBottom: 6,
  },
  chipAtivo: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  chipTexto: { fontSize: 13, color: '#555' },
  chipTextoAtivo: { color: '#fff', fontWeight: 'bold' },
  listWrapper: { flex: 1 },
  sectionListContent: { paddingBottom: 10 },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    backgroundColor: '#f5f5f5',
    paddingVertical: 5,
    paddingHorizontal: 10,
    color: '#333',
  },
  vazio: { textAlign: 'center', color: '#777', marginTop: 30 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  erroText: { color: 'red', marginBottom: 10 },
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
  textos: { flex: 1, marginRight: 10 },
  hora: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  nome: { fontSize: 18, fontWeight: 'bold', color: '#007AFF' },
  subtitulo: { fontSize: 14, color: '#555', marginBottom: 6 },
  badge: { alignSelf: 'flex-start', borderRadius: 10, paddingVertical: 2, paddingHorizontal: 8 },
  badgeTexto: { fontSize: 12, fontWeight: 'bold' },
  arrowIcon: { width: 15, height: 15, tintColor: '#007AFF' },
  details: {
    padding: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  detailText: { fontSize: 14, marginBottom: 5, color: '#333' },
});

export default Consulta;