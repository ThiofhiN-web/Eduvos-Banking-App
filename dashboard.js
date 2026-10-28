
// Text is set with textContent, so it is always safe to display.
function makeEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) {
    el.className = className;
  }
  el.textContent = text;
  return el;
} 

document.addEventListener("DOMContentLoaded", function () {
  // Protect the page: anyone not logged in is sent to the login page.
  if (!requireLogin()) {
    return;
  }

  const bank = getBankData();

  // Greeting
  document.getElementById("greeting").textContent = "Hello, " + bank.user.name;

  // Balance with show/hide
  const balanceEl = document.getElementById("balance");
  const toggleBtn = document.getElementById("toggle-balance");
  let balanceVisible = true;

  function showBalance() {
    balanceEl.textContent = balanceVisible ? formatCurrency(bank.balance) : "R *****";
    toggleBtn.textContent = balanceVisible ? "Hide balance" : "Show balance";
  }

  toggleBtn.addEventListener("click", function () {
    balanceVisible = !balanceVisible;
    showBalance();
  });

  showBalance();

  // Recent activity: the five newest transactions
  const recentList = document.getElementById("recent-list");
  const recent = bank.transactions
    .slice()
    .sort(function (a, b) {
      // Newest date comes first. Same date: then later-added (higher id) comes first.
      if (a.date !== b.date) {
        return a.date < b.date ? 1 : -1;
      }
      return b.id - a.id;
    })
    .slice(0, 5);

  if (recent.length === 0) {
    document.getElementById("recent-empty").hidden = false;
  }

  recent.forEach(function (tx) {
    const isDeposit = tx.type === "deposit";
    const label = isDeposit ? "Deposit" : "Withdrawal";

    const details = makeEl("div", "tx-details");
    details.append(
      makeEl("span", "", tx.description),
      makeEl("span", "tx-type", formatDate(tx.date) + " · " + label)
    );

    // The sign and label are text, so meaning does not depend on colour alone.
    const amount = makeEl(
      "span",
      isDeposit ? "amount-deposit" : "amount-withdrawal",
      (isDeposit ? "+ " : "− ") + formatCurrency(tx.amount)
    );

    const item = makeEl("li", "tx-item");
    item.append(details, amount);
    recentList.appendChild(item);
  });
});
