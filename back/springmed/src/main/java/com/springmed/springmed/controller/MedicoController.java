package com.springmed.springmed.controller;

import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.springmed.springmed.model.dto.DadosAtualizacaoMedico;
import com.springmed.springmed.model.dto.DadosCadastroMedico;
import com.springmed.springmed.model.dto.DadosListagemMedico;
import com.springmed.springmed.model.entity.Medico;
import com.springmed.springmed.repository.MedicoRepository;

import jakarta.transaction.Transactional;
import jakarta.validation.Valid;

import java.util.List;


import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.autoconfigure.web.DataWebProperties.Pageable;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PathVariable;




@RestController 
@RequestMapping("medicos")
public class MedicoController {

    @Autowired 
    private  MedicoRepository medicoRepository;
    
    @PostMapping
    @Transactional 
    public void cadastrar(@RequestBody DadosCadastroMedico dados){
        medicoRepository.save(new Medico(dados));
    }

    // @GetMapping
    // public List<DadosListagemMedico> listar() {
    //     return medicoRepository.findAll().stream().map(DadosListagemMedico::new).toList();
    // }

    @GetMapping
    public Page<DadosListagemMedico> listar(Pageable paginacao){
        return medicoRepository.findAllByAtivoTrue(paginacao)
            .map(DadosListagemMedico::new);
    }

    @PutMapping
    @Transactional 
    public void atualizar(@RequestBody @Valid DadosAtualizacaoMedico dados) {
        var medico = medicoRepository.getReferenceById(dados.id());
        medico.atualizarInformacoes(dados);
    }
}
