// transfer.js — Transfer page logic (validation, confirmation, success/error messages)
// Balance and transactions are kept in localStorage. If data.js already exposes
// helpers for these, swap getBalance / saveBalance / addTransaction for those.

(function () {
  "use strict";

  var DEFAULT_BALANCE = 12500.0;
  var MAX_TRANSFER = 50000;

  // ---------- Storage helpers ----------
  function getBalance() {
    try {
      var v = parseFloat(localStorage.getItem("balance"));
      if (!isNaN(v)) return v;
    } catch (e) {}
    return DEFAULT_BALANCE;
  }
  function saveBalance(v) {
    try { localStorage.setItem("balance", String(v)); } catch (e) {}
  }
  function addTransaction(tx) {
    try {
      var list = JSON.parse(localStorage.getItem("transactions") || "[]");
      list.unshift(tx);
      localStorage.setItem("transactions", JSON.stringify(list));
    } catch (e) {}
  }
  function money(n) {
    return "R" + n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ---------- Elements ----------
  var $ = function (id) { return document.getElementById(id); };
  var stepForm = $("step-form"), stepConfirm = $("step-confirm"), stepSuccess = $("step-success");
  var recipient = $("recipient"), account = $("account"), amount = $("amount");
  var formAlert = $("form-alert");
  var pending = null;

  function show(step) {
    [stepForm, stepConfirm, stepSuccess].forEach(function (s) { s.classList.add("hidden"); });
    step.classList.remove("hidden");
    window.scrollTo(0, 0);
  }
  function refreshBalance() { $("balance").textContent = money(getBalance()); }

  function showAlert(msg) {
    formAlert.textContent = msg;
    formAlert.style.display = "block";
  }
  function hideAlert() {
    formAlert.textContent = "";
    formAlert.style.display = "none";
  }

  // ---------- Validation ----------
  function setError(input, errId, msg) {
    $(errId).textContent = msg;
    input.classList.toggle("invalid", !!msg);
    input.setAttribute("aria-invalid", msg ? "true" : "false");
    return !msg;
  }
  function validateRecipient() {
    var v = recipient.value.trim();
    if (!v) return setError(recipient, "recipient-error", "Please enter the recipient's name.");
    if (!/^[A-Za-z][A-Za-z .'\-]{1,49}$/.test(v))
      return setError(recipient, "recipient-error", "Use letters only (2 to 50 characters).");
    return setError(recipient, "recipient-error", "");
  }
  function validateAccount() {
    var v = account.value.trim();
    if (!v) return setError(account, "account-error", "Please enter the account number.");
    if (!/^\d+$/.test(v)) return setError(account, "account-error", "Use digits only, with no spaces or letters.");
    if (v.length < 10 || v.length > 11)
      return setError(account, "account-error", "Account numbers have 10 or 11 digits. You entered " + v.length + ".");
    return setError(account, "account-error", "");
  }
  function validateAmount() {
    var raw = amount.value.trim().replace(",", ".");
    if (!raw) return setError(amount, "amount-error", "Please enter the amount to send.");
    if (!/^\d+(\.\d{1,2})?$/.test(raw))
      return setError(amount, "amount-error", "Enter a valid amount, for example 250.00.");
    var n = parseFloat(raw);
    if (n <= 0) return setError(amount, "amount-error", "The amount must be more than R0.00.");
    if (n > MAX_TRANSFER) return setError(amount, "amount-error", "The limit is " + money(MAX_TRANSFER) + " per transfer.");
    if (n > getBalance())
      return setError(amount, "amount-error", "Insufficient funds. Your balance is " + money(getBalance()) + ".");
    return setError(amount, "amount-error", "");
  }

  recipient.addEventListener("blur", validateRecipient);
  account.addEventListener("blur", validateAccount);
  amount.addEventListener("blur", validateAmount);
  account.addEventListener("input", function () { account.value = account.value.replace(/\D/g, ""); });

  // ---------- Step 1 -> Step 2 ----------
  $("transfer-form").addEventListener("submit", function (e) {
    e.preventDefault();
    hideAlert();

    var ok = [validateRecipient(), validateAccount(), validateAmount()].every(Boolean);
    if (!ok) {
      showAlert("Transfer not sent. Please fix the highlighted fields.");
      var bad = document.querySelector("input.invalid");
      if (bad) bad.focus();
      return;
    }

    pending = {
      recipient: recipient.value.trim(),
      account: account.value.trim(),
      amount: parseFloat(amount.value.trim().replace(",", "."))
    };
    $("c-recipient").textContent = pending.recipient;
    $("c-account").textContent = pending.account;
    $("c-amount").textContent = money(pending.amount);
    $("c-after").textContent = money(getBalance() - pending.amount);
    show(stepConfirm);
  });

  // ---------- Step 2 ----------
  $("edit-btn").addEventListener("click", function () { show(stepForm); recipient.focus(); });

  $("confirm-btn").addEventListener("click", function () {
    var btn = $("confirm-btn");
    btn.disabled = true;
    btn.textContent = "Sending...";

    setTimeout(function () {
      btn.disabled = false;
      btn.innerHTML = "Confirm &amp; Send";

      if (pending.amount > getBalance()) {
        show(stepForm);
        showAlert("Transfer failed. Your balance is no longer enough for this amount.");
        return;
      }

      saveBalance(getBalance() - pending.amount);
      var ref = "TRF" + Date.now().toString().slice(-8);
      addTransaction({
        type: "withdrawal",
        description: "Transfer to " + pending.recipient + " (" + pending.account + ")",
        amount: pending.amount,
        date: new Date().toISOString(),
        ref: ref
      });

      refreshBalance();
      $("success-alert").textContent = money(pending.amount) + " was sent to " + pending.recipient + ".";
      $("success-ref").textContent = "Reference: " + ref;
      show(stepSuccess);
    }, 900);
  });

  // ---------- Step 3 ----------
  $("again-btn").addEventListener("click", function () {
    $("transfer-form").reset();
    [recipient, account, amount].forEach(function (i) { i.classList.remove("invalid"); });
    ["recipient-error", "account-error", "amount-error"].forEach(function (id) { $(id).textContent = ""; });
    hideAlert();
    pending = null;
    show(stepForm);
    recipient.focus();
  });

  refreshBalance();
})();