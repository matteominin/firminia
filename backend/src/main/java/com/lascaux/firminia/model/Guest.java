package com.lascaux.firminia.model;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record Guest(
    @NotBlank(message = "Name is required") String name,
    @NotBlank(message = "Surname is required") String surname,
    @NotBlank(message = "Email is required") @Email(message = "Email must be valid") String email,
    @NotBlank(message = "Phone is required") String phone
) {}