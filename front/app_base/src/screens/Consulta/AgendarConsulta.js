// src/screens/Consulta/AgendarConsulta.js — agenda (POST) ou remarca (PATCH) e ajusta o lembrete.
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { getJson, post, patch } from '../../services/api';
import { obterUsuario } from '../../services/sessao';
import { agendarLembreteDetalhado } from '../../services/lembretes';
import { ANTECEDENCIA_LEMBRETE_MIN as ANTECEDENCIA_MIN } from '../../config';

const dois = (n) => String(n).padStart(2, '0');
const isoParaBr = (iso) => (iso ? iso.split('-').reverse().join('/') : '');
const brParaIso = (br) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br.trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};
const horaValida = (h) => /^([01]\d|2[0-3]):[0-5]\d$/.test(h.trim());

export default function AgendarConsulta({ navigation, route }) {
  const consultaEdicao = route.params?.consulta || null; // se veio, é REMARCAÇÃO
  const [usuario, setUsuario] = useState(null);
  const [medicos, setMedicos] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [medicoId, setMedicoId] = useState(consultaEdicao?.medicoId ?? '');
  const [pacienteId, setPacienteId] = useState(consultaEdicao?.pacienteId ?? '');
  const [data, setData] = useState(isoParaBr(consultaEdicao?.data));
  const [hora, setHora] = useState(consultaEdicao?.hora || '');
  const [motivo, setMotivo] = useState(consultaEdicao?.motivo || '');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const ehPaciente = usuario?.perfil === 'paciente';

  useEffect(() => {
    (async () => {
      try {
        const u = await obterUsuario();
        setUsuario(u);
        const [ms, ps] = await Promise.all([getJson('/medicos'), getJson('/pacientes')]);
        setMedicos(ms);
        setPacientes(ps);
        if (!consultaEdicao) {
          if (ms.length) setMedicoId(ms[0].id);
          setPacienteId(u?.perfil === 'paciente' ? u.pacienteId : ps[0]?.id ?? '');
        }
      } catch (e) {
        Alert.alert('Erro', 'Não foi possível carregar médicos e pacientes.');
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  // Atalhos de teste. Para ver o lembrete disparar sem esperar 1 h, ponha
  // ANTECEDENCIA_LEMBRETE_MIN = 1 em config.js e use "daqui a 3 min".
  const preencherDaquiA = (minutos) => {
    const d = new Date(Date.now() + minutos * 60000);
    setData(`${dois(d.getDate())}/${dois(d.getMonth() + 1)}/${d.getFullYear()}`);
    setHora(`${dois(d.getHours())}:${dois(d.getMinutes())}`);
  };

  const salvar = async () => {
    const dataIso = brParaIso(data);
    if (!dataIso || !horaValida(hora)) {
      Alert.alert('Atenção', 'Use a data como DD/MM/AAAA e a hora como HH:MM.');
      return;
    }
    setSalvando(true);
    try {
      let consulta;
      // 1) servidor primeiro...
      if (consultaEdicao) {
        consulta = await patch(`/consultas/${consultaEdicao.id}`, { data: dataIso, hora: hora.trim(), motivo });
      } else {
        consulta = await post('/consultas', {
          pacienteId, medicoId, data: dataIso, hora: hora.trim(), status: 'agendada', motivo,
        });
      }
      // 2) ...e só depois o lembrete (reagendar cancela o anterior automaticamente).
      const r = await agendarLembreteDetalhado(consulta, ANTECEDENCIA_MIN);

      let aviso;
      if (r.ok) aviso = `Você será lembrado(a) às ${r.quando.getHours()}:${dois(r.quando.getMinutes())}.`;
      else if (r.motivo === 'passou') aviso = 'A consulta está muito próxima: não haverá lembrete para ela.';
      else aviso = 'A permissão de notificações está desativada: você não receberá lembrete.';

      Alert.alert(consultaEdicao ? 'Consulta remarcada' : 'Consulta agendada', aviso, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      if (e.message === '401') {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }
      Alert.alert('Erro', 'Não foi possível salvar a consulta. Nada foi agendado.');
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) return <View style={s.centro}><ActivityIndicator size="large" /></View>;

  return (
    <ScrollView contentContainerStyle={s.container}>
      <Text style={s.titulo}>{consultaEdicao ? 'Remarcar consulta' : 'Agendar consulta'}</Text>

      <Text style={s.rotulo}>Médico(a)</Text>
      <View style={s.picker}>
        <Picker selectedValue={medicoId} enabled={!consultaEdicao} onValueChange={setMedicoId}>
          {medicos.map((m) => <Picker.Item key={m.id} label={`${m.nome} — ${m.especialidade}`} value={m.id} />)}
        </Picker>
      </View>

      {!ehPaciente && (
        <>
          <Text style={s.rotulo}>Paciente</Text>
          <View style={s.picker}>
            <Picker selectedValue={pacienteId} enabled={!consultaEdicao} onValueChange={setPacienteId}>
              {pacientes.map((p) => <Picker.Item key={p.id} label={p.nome} value={p.id} />)}
            </Picker>
          </View>
        </>
      )}

      <Text style={s.rotulo}>Data (DD/MM/AAAA)</Text>
      <TextInput style={s.campo} value={data} onChangeText={setData} placeholder="28/10/2026" keyboardType="numbers-and-punctuation" />

      <Text style={s.rotulo}>Hora (HH:MM)</Text>
      <TextInput style={s.campo} value={hora} onChangeText={setHora} placeholder="14:30" keyboardType="numbers-and-punctuation" />

      <Text style={s.rotulo}>Motivo</Text>
      <TextInput style={s.campo} value={motivo} onChangeText={setMotivo} placeholder="Consulta de rotina" />

      <View style={s.atalhos}>
        <TouchableOpacity style={s.atalho} onPress={() => preencherDaquiA(3)}>
          <Text style={s.atalhoTexto}>Teste: daqui a 3 min</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.atalho} onPress={() => preencherDaquiA(61)}>
          <Text style={s.atalhoTexto}>Teste: daqui a 61 min</Text>
        </TouchableOpacity>
      </View>
      <Text style={s.dica}>
        Antecedência do lembrete: {ANTECEDENCIA_MIN} min.
      </Text>

      <TouchableOpacity style={[s.botao, salvando && { opacity: 0.6 }]} onPress={salvar} disabled={salvando}>
        {salvando ? <ActivityIndicator color="#fff" /> : <Text style={s.botaoTexto}>{consultaEdicao ? 'Remarcar' : 'Agendar'}</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fff', flexGrow: 1 },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  titulo: { fontSize: 20, fontWeight: 'bold', color: '#1F3B57', marginBottom: 12 },
  rotulo: { fontSize: 13, color: '#555', marginTop: 12, marginBottom: 4 },
  campo: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10, fontSize: 16 },
  picker: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6 },
  atalhos: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 14 },
  atalho: { backgroundColor: '#E1EAF3', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12, marginRight: 8, marginBottom: 6 },
  atalhoTexto: { color: '#1F3B57', fontSize: 12 },
  dica: { fontSize: 12, color: '#777', marginTop: 4 },
  botao: { backgroundColor: '#007AFF', padding: 14, borderRadius: 6, alignItems: 'center', marginTop: 20 },
  botaoTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
