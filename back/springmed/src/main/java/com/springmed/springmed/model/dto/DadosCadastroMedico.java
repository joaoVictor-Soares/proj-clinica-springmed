package com.springmed.springmed.model.dto;

import com.springmed.springmed.enums.Especialidade;
import com.springmed.springmed.model.dto.DadosEndereco;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;;

public record DadosCadastroMedico(
    @NotBlank String nome, 
    @NotBlank @Email String email,
    @NotBlank @Pattern (regexp = "\\d{4, 6}") String crm,
    @NotBlank String telefone,
    @NotNull  Especialidade especialidade,
    @NotNull DadosEndereco endereco
) {


    
}
