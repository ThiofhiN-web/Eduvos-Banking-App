/* ============================================================
   Eduvos Banking App — LOGIN PAGE LOGIC (js/login.js)
   Handles: field validation, password show/hide, remember-me,
   and the login attempt against the mock user in js/data.js.
   Mock credentials (from the shared spec): demo / Demo@1234
   ============================================================ */

"use strict";

// Grab the elements we need (script loads at end of body, so DOM is ready)
const form = document.getElementById("login-form");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const rememberBox = document.getElementById("remember");
const toggleBtn = document.getElementById("toggle-password");
const formAlert = document.getElementById("form-alert");

const usernameError = document.getElementById("username-error");
const passwordError = document.getElementById("password-error");

/* ---------- Remember me: pre-fill the username on page load ---------- */
const remembered = localStorage.getItem(EDUVOS_REMEMBER_KEY);
if (remembered) {
  usernameInput.value = remembered;
  rememberBox.checked = true;
}

/* ---------- Password show / hide toggle ---------- */
toggleBtn.addEventListener("click", function () {
  const isHidden = passwordInput.type === "password";

  // Switch the input type between "password" and "text"
  passwordInput.type = isHidden ? "text" : "password";

  // Update the button's accessible label/state so screen readers know
  toggleBtn.setAttribute("aria-pressed", String(isHidden));
  toggleBtn.setAttribute(
    "aria-label",
    isHidden ? "Hide password" : "Show password"
  );

  // Keep focus in the field so the user can keep typing
  passwordInput.focus();
});

/* ---------- Validation helpers ---------- */
function showFieldError(input, errorEl, message) {
  errorEl.textContent = message;
  errorEl.classList.add("visible");
  input.classList.add("invalid");
  input.setAttribute("aria-invalid", "true");
}

function clearFieldError(input, errorEl) {
  errorEl.textContent = "";
  errorEl.classList.remove("visible");
  input.classList.remove("invalid");
  input.removeAttribute("aria-invalid");
}

function showFormAlert(message, type = "error") {
  formAlert.textContent = message;
  formAlert.className = "form-alert visible " + type;
}

/* Clear an error as soon as the user starts fixing the field */
usernameInput.addEventListener("input", function () {
  clearFieldError(usernameInput, usernameError);
  formAlert.classList.remove("visible");
});
passwordInput.addEventListener("input", function () {
  clearFieldError(passwordInput, passwordError);
  formAlert.classList.remove("visible");
});

/* ---------- Form submit ---------- */
form.addEventListener("submit", function (event) {
  // Stop the browser's default page reload/navigation
  event.preventDefault();

  let firstInvalid = null;

  // --- Validate username ---
  const username = usernameInput.value.trim();
  if (username === "") {
    showFieldError(usernameInput, usernameError, "Please enter your username.");
    firstInvalid = firstInvalid || usernameInput;
  } else if (username.length < 3) {
    showFieldError(
      usernameInput,
      usernameError,
      "Username must be at least 3 characters."
    );
    firstInvalid = firstInvalid || usernameInput;
  } else {
    clearFieldError(usernameInput, usernameError);
  }

  // --- Validate password ---
  const password = passwordInput.value;
  if (password === "") {
    showFieldError(passwordInput, passwordError, "Please enter your password.");
    firstInvalid = firstInvalid || passwordInput;
  } else if (password.length < 8) {
    showFieldError(
      passwordInput,
      passwordError,
      "Password must be at least 8 characters."
    );
    firstInvalid = firstInvalid || passwordInput;
  } else {
    clearFieldError(passwordInput, passwordError);
  }

  // If anything failed, focus the first bad field and stop here
  if (firstInvalid) {
    firstInvalid.focus();
    showToast("Please correct the highlighted errors.", "error");
    return;
  }

  // --- Check against the mock user (from js/data.js) ---
  if (login(username, password)) {
    // Remember-me: store or clear the username
    if (rememberBox.checked) {
      localStorage.setItem(EDUVOS_REMEMBER_KEY, username);
    } else {
      localStorage.removeItem(EDUVOS_REMEMBER_KEY);
    }

    const bank = getBankData();
    setFlashMessage("Welcome back, " + bank.user.name + "!", "success");
    showFormAlert("Login successful! Redirecting...", "success");
    showToast("Login successful!", "success");

    setTimeout(function () {
      window.location.href = "dashboard.html";
    }, 400);
  } else {
    showFormAlert("Incorrect username or password. Please try again.", "error");
    showToast("Incorrect username or password.", "error");
    passwordInput.value = "";
    passwordInput.focus();
  }
});

/* ---------- Demo-only links (no backend, so explain instead of 404) ---------- */
document.getElementById("forgot-link").addEventListener("click", function (e) {
  e.preventDefault();
  showFormAlert(
    "This is a demo — password reset is not implemented. Use demo / Demo@1234.",
    "info"
  );
  showToast("Demo mode: Use demo / Demo@1234", "info");
});

document.getElementById("signup-link").addEventListener("click", function (e) {
  e.preventDefault();
  showFormAlert("This is a demo — sign up is not implemented. Use demo / Demo@1234.", "info");
  showToast("Demo mode: Use demo / Demo@1234", "info");
});