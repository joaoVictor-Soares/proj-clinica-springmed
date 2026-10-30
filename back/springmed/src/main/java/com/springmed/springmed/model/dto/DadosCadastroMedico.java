package com.springmed.springmed.model.dto;

import com.springmed.springmed.enums.Especialidade;
import com.springmed.springmed.model.dto.DadosEndereco;;

public record DadosCadastroMedico(
    String nome, 
    String email,
    String crm,
    Especialidade especialidade,
    DadosEndereco endereco
) {


    
}
