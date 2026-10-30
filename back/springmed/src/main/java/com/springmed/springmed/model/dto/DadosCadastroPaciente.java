package com.springmed.springmed.model.dto;

import com.springmed.springmed.model.dto.DadosEndereco;;

public record DadosCadastroPaciente(
    String nome, 
    String email,
    String cpf,
    String telefone,
    DadosEndereco endereco
) {


    
}
