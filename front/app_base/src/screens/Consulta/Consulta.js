// src/screens/Consulta/Consulta.js
import React, { useState, useMemo, useCallback } from 'react';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import {
  View, Text, TextInput, StyleSheet, SectionList, TouchableOpacity,
  Platform, LayoutAnimation, UIManager, Button, Image, ActivityIndicator, Alert,
} from 'react-native';
import { get, del } from '../../services/api';
import { obterUsuario } from '../../services/sessao';
import { cancelarLembrete, sincronizarLembretes } from '../../services/lembretes';

const IconeLupa = require('../../../assets/lupa.png');
const IconeSeta = require('../../../assets/seta.png');

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

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

const formatarData = (iso) => {
  if (!iso) return 'Sem data';
  const [ano, mes, dia] = iso.split('-').map(Number);
  const diaSemana = DIAS_SEMANA[new Date(ano, mes - 1, dia).getDay()];
  return `${diaSemana}, ${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}`;
};

// A API (GET /consultas) já devolve cada consulta com `medico` e `paciente` embutidos
// e já filtrada pelo perfil: o paciente só recebe as consultas dele.
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

const ConsultaCard = ({ consulta, destaque, onRemarcar, onCancelar }) => {
  const [isExpanded, setIsExpanded] = useState(!!destaque);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  const status = STATUS[consulta.status] || STATUS.agendada;
  const { paciente, medico } = consulta;

  return (
    <View style={[cardStyles.card, destaque && cardStyles.cardDestaque]}>
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
          style={[cardStyles.arrowIcon, { transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }]}
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
          {consulta.status === 'agendada' && (
            <View style={cardStyles.acoes}>
              <TouchableOpacity style={cardStyles.btnRemarcar} onPress={() => onRemarcar(consulta)}>
                <Text style={cardStyles.btnRemarcarTexto}>Remarcar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={cardStyles.btnCancelar} onPress={() => onCancelar(consulta)}>
                <Text style={cardStyles.btnCancelarTexto}>Cancelar consulta</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const Consulta = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const consultaDestaque = route.params?.consultaId ? String(route.params.consultaId) : null;
  const [consultas, setConsultas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [filtro, setFiltro] = useState('todas');

  const buscarConsultas = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const dados = await get('/consultas');
      setConsultas(dados);
      // Extensão: reconcilia os lembretes do aparelho com o que o servidor tem hoje
      // (cobre consulta cancelada/remarcada pela recepção). Só faz sentido no aparelho do paciente.
      const u = await obterUsuario();
      if (u?.perfil === 'paciente') sincronizarLembretes(dados).catch(() => {});
    } catch (e) {
      if (e.message === '401') {
        // sessão expirada (api.js já limpou o cofre)
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }
      setErro('Não foi possível carregar as consultas.');
    } finally {
      setCarregando(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      buscarConsultas();
    }, [])
  );

  const remarcar = (consulta) => navigation.navigate('AgendarConsulta', { consulta });

  const cancelar = (consulta) => {
    Alert.alert('Cancelar consulta', 'Deseja realmente cancelar esta consulta?', [
      { text: 'Não', style: 'cancel' },
      {
        text: 'Sim, cancelar',
        style: 'destructive',
        onPress: async () => {
          try {
            await del(`/consultas/${consulta.id}`); // 1) servidor
            await cancelarLembrete(consulta.id);    // 2) depois, o lembrete (o passo que todo mundo esquece)
            buscarConsultas();
          } catch (e) {
            Alert.alert('Erro', 'Não foi possível cancelar a consulta.');
          }
        },
      },
    ]);
  };

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

      <TouchableOpacity style={styles.btnNova} onPress={() => navigation.navigate('AgendarConsulta')}>
        <Text style={styles.btnNovaTexto}>+ Agendar nova consulta</Text>
      </TouchableOpacity>

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
          <Text style={styles.erroText}>{erro}</Text>
          <Button title="Tentar Novamente" onPress={buscarConsultas} />
        </View>
      )}

      {!carregando && !erro && (
        <View style={styles.listWrapper}>
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <ConsultaCard
                consulta={item}
                destaque={String(item.id) === consultaDestaque}
                onRemarcar={remarcar}
                onCancelar={cancelar}
              />
            )}
            renderSectionHeader={({ section: { title } }) => (
              <Text style={styles.sectionHeader}>{title}</Text>
            )}
            ListEmptyComponent={<Text style={styles.vazio}>Nenhuma consulta encontrada.</Text>}
            contentContainerStyle={styles.sectionListContent}
            stickySectionHeadersEnabled={true}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 10 },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8,
    borderWidth: 1, borderColor: '#ddd', marginBottom: 10, paddingHorizontal: 10,
  },
  searchInput: { flex: 1, height: 40 },
  searchIcon: { width: 20, height: 20, marginLeft: 10, tintColor: '#aaa' },
  btnNova: { backgroundColor: '#007AFF', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  btnNovaTexto: { color: '#fff', fontWeight: 'bold' },
  filtros: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  chip: {
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1,
    borderColor: '#ddd', backgroundColor: '#fff', marginRight: 8, marginBottom: 6,
  },
  chipAtivo: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  chipTexto: { fontSize: 13, color: '#555' },
  chipTextoAtivo: { color: '#fff', fontWeight: 'bold' },
  listWrapper: { flex: 1 },
  sectionListContent: { paddingBottom: 10 },
  sectionHeader: {
    fontSize: 18, fontWeight: 'bold', backgroundColor: '#f5f5f5',
    paddingVertical: 5, paddingHorizontal: 10, color: '#333',
  },
  vazio: { textAlign: 'center', color: '#777', marginTop: 30 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  erroText: { color: 'red', marginBottom: 10 },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 8, marginVertical: 5, marginHorizontal: 10,
    overflow: 'hidden', borderWidth: 1, borderColor: '#eee',
  },
  mainInfo: { padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  textos: { flex: 1, marginRight: 10 },
  hora: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  nome: { fontSize: 18, fontWeight: 'bold', color: '#007AFF' },
  subtitulo: { fontSize: 14, color: '#555', marginBottom: 6 },
  badge: { alignSelf: 'flex-start', borderRadius: 10, paddingVertical: 2, paddingHorizontal: 8 },
  badgeTexto: { fontSize: 12, fontWeight: 'bold' },
  arrowIcon: { width: 15, height: 15, tintColor: '#007AFF' },
  cardDestaque: { borderColor: '#007AFF', borderWidth: 2 },
  acoes: { flexDirection: 'row', marginTop: 8 },
  btnRemarcar: { borderWidth: 1, borderColor: '#007AFF', borderRadius: 6, paddingVertical: 8, paddingHorizontal: 12, marginRight: 8 },
  btnRemarcarTexto: { color: '#007AFF', fontWeight: 'bold' },
  btnCancelar: { backgroundColor: '#a33', borderRadius: 6, paddingVertical: 8, paddingHorizontal: 12 },
  btnCancelarTexto: { color: '#fff', fontWeight: 'bold' },
  details: { padding: 15, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eee' },
  detailText: { fontSize: 14, marginBottom: 5, color: '#333' },
});

export default Consulta;