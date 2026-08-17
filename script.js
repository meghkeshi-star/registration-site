// ============================================================
// 1. PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL HERE
// ============================================================
const SCRIPT_URL = "PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE";

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function $(id) { return document.getElementById(id); }

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setFieldError(fieldId, message) {
  const field = $(fieldId).closest(".field");
  const errorEl = $("err-" + fieldId);
  if (message) {
    field.classList.add("has-error");
    errorEl.textContent = message;
  } else {
    field.classList.remove("has-error");
    errorEl.textContent = "";
  }
}

function clearAllErrors() {
  ["fullName", "email", "password", "confirmPassword"].forEach((id) => setFieldError(id, ""));
}

function showBanner(message, ok) {
  const banner = $("formBanner");
  banner.textContent = message;
  banner.hidden = false;
  banner.classList.toggle("ok", !!ok);
}

function hideBanner() {
  const banner = $("formBanner");
  banner.hidden = true;
}

// Simple client-side hash so a plain password never has to be the
// thing we transmit/store as-is. The server re-hashes with its own
// salt before saving — see Code.gs.
async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ------------------------------------------------------------
// Password show/hide
// ------------------------------------------------------------
document.querySelectorAll(".toggle-vis").forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetId = btn.getAttribute("data-target");
    const input = $(targetId);
    const showing = input.type === "text";
    input.type = showing ? "password" : "text";
    btn.textContent = showing ? "👁" : "🙈";
  });
});

// ------------------------------------------------------------
// Validation
// ------------------------------------------------------------
function validateForm() {
  clearAllErrors();
  let valid = true;

  const fullName = $("fullName").value.trim();
  const email = $("email").value.trim();
  const password = $("password").value;
  const confirmPassword = $("confirmPassword").value;

  if (!fullName) {
    setFieldError("fullName", "Please enter your full name.");
    valid = false;
  }

  if (!email) {
    setFieldError("email", "Please enter your email address.");
    valid = false;
  } else if (!isValidEmail(email)) {
    setFieldError("email", "Please enter a valid email address.");
    valid = false;
  }

  if (!password) {
    setFieldError("password", "Please enter a password.");
    valid = false;
  } else if (password.length < 6) {
    setFieldError("password", "Password must be at least 6 characters.");
    valid = false;
  }

  if (!confirmPassword) {
    setFieldError("confirmPassword", "Please confirm your password.");
    valid = false;
  } else if (password !== confirmPassword) {
    setFieldError("confirmPassword", "Passwords do not match.");
    valid = false;
  }

  return valid;
}

// ------------------------------------------------------------
// Submit
// ------------------------------------------------------------
const form = $("registerForm");
const submitBtn = $("submitBtn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideBanner();

  if (!validateForm()) return;

  const fullName = $("fullName").value.trim();
  const email = $("email").value.trim();
  const password = $("password").value;

  setLoading(true);

  try {
    const passwordHash = await sha256(password);

    const body = new URLSearchParams({
      action: "registerUser",
      name: fullName,
      email: email,
      passwordHash: passwordHash,
    });

    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      body: body,
    });

    const data = await res.json();

    if (data.success) {
      $("sentToEmail").textContent = email;
      $("registerCard").hidden = true;
      $("successCard").hidden = false;
    } else {
      showBanner(data.message || "Something went wrong. Please try again.", false);
    }
  } catch (err) {
    showBanner("Could not reach the server. Please check your connection and try again.", false);
  } finally {
    setLoading(false);
  }
});

function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitBtn.querySelector(".btn-label").textContent = isLoading ? "Creating account..." : "Create account";
  submitBtn.querySelector(".btn-spinner").hidden = !isLoading;
}
