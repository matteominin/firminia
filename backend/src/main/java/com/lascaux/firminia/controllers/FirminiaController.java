package com.lascaux.firminia.controllers;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.lascaux.firminia.model.Document;
import com.lascaux.firminia.model.Guest;

import jakarta.validation.Valid;

@RestController
public class FirminiaController {
    
    @GetMapping("/check-unsigned-documents")
    public List<Document> checkUnsignedDocuments() {
        return List.of(
            new Document("1", "Contract A", "Description for Contract A", false),
            new Document("2", "Contract B", "Description for Contract B", false)
            );
        }
        
    @PostMapping("/sign-document")
    public String signDocument(@RequestParam String documentId) {
        return "Document " + documentId + " signed successfully!";
    }

    @PostMapping("/create-guest-ticket")
    public String createGuestTicket(@Valid @RequestBody Guest guest) {
        return "Guest ticket created for " + guest.name() + " " + guest.surname() + "\nEmail: " + guest.email() + "\nPhone: " + guest.phone();
    }
}