// Storage keys (agreed conventions)
const BANK_KEY = "eduvosBank";         // localStorage: the whole mock account
const SESSION_KEY = "eduvosLoggedIn";  // sessionStorage: "true" while logged in
const PENDING_KEY = "pendingTransfer"; // sessionStorage: transfer waiting to be confirmed
const EDUVOS_REMEMBER_KEY = "eduvosRememberedUsername"; // localStorage: username for "remember me" (login page)

// Fictional login details
const MOCK_USERNAME = "demo";
const MOCK_PASSWORD = "Demo@1234";

// Seed data: used only the first time the app runs
function createSeedData() {
  return {
    user: { username: MOCK_USERNAME, name: "Demo Student" },
    balance: 4430.0, // 5000 - 650 + 200 - 120
    transactions: [
      { id: 1, date: "2026-10-01", type: "deposit", description: "Opening deposit", amount: 5000.0, ref: "DEP-1001" },
      { id: 2, date: "2026-10-05", type: "withdrawal", description: "Groceries", amount: 650.0, ref: "POS-2041" },
      { id: 3, date: "2026-10-12", type: "deposit", description: "Refund", amount: 200.0, ref: "REF-3312" },
      { id: 4, date: "2026-10-18", type: "withdrawal", description: "Data bundle", amount: 120.0, ref: "AIR-4402" }
    ]
  };
}

// Reading and saving the account

// Returns the account object. Creates seed data if nothing valid is saved.
function getBankData() {
  try {
    const saved = JSON.parse(localStorage.getItem(BANK_KEY));
    if (saved && saved.user && Array.isArray(saved.transactions)) {
      return saved;
    }
  } catch (err) {
    // Saved data is not valid JSON. Fall through and reset it below.
  }
  const seed = createSeedData();
  saveBankData(seed);
  return seed;
}

// Saves the whole account object back to localStorage.
function saveBankData(data) {
  localStorage.setItem(BANK_KEY, JSON.stringify(data));
}

// Adds a deposit or withdrawal and updates the balance.
// Returns { success, message, reference } so the calling page can show feedback.
function addTransaction(type, description, amount, customRef) {
  const bank = getBankData();
  const value = Math.round(Number(amount) * 100) / 100;

  if (!(value > 0)) {
    return { success: false, message: "Amount must be more than zero." };
  }
  if (type === "withdrawal" && value > bank.balance) {
    return { success: false, message: "You do not have enough funds for this amount." };
  }

  const nextId = bank.transactions.reduce((max, t) => Math.max(max, t.id || 0), 0) + 1;
  const ref = customRef || ("TXN" + Date.now().toString().slice(-8));

  bank.transactions.push({
    id: nextId,
    date: new Date().toISOString(),
    type: type,
    description: description,
    amount: value,
    ref: ref
  });

  const change = type === "deposit" ? value : -value;
  bank.balance = Math.round((bank.balance + change) * 100) / 100;
  saveBankData(bank);

  return { success: true, message: "Transaction saved.", reference: ref };
}

// Formatting helpers

// Formats a number as South African rand, e.g. 1250 -> "R 1 250.00"
function formatCurrency(amount) {
  const number = Number(amount);
  const parts = Math.abs(number).toFixed(2).split(".");          // ["1250", "00"]
  const rands = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " "); // "1 250"
  const sign = number < 0 ? "-" : "";
  return sign + "R " + rands + "." + parts[1];
}

// Returns today's date as "YYYY-MM-DD" using the user's local date.
function todayISO() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return now.getFullYear() + "-" + month + "-" + day;
}

