<script>

const params = new URLSearchParams(window.location.search);

const token = params.get("token");

const title = document.getElementById("title");
const message = document.getElementById("message");
const label = document.getElementById("label");
const seal = document.getElementById("seal");

const resendSection =
  document.getElementById("resendSection");

const resendEmail =
  document.getElementById("resendEmail");

const resendButton =
  document.getElementById("resendButton");

const resendStatus =
  document.getElementById("resendStatus");


function showResend() {

  resendSection.style.display = "block";

}


function verifyToken() {

  if (!token) {

    label.textContent = "INVALID LINK";

    title.textContent =
      "This verification link is incomplete.";

    message.textContent =
      "Please request a new verification email.";

    seal.textContent = "!";

    showResend();

    return;

  }


  google.script.run

    .withSuccessHandler(result => {

      if (result.success) {

        label.textContent = "ENTRY APPROVED";

        title.textContent =
          "Email verified.";

        message.textContent =
          "Your account now has a verified entry stamp.";

        seal.textContent = "✓";

      } else {

        label.textContent =
          result.expired
            ? "STAMP EXPIRED"
            : "INVALID STAMP";

        title.textContent =
          result.message || "Verification failed.";

        message.textContent =
          "You can request a fresh verification email below.";

        seal.textContent = "!";

        showResend();

      }

    })

    .withFailureHandler(error => {

      console.error(error);

      label.textContent = "ERROR";

      title.textContent =
        "We couldn't verify your email.";

      message.textContent =
        "Please request a new verification email.";

      seal.textContent = "!";

      showResend();

    })

    .verifyEmail(token);

}


resendButton.addEventListener("click", () => {

  const email = resendEmail.value.trim();

  const emailPattern =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


  if (!emailPattern.test(email)) {

    resendStatus.textContent =
      "Please enter a valid email address.";

    resendStatus.className =
      "status error";

    return;

  }


  resendButton.disabled = true;

  resendButton.textContent =
    "SENDING...";

  resendStatus.textContent = "";


  google.script.run

    .withSuccessHandler(result => {

      resendButton.disabled = false;

      resendButton.textContent =
        "SEND A NEW VERIFICATION EMAIL";


      resendStatus.textContent =
        result.message;


      resendStatus.className =
        result.success
          ? "status success"
          : "status error";

    })

    .withFailureHandler(error => {

      console.error(error);

      resendButton.disabled = false;

      resendButton.textContent =
        "SEND A NEW VERIFICATION EMAIL";

      resendStatus.textContent =
        "Something went wrong. Please try again.";

      resendStatus.className =
        "status error";

    })

    .resendVerification(email);

});


verifyToken();

</script>
