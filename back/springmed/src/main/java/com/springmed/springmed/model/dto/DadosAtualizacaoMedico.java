package com.springmed.springmed.model.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

public record DadosAtualizacaoMedico(
    @NotNull Long id,
    String nome,
    String telefone,
    @Valid DadosEndereco endereco
) {
    
}
