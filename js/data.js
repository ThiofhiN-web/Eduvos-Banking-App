 //   Storage keys (agreed conventions)  
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
      { id: 1, date: "2026-10-01", type: "deposit", description: "Opening deposit", amount: 5000.0 },
      { id: 2, date: "2026-10-05", type: "withdrawal", description: "Groceries", amount: 650.0 },
      { id: 3, date: "2026-10-12", type: "deposit", description: "Refund", amount: 200.0 },
      { id: 4, date: "2026-10-18", type: "withdrawal", description: "Data bundle", amount: 120.0 }
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
// Returns { success, message } so the calling page can show feedback.
function addTransaction(type, description, amount) {
  const bank = getBankData();
  const value = Math.round(Number(amount) * 100) / 100;

  if (!(value > 0)) {
    return { success: false, message: "Amount must be more than zero." };
  }
  if (type === "withdrawal" && value > bank.balance) {
    return { success: false, message: "You do not have enough funds for this amount." };
  }

  const nextId = bank.transactions.reduce((max, t) => Math.max(max, t.id), 0) + 1;
  bank.transactions.push({
    id: nextId,
    date: todayISO(),
    type: type,
    description: description,
    amount: value
  });

  const change = type === "deposit" ? value : -value;
  bank.balance = Math.round((bank.balance + change) * 100) / 100;
  saveBankData(bank);

  return { success: true, message: "Transaction saved." };
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

// Turns "2026-10-18" into "18 Oct 2026" for display.
function formatDate(isoDate) {
  const date = new Date(isoDate + "T00:00:00");
  return date.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

// Login and access control

// Checks the fictional credentials. Returns true if they match.
// Named login() to match the login page's js/login.js.
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

// Any element with data-logout clears the session when clicked.
// The link itself then takes the user to index.html.
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll("[data-logout]").forEach(function (link) {
    link.addEventListener("click", logoutUser);
  });
});
