// src/screens/Agenda/SincronizarAgenda.js
// Verificação de conflitos com progresso real, cancelamento e diagnóstico das "duas bolinhas".
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Animated, Easing, Platform,
} from 'react-native';
import { get } from '../../services/api';
import {
  detectarConflitos, detectarConflitosIngenuo, detectarConflitosRapido, mesmosConflitos,
} from '../../services/conflitos';
import { cederAVez } from '../../services/processamento';
import { useTarefaPesada } from '../../hooks/useTarefaPesada';

const FATIAS = [100, 500, 5000];
const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

// Bolinha que gira. useNativeDriver:true roda na thread NATIVA (continua fluida com o JS ocupado);
// false depende da thread de JS (congela junto). Se a nativa gira e a de JS trava, o gargalo é o nosso código.
function Bolinha({ nativa, rotulo }) {
  const giro = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(giro, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: nativa }),
    );
    anim.start();
    return () => anim.stop();
  }, [giro, nativa]);
  const rotacao = giro.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <View style={s.bolinhaBox}>
      <Animated.View style={[s.bolinhaOrbita, { transform: [{ rotate: rotacao }] }]}>
        <View style={[s.bolinha, { backgroundColor: nativa ? '#1F7A3F' : '#E08A00' }]} />
      </Animated.View>
      <Text style={s.bolinhaRotulo}>{rotulo}</Text>
    </View>
  );
}

