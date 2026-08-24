const form = document.getElementById("registrationForm");

const fullNameInput = document.getElementById("fullName");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");

const submitButton = document.getElementById("submitButton");

const successState = document.getElementById("successState");
const registeredEmail = document.getElementById("registeredEmail");

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


/* ========================================
   PASSWORD VISIBILITY
======================================== */

document.querySelectorAll(".toggle-password").forEach(button => {

  button.addEventListener("click", () => {

    const targetId = button.dataset.target;
    const input = document.getElementById(targetId);

    if (input.type === "password") {
      input.type = "text";
      button.textContent = "◉";
      button.setAttribute("aria-label", "Hide password");
    } else {
      input.type = "password";
      button.textContent = "◉";
      button.setAttribute("aria-label", "Show password");
    }

  });

});


/* ========================================
   ERROR HELPERS
======================================== */

function showError(input, errorId, message) {

  const fieldGroup = input.closest(".field-group");

  fieldGroup.classList.add("has-error");
  fieldGroup.classList.remove("has-success");

  document.getElementById(errorId).textContent = message;

}


function clearError(input, errorId) {

  const fieldGroup = input.closest(".field-group");

  fieldGroup.classList.remove("has-error");

  document.getElementById(errorId).textContent = "";

}


function showSuccess(input) {

  const fieldGroup = input.closest(".field-group");

  fieldGroup.classList.remove("has-error");
  fieldGroup.classList.add("has-success");

}


/* ========================================
   VALIDATION
======================================== */

function validateForm() {

  let isValid = true;

  const fullName = fullNameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;


  // Full name
  if (!fullName) {
    showError(
      fullNameInput,
      "nameError",
      "Please enter your full name."
    );
    isValid = false;
  } else {
    clearError(fullNameInput, "nameError");
    showSuccess(fullNameInput);
  }


  // Email
  if (!email) {
    showError(
      emailInput,
      "emailError",
      "Please enter your email address."
    );
    isValid = false;

  } else if (!emailPattern.test(email)) {
    showError(
      emailInput,
      "emailError",
      "Please enter a valid email address."
    );
    isValid = false;

  } else {
    clearError(emailInput, "emailError");
    showSuccess(emailInput);
  }


  // Password
  if (!password) {
    showError(
      passwordInput,
      "passwordError",
      "Please create a password."
    );
    isValid = false;

  } else if (password.length < 6) {
    showError(
      passwordInput,
      "passwordError",
      "Password must contain at least 6 characters."
    );
    isValid = false;

  } else {
    clearError(passwordInput, "passwordError");
    showSuccess(passwordInput);
  }


  // Confirm password
  if (!confirmPassword) {
    showError(
      confirmPasswordInput,
      "confirmPasswordError",
      "Please confirm your password."
    );
    isValid = false;

  } else if (password !== confirmPassword) {
    showError(
      confirmPasswordInput,
      "confirmPasswordError",
      "Passwords do not match."
    );
    isValid = false;

  } else {
    clearError(confirmPasswordInput, "confirmPasswordError");
    showSuccess(confirmPasswordInput);
  }


  return isValid;

}


/* ========================================
   LIVE VALIDATION CLEANUP
======================================== */

[
  fullNameInput,
  emailInput,
  passwordInput,
  confirmPasswordInput
].forEach(input => {

  input.addEventListener("input", () => {

    const fieldGroup = input.closest(".field-group");

    fieldGroup.classList.remove("has-error", "has-success");

    const errorElement = fieldGroup.querySelector(".error-message");

    if (errorElement) {
      errorElement.textContent = "";
    }

  });

});


/* ========================================
   SHA-256 HASH
======================================== */

async function hashPassword(password) {

  const encoder = new TextEncoder();

  const data = encoder.encode(password);

  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    data
  );

  const hashArray = Array.from(
    new Uint8Array(hashBuffer)
  );

  return hashArray
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");

}


/* ========================================
   SUBMIT
======================================== */

form.addEventListener("submit", async event => {

  event.preventDefault();


  if (!validateForm()) {
    return;
  }


  if (
    !GOOGLE_SCRIPT_URL ||
    GOOGLE_SCRIPT_URL.includes("PASTE_YOUR_WEB_APP_URL_HERE")
  ) {
    alert(
      "Please add your deployed Google Apps Script Web App URL to index.html."
    );
    return;
  }


  submitButton.classList.add("loading");
  submitButton.disabled = true;


  try {

    const passwordHash = await hashPassword(
      passwordInput.value
    );


    const payload = {
      action: "register",

      name: fullNameInput.value.trim(),

      email: emailInput.value.trim(),

      passwordHash: passwordHash
    };


    /*
      Apps Script Web Apps often need no-cors when called from
      a separate static GitHub Pages origin.

      The request is sent successfully, but the browser cannot
      read the response directly in no-cors mode.
    */

    await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",

      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },

      body: JSON.stringify(payload)
    });


    registeredEmail.textContent = payload.email;

    form.style.display = "none";

    successState.classList.add("active");


    /*
      Clear password fields immediately after submission.
    */

    passwordInput.value = "";
    confirmPasswordInput.value = "";


  } catch (error) {

    console.error(error);

    alert(
      "Something went wrong while creating your account. Please try again."
    );

    submitButton.classList.remove("loading");
    submitButton.disabled = false;

  }

});


/* ========================================
   LOGIN PLACEHOLDER
======================================== */

document
  .getElementById("loginLink")
  .addEventListener("click", event => {

    event.preventDefault();

    alert("Login page coming soon.");

  });
