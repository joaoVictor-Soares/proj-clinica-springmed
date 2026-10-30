// src/components/RotaProtegida.js
// Uso: const MedicoProtegido = comPerfil(Medico, ['recepcao', 'medico']);
// Se o perfil guardado na sessão não estiver na lista, vai para AcessoNegado.
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { obterUsuario } from '../services/sessao';

export default function comPerfil(Componente, perfisPermitidos) {
  return function RotaProtegida(props) {
    const [liberado, setLiberado] = useState(false);

    useEffect(() => {
      let ativo = true;
      obterUsuario().then((u) => {
        if (!ativo) return;
        if (u && perfisPermitidos.includes(u.perfil)) {
          setLiberado(true);
        } else {
          props.navigation.replace('AcessoNegado');
        }
      });
      return () => { ativo = false; };
    }, []);

    if (!liberado) return <View />;
    return <Componente {...props} />;
  };
}