export default function SincronizarAgenda({ navigation }) {
  const [consultas, setConsultas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState(null);
  const [fatia, setFatia] = useState(500);
  const [toques, setToques] = useState(0);
  const [bloqueando, setBloqueando] = useState(false);

  // Medições (vão para o README) e saídas guardadas para conferir "mesmos conflitos".
  const [medicoes, setMedicoes] = useState({});
  const saidas = useRef({});
  const [confere, setConfere] = useState(null);

  // Buscar da API com await NÃO trava (é espera). O que precisa ser fatiado é o cálculo.
  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const dados = await get('/consultas');
        if (ativo) setConsultas(dados);
      } catch (e) {
        if (e.message === '401') return navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        if (ativo) setErroCarga('Não foi possível carregar as consultas.');
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => { ativo = false; };
  }, []);

  const tarefaFatiada = useCallback(
    async (sinal, onProgresso, tamanhoFatia, lista) => {
      const t0 = Date.now();
      const r = await detectarConflitos(lista, { tamanhoFatia, onProgresso, sinal });
      return { ...r, ms: Date.now() - t0, tamanhoFatia };
    },
    [],
  );
  const { rodando, progresso, resultado, erro, cancelado, iniciar, cancelar } = useTarefaPesada(tarefaFatiada);

  // Guarda a medição da versão fatiada quando termina.
  useEffect(() => {
    if (!resultado) return;
    saidas.current.fatiada = resultado.conflitos;
    setMedicoes((m) => ({ ...m, [`fatiada${resultado.tamanhoFatia}`]: { ms: resultado.ms, comparacoes: resultado.comparacoes, conflitos: resultado.conflitos.length } }));
  }, [resultado]);

  // Roda uma função bloqueante de propósito, mas deixa o "Calculando..." pintar antes.
  const medirBloqueante = async (chave, fn) => {
    setBloqueando(true);
    await cederAVez();
    await new Promise((r) => requestAnimationFrame(() => r()));
    const t0 = Date.now();
    const r = fn(consultas);             // BLOQUEIA a thread de JS: bolinha laranja e toques congelam
    const ms = Date.now() - t0;
    saidas.current[chave] = r.conflitos;
    setMedicoes((m) => ({ ...m, [chave]: { ms, comparacoes: r.comparacoes, conflitos: r.conflitos.length } }));
    setBloqueando(false);
  };

  const conferir = () => {
    const { ingenuo, rapido, fatiada } = saidas.current;
    const base = ingenuo || rapido;
    if (!base) return setConfere('Rode ao menos uma versão bloqueante primeiro.');
    const comparaveis = [['melhorada', rapido], ['fatiada', fatiada]].filter(([, v]) => v);
    if (!comparaveis.length) return setConfere('Rode a versão melhorada ou fatiada primeiro.');
    const linhas = comparaveis.map(([n, v]) => `${n}: ${mesmosConflitos(base, v) ? 'mesmos conflitos ✔' : 'DIFERENTE ✘'}`);
    setConfere(linhas.join('\n'));
  };

  const ocupado = rodando || bloqueando;
  const n = consultas.length;
  const fmt = (m) => (m ? `${m.ms} ms · ${m.comparacoes.toLocaleString('pt-BR')} comparações · ${m.conflitos} conflitos` : '—');

  if (carregando) return <View style={s.centro}><ActivityIndicator size="large" /><Text>Carregando consultas...</Text></View>;
  if (erroCarga) return <View style={s.centro}><Text style={{ color: 'red' }}>{erroCarga}</Text></View>;

  return (
    <ScrollView contentContainerStyle={s.container}>
      <Text style={s.titulo}>Sincronizar agenda</Text>
      <Text style={s.sub}>{n} consultas carregadas · {(n * (n - 1) / 2).toLocaleString('pt-BR')} pares (todas × todas)</Text>
      {n < 2000 && (
        <Text style={s.aviso}>
          Menos de 2 mil consultas: nada vai travar. Rode `node scripts/gerar-consultas.js 3000` e reinicie o json-server.
        </Text>
      )}

      {/* Diagnóstico + prova de vida da interface */}
      <View style={s.painel}>
        <View style={s.linha}>
          <Bolinha nativa rotulo="Nativa (fluida)" />
          <Bolinha nativa={false} rotulo="JS (congela)" />
          <View style={s.bolinhaBox}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={s.bolinhaRotulo}>Indicador</Text>
          </View>
        </View>
        <TouchableOpacity style={s.toque} onPress={() => setToques((t) => t + 1)}>
          <Text style={s.toqueTexto}>Toque aqui durante o cálculo: {toques}</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.secao}>1 · Medir o problema (bloqueante)</Text>
      <TouchableOpacity style={[s.btn, ocupado && s.off]} disabled={ocupado} onPress={() => medirBloqueante('ingenuo', detectarConflitosIngenuo)}>
        <Text style={s.btnTexto}>Versão ingênua (todas × todas)</Text>
      </TouchableOpacity>
      <Text style={s.res}>{fmt(medicoes.ingenuo)}</Text>
      {bloqueando && <Text style={s.calc}>Calculando… (a interface vai congelar)</Text>}

      <Text style={s.secao}>2 · Algoritmo melhor (ainda bloqueante)</Text>
      <TouchableOpacity style={[s.btn, ocupado && s.off]} disabled={ocupado} onPress={() => medirBloqueante('rapido', detectarConflitosRapido)}>
        <Text style={s.btnTexto}>Agrupar por médico + ordenar</Text>
      </TouchableOpacity>
      <Text style={s.res}>{fmt(medicoes.rapido)}</Text>

      <Text style={s.secao}>3 · Sem travar (fatiado)</Text>
      <View style={s.linha}>
        {FATIAS.map((f) => (
          <TouchableOpacity key={f} disabled={ocupado} style={[s.chip, fatia === f && s.chipAtivo]} onPress={() => setFatia(f)}>
            <Text style={[s.chipTexto, fatia === f && { color: '#fff' }]}>fatia {f}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={s.linha}>
        <TouchableOpacity style={[s.btn, { flex: 1, marginRight: 8 }, ocupado && s.off]} disabled={ocupado} onPress={() => iniciar(fatia, consultas)}>
          <Text style={s.btnTexto}>Verificar conflitos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.btn, s.btnCancelar, !rodando && s.off]} disabled={!rodando} onPress={cancelar}>
          <Text style={s.btnTexto}>Cancelar</Text>
        </TouchableOpacity>
      </View>

      <View style={s.barraFundo}>
        <View style={[s.barra, { width: `${Math.round(progresso * 100)}%` }]} />
      </View>
      <Text style={s.res}>
        {rodando ? `Processando… ${Math.round(progresso * 100)}%` : cancelado ? 'Cancelado.' : erro ? `Erro: ${erro.message}` : resultado ? `Concluído: ${resultado.conflitos.length} conflitos em ${resultado.ms} ms (fatia ${resultado.tamanhoFatia})` : '—'}
      </Text>

      <Text style={s.secao}>Conferência e medições (copie para o README)</Text>
      <TouchableOpacity style={s.btnSec} onPress={conferir}><Text style={s.btnSecTexto}>Conferir se acham os mesmos conflitos</Text></TouchableOpacity>
      {confere && <Text style={s.res}>{confere}</Text>}
      <View style={s.tabela}>
        <Text style={s.mono}>consultas: {n}</Text>
        <Text style={s.mono}>ingênua : {fmt(medicoes.ingenuo)}</Text>
        <Text style={s.mono}>melhorada: {fmt(medicoes.rapido)}</Text>
        {FATIAS.map((f) => <Text key={f} style={s.mono}>fatia {String(f).padEnd(4)}: {fmt(medicoes[`fatiada${f}`])}</Text>)}
      </View>

      {resultado?.conflitos?.length > 0 && (
        <>
          <Text style={s.secao}>Primeiros conflitos (ids)</Text>
          {resultado.conflitos.slice(0, 10).map(([a, b]) => <Text key={`${a}|${b}`} style={s.mono}>{a} ⇄ {b}</Text>)}
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#fff', flexGrow: 1 },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  titulo: { fontSize: 20, fontWeight: 'bold', color: '#1F3B57' },
  sub: { fontSize: 12, color: '#666', marginBottom: 8 },
  aviso: { fontSize: 12, color: '#a33', marginBottom: 8 },
  painel: { backgroundColor: '#f5f5f5', borderRadius: 8, padding: 12, marginVertical: 8 },
  linha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap' },
  bolinhaBox: { alignItems: 'center', width: 100 },
  bolinhaOrbita: { width: 44, height: 44, alignItems: 'center' },
  bolinha: { width: 14, height: 14, borderRadius: 7 },
  bolinhaRotulo: { fontSize: 11, color: '#555', marginTop: 4 },
  toque: { backgroundColor: '#E1EAF3', padding: 12, borderRadius: 6, alignItems: 'center', marginTop: 10 },
  toqueTexto: { color: '#1F3B57', fontWeight: 'bold' },
  secao: { fontSize: 14, fontWeight: 'bold', color: '#333', marginTop: 16, marginBottom: 6 },
  btn: { backgroundColor: '#007AFF', padding: 12, borderRadius: 6, alignItems: 'center' },
  btnCancelar: { backgroundColor: '#a33', paddingHorizontal: 18 },
  btnTexto: { color: '#fff', fontWeight: 'bold' },
  btnSec: { borderWidth: 1, borderColor: '#007AFF', padding: 10, borderRadius: 6, alignItems: 'center' },
  btnSecTexto: { color: '#007AFF', fontWeight: 'bold' },
  off: { opacity: 0.4 },
  res: { fontSize: 12, color: '#333', marginTop: 6 },
  calc: { fontSize: 12, color: '#E08A00', marginTop: 4 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: '#ddd', marginBottom: 8 },
  chipAtivo: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  chipTexto: { fontSize: 13, color: '#555' },
  barraFundo: { height: 12, backgroundColor: '#e3e3e3', borderRadius: 6, overflow: 'hidden', marginTop: 10 },
  barra: { height: 12, backgroundColor: '#1F7A3F' },
  tabela: { backgroundColor: '#f5f5f5', padding: 10, borderRadius: 6, marginTop: 8 },
  mono: { fontFamily: MONO, fontSize: 11, color: '#333' },
});

