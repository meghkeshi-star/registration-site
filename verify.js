// ============================================================
// PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL HERE (same as script.js)
// ============================================================
const SCRIPT_URL = "PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE";

function $(id) { return document.getElementById(id); }

function showOnly(id) {
  ["checkingCard", "verifiedCard", "invalidCard", "resendCard"].forEach((cardId) => {
    $(cardId).hidden = cardId !== id;
  });
}

// ------------------------------------------------------------
// On load: check for a token in the URL
// ------------------------------------------------------------
(async function init() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  if (!token) {
    // No token — go straight to the resend form
    showOnly("resendCard");
    return;
  }

  showOnly("checkingCard");

  try {
    const body = new URLSearchParams({ action: "verifyEmail", token: token });
    const res = await fetch(SCRIPT_URL, { method: "POST", body: body });
    const data = await res.json();

    if (data.success) {
      showOnly("verifiedCard");
    } else {
      showOnly("invalidCard");
    }
  } catch (err) {
    showOnly("invalidCard");
  }
})();

$("showResendBtn").addEventListener("click", () => showOnly("resendCard"));

// ------------------------------------------------------------
// Resend form
// ------------------------------------------------------------
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const resendForm = $("resendForm");
const resendBtn = $("resendBtn");

resendForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const banner = $("resendBanner");
  banner.hidden = true;

  const email = $("resendEmail").value.trim();
  const errorEl = $("err-resendEmail");
  const field = $("resendEmail").closest(".field");

  if (!email || !isValidEmail(email)) {
    field.classList.add("has-error");
    errorEl.textContent = "Please enter a valid email address.";
    return;
  }
  field.classList.remove("has-error");
  errorEl.textContent = "";

  resendBtn.disabled = true;
  resendBtn.querySelector(".btn-label").textContent = "Sending...";
  resendBtn.querySelector(".btn-spinner").hidden = false;

  try {
    const body = new URLSearchParams({ action: "resendVerification", email: email });
    const res = await fetch(SCRIPT_URL, { method: "POST", body: body });
    const data = await res.json();

    banner.hidden = false;
    if (data.success) {
      banner.classList.add("ok");
      banner.textContent = "A new verification email is on its way. Check your inbox!";
    } else {
      banner.classList.remove("ok");
      banner.textContent = data.message || "We couldn't find an account with that email.";
    }
  } catch (err) {
    banner.hidden = false;
    banner.classList.remove("ok");
    banner.textContent = "Could not reach the server. Please try again.";
  } finally {
    resendBtn.disabled = false;
    resendBtn.querySelector(".btn-label").textContent = "Resend verification email";
    resendBtn.querySelector(".btn-spinner").hidden = true;
  }
});