// Turns "2026-10-18" or an ISO string into "18 Oct 2026" for display.
function formatDate(dateInput) {
  if (!dateInput) return "Unknown date";
  let date;
  if (typeof dateInput === "string") {
    if (dateInput.includes("T")) {
      date = new Date(dateInput);
    } else {
      date = new Date(dateInput + "T00:00:00");
    }
  } else {
    date = new Date(dateInput);
  }
  if (isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

// Login and access control

// Checks the fictional credentials. Returns true if they match.
function login(username, password) {
  if (username === MOCK_USERNAME && password === MOCK_PASSWORD) {
    sessionStorage.setItem(SESSION_KEY, "true");
    return true;
  }
  return false;
}

function isLoggedIn() {
  return sessionStorage.getItem(SESSION_KEY) === "true";
}

// Clears the session and any pending transfer.
function logoutUser() {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(PENDING_KEY);
  setFlashMessage("You have been logged out successfully.", "info");
}

// Global Toast / Feedback System
function showToast(message, type = "info", duration = 3500) {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }

  const icon = type === "success" ? "✓" : (type === "error" ? "✕" : "ℹ");
  toast.innerHTML = `<span aria-hidden="true" style="font-weight:700;">${icon}</span> <span>${message}</span>`;
  toast.className = `toast toast-${type}`;
  toast.classList.remove("hidden");

  if (window._toastTimer) clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(function () {
    toast.classList.add("hidden");
  }, duration);
}

// Flash messages (pass feedback messages between page redirections)
function setFlashMessage(message, type = "success") {
  try {
    sessionStorage.setItem("eduvosFlash", JSON.stringify({ message: message, type: type }));
  } catch (e) {}
}

function checkFlashMessage() {
  try {
    const raw = sessionStorage.getItem("eduvosFlash");
    if (raw) {
      sessionStorage.removeItem("eduvosFlash");
      const data = JSON.parse(raw);
      if (data && data.message) {
        showToast(data.message, data.type || "success");
      }
    }
  } catch (e) {}
}

// Call at the top of every protected page.
// If the user is not logged in, sends them to the login page and returns false.
function requireLogin() {
  if (isLoggedIn()) {
    return true;
  }
  window.location.replace("index.html");
  return false;
}

// Pending Transfer helpers (used for confirmation flows)
function savePendingTransfer(transfer) {
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(transfer));
}

function getPendingTransfer() {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function clearPendingTransfer() {
  sessionStorage.removeItem(PENDING_KEY);
}

function validateTransfer(pending) {
  const errors = [];
  if (!pending) {
    errors.push("No transfer details found.");
    return errors;
  }
  const bank = getBankData();
  const amt = Number(pending.amount);
  if (!pending.recipient || pending.recipient.trim().length < 2) {
    errors.push("Recipient name is required (at least 2 letters).");
  }
  const acc = pending.accountNumber || pending.account;
  if (!acc || !/^\d{10,11}$/.test(acc)) {
    errors.push("Account number must be 10 or 11 digits.");
  }
  if (!amt || amt <= 0) {
    errors.push("Amount must be greater than R0.00.");
  } else if (amt > 50000) {
    errors.push("The limit is R 50 000.00 per transfer.");
  } else if (amt > bank.balance) {
    errors.push("Insufficient funds. Your balance is " + formatCurrency(bank.balance) + ".");
  }
  return errors;
}

function makeTransfer(pending) {
  const errors = validateTransfer(pending);
  if (errors.length > 0) {
    return { success: false, errors: errors };
  }
  const acc = pending.accountNumber || pending.account;
  const amt = Number(pending.amount);
  const ref = pending.ref || ("TRF" + Date.now().toString().slice(-8));
  const desc = "Transfer to " + pending.recipient.trim() + " (" + acc + ")";
  const res = addTransaction("withdrawal", desc, amt, ref);
  if (!res.success) {
    return { success: false, errors: [res.message] };
  }
  clearPendingTransfer();
  const updatedBank = getBankData();
  return { success: true, reference: ref, newBalance: updatedBank.balance };
}

// Any element with data-logout clears the session when clicked.
// The link itself then takes the user to index.html.
document.addEventListener("DOMContentLoaded", function () {
  checkFlashMessage();
  document.querySelectorAll("[data-logout], #logout-link").forEach(function (link) {
    link.addEventListener("click", logoutUser);
  });
});
