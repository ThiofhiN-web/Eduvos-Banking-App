/* =========================================================
   confirm.js - Confirmation screen + success/error messages
   Flow: Transfer page -> confirm.html (review) -> result message
   Uses helpers from data.js (loaded first).
   ========================================================= */

// ---------- 1. Protect the page: must be logged in ----------
if (!requireLogin()) {
  // requireLogin() already redirected to index.html; stop running this file.
  throw new Error("Not logged in");
}

// ---------- 2. Grab the page elements we need ----------
const reviewSection = document.getElementById("reviewSection");
const resultSection = document.getElementById("resultSection");
const resultMessage = document.getElementById("resultMessage");
const resultErrors = document.getElementById("resultErrors");
const resultDetails = document.getElementById("resultDetails");
const resultButtons = document.getElementById("resultButtons");
const confirmBtn = document.getElementById("confirmBtn");
const cancelBtn = document.getElementById("cancelBtn");
const toast = document.getElementById("toast");

// ---------- 3. Small helper functions ----------

// Shows a short pop-up message for 3 seconds.
function showToast(text) {
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
  reviewSection.classList.add("hidden");
  resultSection.classList.remove("hidden");

  resultMessage.textContent = text;
  resultMessage.className = "message message-" + type;

  // Clear old errors, then list any new ones
  resultErrors.innerHTML = "";
  (errors || []).forEach(function (err) {
    const li = document.createElement("li");
    li.textContent = err;       // textContent (not innerHTML) keeps typed text safe
    resultErrors.appendChild(li);
  });
}

// ---------- 4. Page start: read and check the pending transfer ----------
const pending = getPendingTransfer();

if (!pending) {
  // Someone opened confirm.html directly with nothing to confirm
  showResult("error", "There is no transfer to confirm.", [
    "Please fill in the transfer form first."
  ]);
  resultButtons.appendChild(makeLink("Go to Transfer page", "transfer.html", true));
} else {
  // Double-check the values (the balance may have changed since the form)
  const problems = validateTransfer(pending);

  if (problems.length > 0) {
    showResult("error", "We could not confirm this transfer.", problems);
    resultButtons.appendChild(makeLink("Back to Transfer page", "transfer.html", true));
  } else {
    // Everything is fine: show the review summary
    const bank = getBankData();
    const amount = Number(pending.amount);

    document.getElementById("sumRecipient").textContent = pending.recipient.trim();
    document.getElementById("sumAccount").textContent = pending.accountNumber;
    document.getElementById("sumAmount").textContent = formatCurrency(amount);
    document.getElementById("sumBalanceNow").textContent = formatCurrency(bank.balance);
    document.getElementById("sumBalanceAfter").textContent = formatCurrency(bank.balance - amount);

    reviewSection.classList.remove("hidden");
    confirmBtn.focus(); // helps keyboard users
  }
}

// ---------- 5. Confirm button: simulate sending the money ----------
confirmBtn.addEventListener("click", function () {
  // Stop double-clicks and show that something is happening
  confirmBtn.disabled = true;
  cancelBtn.disabled = true;
  confirmBtn.textContent = "Processing...";

  // A short delay makes it feel like a real transfer (it is only a simulation)
  setTimeout(function () {
    const result = makeTransfer(pending);

    if (result.success) {
      clearPendingTransfer();   // so refreshing the page can't send it twice
      showResult("success", "Transfer successful! The money has been sent.");

      document.getElementById("resRef").textContent = result.reference;
      document.getElementById("resAmount").textContent = formatCurrency(pending.amount);
      document.getElementById("resBalance").textContent = formatCurrency(result.newBalance);
      resultDetails.classList.remove("hidden");

      resultButtons.appendChild(makeLink("View transactions", "transactions.html", false));
      resultButtons.appendChild(makeLink("Back to dashboard", "dashboard.html", true));
      showToast("Transfer of " + formatCurrency(pending.amount) + " completed");
    } else {
      showResult("error", "Transfer failed. Nothing was sent.", result.errors);
      resultButtons.appendChild(makeLink("Back to Transfer page", "transfer.html", true));
      showToast("Transfer failed");
    }
  }, 1000);
});

// ---------- 6. Cancel button: discard the pending transfer ----------
cancelBtn.addEventListener("click", function () {
  clearPendingTransfer();
  showResult("error", "Transfer cancelled. No money was sent.");
  resultButtons.appendChild(makeLink("Start a new transfer", "transfer.html", true));
  resultButtons.appendChild(makeLink("Back to dashboard", "dashboard.html", false));
  showToast("Transfer cancelled");
});
