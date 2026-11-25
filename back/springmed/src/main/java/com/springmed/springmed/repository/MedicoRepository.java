package com.springmed.springmed.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.springmed.springmed.model.entity.Medico;

public interface MedicoRepository extends JpaRepository<Medico, Long>{
    
}
