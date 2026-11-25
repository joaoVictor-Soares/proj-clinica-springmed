package com.springmed.springmed.model.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

public record DadosAtualizacaoPaciente(
    @NotNull Long id,
    String nome,
    String telefone,
    @Valid DadosEndereco endereco
) {

}
