package com.springmed.springmed.controller;

import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.springmed.springmed.model.dto.DadosCadastroMedico;
import org.springframework.web.bind.annotation.PostMapping;


@RestController 
@RequestMapping("medicos")
public class MedicoController {
    
    @PostMapping()
    public void cadastrar(@RequestBody DadosCadastroMedico dados){
        System.out.println(dados);
    }
    
}
