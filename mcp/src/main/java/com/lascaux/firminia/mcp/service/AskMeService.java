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
                .baseUrl("http://localhost:8081")
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

    @Tool(description = """
            Prepare guest registration by collecting and validating all required information.
            Call this tool ONLY when you have ALL the required information: name, surname, email, phone.
            If any information is missing, ask the user for it first - DO NOT call this tool.
            This tool will return a summary for user confirmation.
            """)
    public String prepareGuestRegistration(String name, String surname, String email, String phone) {
        // Validate that all parameters are provided
        if (name == null || name.trim().isEmpty() ||
            surname == null || surname.trim().isEmpty() ||
            email == null || email.trim().isEmpty() ||
            phone == null || phone.trim().isEmpty()) {
            return "ERROR: All fields (name, surname, email, phone) are required. Please provide all information before calling this tool.";
        }

        return String.format("""
                Guest registration prepared with the following details:
                - Name: %s
                - Surname: %s
                - Email: %s
                - Phone: %s

                Please confirm all information is correct before proceeding with registration.
                """, name, surname, email, phone);
    }

    @Tool(description = """
            Actually register the guest after confirmation.
            This tool should ONLY be called after prepareGuestRegistration and explicit user confirmation.
            Do NOT call this tool without first showing the details to the user and receiving confirmation.
            """)
    public String confirmGuestRegistration(String name, String surname, String email, String phone) {
        Guest guest = new Guest(name, surname, email, phone);
        return restClient.post()
            .uri("/create-guest-ticket")
            .body(guest)
            .retrieve()
            .body(String.class);
    }
}