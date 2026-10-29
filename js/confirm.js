/* =========================================================
   confirm.js - Confirmation screen + success/error messages
   Flow: Transfer page -> confirm.html (review) -> result message
   Uses helpers from data.js (loaded first).
   ========================================================= */

// ---------- 1. Protect the page: must be logged in ----------
if (!requireLogin()) {
  throw new Error("Not logged in");
}

// ---------- 2. Grab the page elements we need (matching confirm.html IDs) ----------
const reviewCard = document.getElementById("review-card");
const resultCard = document.getElementById("result-card");
const resultTick = document.getElementById("result-tick");
const resultAlert = document.getElementById("result-alert");
const resultErrors = document.getElementById("result-errors");
const resultDetails = document.getElementById("result-details");
const resultButtons = document.getElementById("result-buttons");
const confirmBtn = document.getElementById("confirm-btn");
const cancelBtn = document.getElementById("cancel-btn");
const toast = document.getElementById("toast");

// ---------- 3. Small helper functions ----------

// Shows a short pop-up message for 3 seconds.
function showToast(text) {
  if (!toast) return;
  toast.textContent = text;
  toast.classList.remove("hidden");
  setTimeout(function () {
    toast.classList.add("hidden");
  }, 3000);
}

// Builds a link styled like a button (used in the result section).
function makeLink(text, href, isPrimary) {
  const a = document.createElement("a");
  a.href = href;
  a.textContent = text;
  a.className = "btn " + (isPrimary ? "btn-primary" : "btn-secondary");
  return a;
}

// Shows the result card with a success or error message.
// type is "success" or "error". errors is an optional list of problems.
function showResult(type, text, errors) {
  if (reviewCard) reviewCard.classList.add("hidden");
  if (resultCard) resultCard.classList.remove("hidden");

  if (resultAlert) {
    resultAlert.textContent = text;
    resultAlert.className = "result-alert " + type;
  }

  if (resultTick) {
    resultTick.textContent = type === "success" ? "\u2713" : "!";
    resultTick.className = "result-tick " + type;
  }

  // Clear old errors, then list any new ones
  if (resultErrors) {
    resultErrors.innerHTML = "";
    (errors || []).forEach(function (err) {
      const li = document.createElement("li");
      li.textContent = err;
      resultErrors.appendChild(li);
    });
  }
}

// ---------- 4. Page start: read and check the pending transfer ----------
const pending = getPendingTransfer();

if (!pending) {
  // Someone opened confirm.html directly with nothing to confirm
  showResult("error", "There is no transfer to confirm.", [
    "Please fill in the transfer form first."
  ]);
  showToast("There is no transfer to confirm.", "error");
  resultButtons.appendChild(makeLink("Go to Transfer page", "transfer.html", true));
} else {
  // Double-check the values (the balance may have changed since the form)
  const problems = validateTransfer(pending);

  if (problems.length > 0) {
    showResult("error", "We could not confirm this transfer.", problems);
    showToast("Transfer details could not be verified.", "error");
    resultButtons.appendChild(makeLink("Back to Transfer page", "transfer.html", true));
  } else {
    // Everything is fine: show the review summary
    const bank = getBankData();
    const amount = Number(pending.amount);

    const elRecipient = document.getElementById("c-recipient");
    const elAccount = document.getElementById("c-account");
    const elAmount = document.getElementById("c-amount");
    const elNow = document.getElementById("c-now");
    const elAfter = document.getElementById("c-after");

    if (elRecipient) elRecipient.textContent = pending.recipient.trim();
    if (elAccount) elAccount.textContent = pending.accountNumber || pending.account;
    if (elAmount) elAmount.textContent = formatCurrency(amount);
    if (elNow) elNow.textContent = formatCurrency(bank.balance);
    if (elAfter) elAfter.textContent = formatCurrency(bank.balance - amount);

    if (reviewCard) reviewCard.classList.remove("hidden");
    if (confirmBtn) confirmBtn.focus();
    showToast("Please review your transfer details.", "info");
  }
}

// ---------- 5. Confirm button: simulate sending the money ----------
if (confirmBtn) {
  confirmBtn.addEventListener("click", function () {
    confirmBtn.disabled = true;
    if (cancelBtn) cancelBtn.disabled = true;
    confirmBtn.textContent = "Processing...";

    setTimeout(function () {
      const result = makeTransfer(pending);

      if (result.success) {
        clearPendingTransfer();
        showResult("success", "Transfer successful! The money has been sent.");

        const resRef = document.getElementById("r-ref");
        const resAmount = document.getElementById("r-amount");
        const resBalance = document.getElementById("r-balance");

        if (resRef) resRef.textContent = result.reference;
        if (resAmount) resAmount.textContent = formatCurrency(pending.amount);
        if (resBalance) resBalance.textContent = formatCurrency(result.newBalance);
        if (resultDetails) resultDetails.classList.remove("hidden");

        resultButtons.innerHTML = "";
        resultButtons.appendChild(makeLink("View transactions", "transactions.html", false));
        resultButtons.appendChild(makeLink("Back to dashboard", "dashboard.html", true));
        showToast("Transfer of " + formatCurrency(pending.amount) + " completed successfully!", "success");
        setFlashMessage("Transfer of " + formatCurrency(pending.amount) + " was successful.", "success");
      } else {
        showResult("error", "Transfer failed. Nothing was sent.", result.errors);
        resultButtons.innerHTML = "";
        resultButtons.appendChild(makeLink("Back to Transfer page", "transfer.html", true));
        showToast("Transfer failed. Please try again.", "error");
      }
    }, 1000);
  });
}

// ---------- 6. Cancel button: discard the pending transfer ----------
if (cancelBtn) {
  cancelBtn.addEventListener("click", function () {
    clearPendingTransfer();
    showResult("error", "Transfer cancelled. No money was sent.");
    resultButtons.innerHTML = "";
    resultButtons.appendChild(makeLink("Start a new transfer", "transfer.html", true));
    resultButtons.appendChild(makeLink("Back to dashboard", "dashboard.html", false));
    showToast("Transfer cancelled. No money was sent.", "info");
  });
}
