// src/hooks/useTarefaPesada.js
// Embrulha progresso, cancelamento e "ainda montado" para tarefas fatiadas.
//
// tarefa(sinal, onProgresso, ...args) => Promise<resultado>
import { useCallback, useEffect, useRef, useState } from 'react';
import { criarSinalDeCancelamento } from '../services/processamento';

export function useTarefaPesada(tarefa) {
  const [rodando, setRodando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState(null);
  const [cancelado, setCancelado] = useState(false);

  const montado = useRef(true);
  const sinalAtual = useRef(null);
  const tarefaRef = useRef(tarefa);
  tarefaRef.current = tarefa; // sempre a versão mais recente, sem recriar callbacks

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
      sinalAtual.current?.cancelar(); // sair da tela interrompe o cálculo
    };
  }, []);

  const iniciar = useCallback(async (...args) => {
    sinalAtual.current?.cancelar();
    const sinal = criarSinalDeCancelamento();
    sinalAtual.current = sinal;

    // Só atualiza estado se a tela ainda existe E esta execução ainda é a atual.
    const vivo = () => montado.current && sinalAtual.current === sinal;

    setRodando(true);
    setProgresso(0);
    setResultado(null);
    setErro(null);
    setCancelado(false);

    try {
      const r = await tarefaRef.current(sinal, (p) => { if (vivo()) setProgresso(p); }, ...args);
      if (!vivo()) return;
      if (sinal.cancelado) setCancelado(true);
      else { setResultado(r); setProgresso(1); }
    } catch (e) {
      if (vivo()) setErro(e);
    } finally {
      if (vivo()) setRodando(false);
    }
  }, []);

  const cancelar = useCallback(() => {
    sinalAtual.current?.cancelar();
    if (montado.current) { setCancelado(true); setRodando(false); }
  }, []);

  return { rodando, progresso, resultado, erro, cancelado, iniciar, cancelar };
}
