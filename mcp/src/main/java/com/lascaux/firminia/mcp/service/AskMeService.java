package com.lascaux.firminia.mcp.service;

import java.util.List;

import org.springframework.ai.tool.annotation.Tool;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import com.lascaux.firminia.mcp.model.Document;
import com.lascaux.firminia.mcp.model.Guest;

@Service
public class AskMeService {

    private final RestClient restClient;
    
    public AskMeService() {
        this.restClient = RestClient.builder()
            .baseUrl("http://localhost:8080")    
            .build();
    }

    @Tool(description = "Fetch all the documents ready to be signed from the AskMe API")
    public List<Document> fetchDocuments() {
        return restClient.get()
            .uri("/check-unsigned-documents")
            .retrieve()
            .body(new ParameterizedTypeReference<List<Document>>() {});
    }

    @Tool(description = "Sign a document by its ID using the AskMe API")
    public String signDocument(String documentId) {
       return restClient.post()
            .uri(uriBuilder -> uriBuilder
                .path("/sign-document")
                .queryParam("documentId", documentId)
                .build())
            .retrieve()
            .body(String.class);
    }

    @Tool(description = "Register a new guest visiting lascaux using the AskMe API")
    public String registerGuest(Guest guest) {
        return restClient.post()
            .uri("/create-guest-ticket")
            .body(guest)
            .retrieve()
            .body(String.class);
    }
}