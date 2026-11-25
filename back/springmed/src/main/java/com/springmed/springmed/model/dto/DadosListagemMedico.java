package com.springmed.springmed.model.dto;

import com.springmed.springmed.enums.Especialidade;
import com.springmed.springmed.model.entity.Medico;

public record DadosListagemMedico(Long id, String nome, String email, String crm, Especialidade especialidade) {
    
    public DadosListagemMedico(Medico medico){
        this(medico.getId(), medico.getNome(), medico.getEmail(), medico.getCrm(), medico.getEspecialidade());
    }
}
