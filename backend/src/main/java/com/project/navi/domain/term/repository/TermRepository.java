package com.project.navi.domain.term.repository;

import com.project.navi.domain.term.entity.Term;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TermRepository extends JpaRepository<Term, UUID> {
    List<Term> findAllByCurrentTrueAndRequiredTrueOrderByEffectiveAtAsc();
}
