// transactions.js: Transaction history page (search, filter, sort)
//
// Reads the data that transfer.js already saves in localStorage:
//   "balance"      -> a number (as text)
//   "transactions" -> a JSON array, newest first, each item like:
//        { type: "deposit" | "withdrawal", description, amount, date (ISO text), ref }
// This page only READS that data. It never changes the balance.

(function () {
  "use strict";

  // ---------- Settings ----------
  // TODO (group): login.js has to save this key when a user logs in successfully,
  // for example: sessionStorage.setItem("loggedIn", "true");
  // Change this one line if the login page uses a different key.
  var LOGIN_FLAG_KEY = "eduvosLoggedIn";
  var LOGIN_PAGE = "index.html";

  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // ---------- Page protection ----------
  // If the user is not logged in, send them to the login page.
  function isLoggedIn() {
    try {
      var flag = sessionStorage.getItem(LOGIN_FLAG_KEY) || localStorage.getItem(LOGIN_FLAG_KEY);
      return !!flag && flag !== "false";
    } catch (e) {
      return false;
    }
  }
  if (!isLoggedIn()) {
    window.location.replace(LOGIN_PAGE);
    return; // stop here: nothing else on this page runs
  }

  // ---------- Helpers ----------
  var $ = function (id) { return document.getElementById(id); };

  // Money: 12500 -> "R 12 500.00" (same style as the shared convention)
  function money(n) {
    var parts = Math.abs(n).toFixed(2).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return "R " + parts.join(".");
  }

  function pad(n) { return n < 10 ? "0" + n : String(n); }

  // Date: "28 Oct 2026, 14:05". Returns "Unknown date" if the saved date is broken.
  function formatDate(d) {
    if (isNaN(d.getTime())) return "Unknown date";
    return d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear() +
           ", " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  // ---------- Reading and saving data ----------
  var loadProblem = ""; // message shown in the alert box if something went wrong

  // Fictional starter history. Only used when nobody has saved any
  // transactions yet. Deposits minus withdrawals = R 12 500.00, which matches
  // the default starting balance in transfer.js.
  function buildDemoTransactions() {
    var DAY = 24 * 60 * 60 * 1000;
    function daysAgo(n) { return new Date(Date.now() - n * DAY).toISOString(); }
    return [
      { type: "withdrawal", description: "Eduvos textbooks",        amount: 2000.00,  date: daysAgo(3)  },
      { type: "deposit",    description: "Refund: online order",     amount: 450.00,   date: daysAgo(6)  },
      { type: "withdrawal", description: "Prepaid electricity",      amount: 750.00,   date: daysAgo(9)  },
      { type: "withdrawal", description: "Airtime and data",         amount: 299.50,   date: daysAgo(12) },
      { type: "deposit",    description: "Cash deposit",             amount: 1200.00,  date: daysAgo(15) },
      { type: "withdrawal", description: "Groceries",                amount: 1100.50,  date: daysAgo(20) },
      { type: "deposit",    description: "Part-time job payment",    amount: 15000.00, date: daysAgo(28) }
    ];
  }

  function loadTransactions() {
    var raw = null;
    try {
      raw = localStorage.getItem("transactions");
    } catch (e) {
      loadProblem = "Your browser is blocking saved data, so no transactions can be shown.";
      return [];
    }

    // First visit: nothing saved yet, so start with the demo history.
    if (raw === null) {
      var demo = buildDemoTransactions();
      try { localStorage.setItem("transactions", JSON.stringify(demo)); } catch (e) {}
      return demo.map(prepare).filter(Boolean);
    }

    var list;
    try {
      list = JSON.parse(raw);
    } catch (e) {
      loadProblem = "Your saved transactions could not be read.";
      return [];
    }
    if (!Array.isArray(list)) {
      loadProblem = "Your saved transactions could not be read.";
      return [];
    }

    var clean = [];
    var skipped = 0;
    list.forEach(function (item, index) {
      var tx = prepare(item, index);
      if (tx) { clean.push(tx); } else { skipped++; }
    });
    if (skipped > 0) {
      loadProblem = skipped + (skipped === 1 ? " record was" : " records were") +
                    " skipped because it could not be read.";
    }
    return clean;
  }

  // Turns one saved item into a safe object the page can use.
  // Returns null when the item is unusable.
  function prepare(item, index) {
    if (!item || typeof item !== "object") return null;
    var amount = Number(item.amount);
    if (!isFinite(amount) || amount < 0) return null;
    if (item.type !== "deposit" && item.type !== "withdrawal") return null;

    var date = new Date(item.date);
    return {
      type: item.type,
      description: String(item.description || "Transaction"),
      amount: amount,
      date: date,
      time: isNaN(date.getTime()) ? 0 : date.getTime(),
      ref: item.ref ? String(item.ref) : "",
      order: typeof index === "number" ? index : 0 // position in the saved list
    };
  }

  // ---------- Page state ----------
  var allTransactions = loadTransactions();

  var searchInput = $("search");
  var typeSelect = $("type-filter");
  var sortSelect = $("sort");

  // ---------- Summary (always uses ALL transactions) ----------
  function showSummary() {
    var deposits = 0, withdrawals = 0;
    allTransactions.forEach(function (tx) {
      if (tx.type === "deposit") deposits += tx.amount; else withdrawals += tx.amount;
    });
    $("sum-deposits").textContent = money(deposits);
    $("sum-withdrawals").textContent = money(withdrawals);
    $("sum-count").textContent = String(allTransactions.length);
  }

  // ---------- Filtering and sorting ----------
  function matchesSearch(tx, text) {
    if (!text) return true;
    // Search in: description, reference, formatted date and amount (with and without "R").
    var haystack = [
      tx.description,
      tx.ref,
      formatDate(tx.date),
      money(tx.amount),
      tx.amount.toFixed(2)
    ].join(" ").toLowerCase();
    return haystack.indexOf(text) !== -1;
  }

  function getVisibleTransactions() {
    var text = searchInput.value.trim().toLowerCase();
    var type = typeSelect.value;

    var result = allTransactions.filter(function (tx) {
      var typeOk = (type === "all") || (tx.type === type);
      return typeOk && matchesSearch(tx, text);
    });

    var sort = sortSelect.value;
    result.sort(function (a, b) {
      if (sort === "high") return b.amount - a.amount;
      if (sort === "low") return a.amount - b.amount;
      // Dates: newest/oldest. If two have the same time, keep the saved order
      // (transfer.js saves the newest first).
      var byDate = (sort === "oldest") ? a.time - b.time : b.time - a.time;
      if (byDate !== 0) return byDate;
      return (sort === "oldest") ? b.order - a.order : a.order - b.order;
    });
    return result;
  }

  // ---------- Drawing the list ----------
  // We build elements with textContent (not innerHTML) so a recipient name
  // typed on the Transfer page can never inject HTML into this page.
  function makeItem(tx) {
    var isDeposit = tx.type === "deposit";

    var li = document.createElement("li");
    li.className = "tx-item " + (isDeposit ? "tx-item-deposit" : "tx-item-withdrawal");

    var badge = document.createElement("span");
    badge.className = "tx-badge " + (isDeposit ? "tx-badge-in" : "tx-badge-out");
    badge.textContent = isDeposit ? "Deposit" : "Withdrawal";

    var info = document.createElement("div");
    info.className = "tx-info";

    var desc = document.createElement("p");
    desc.className = "tx-desc";
    desc.textContent = tx.description;

    var meta = document.createElement("p");
    meta.className = "tx-meta";
    var time = document.createElement("time");
    time.textContent = formatDate(tx.date);
    if (tx.time) time.setAttribute("datetime", tx.date.toISOString());
    meta.appendChild(time);
    if (tx.ref) meta.appendChild(document.createTextNode(" · Ref: " + tx.ref));

    info.appendChild(desc);
    info.appendChild(meta);

    var amount = document.createElement("p");
    amount.className = "tx-amount " + (isDeposit ? "tx-in" : "tx-out");
    amount.textContent = (isDeposit ? "+ " : "− ") + money(tx.amount);

    li.appendChild(badge);
    li.appendChild(info);
    li.appendChild(amount);
    return li;
  }

  function render() {
    var visible = getVisibleTransactions();
    var list = $("tx-list");
    list.innerHTML = ""; // clear the old rows

    visible.forEach(function (tx) { list.appendChild(makeItem(tx)); });

    // Message for screen readers and sighted users
    var count = $("result-count");
    if (allTransactions.length === 0) {
      count.textContent = "";
    } else if (visible.length === allTransactions.length) {
      count.textContent = "Showing all " + allTransactions.length +
        (allTransactions.length === 1 ? " transaction." : " transactions.");
    } else {
      count.textContent = "Showing " + visible.length + " of " + allTransactions.length + " transactions.";
    }

    // Empty states
    var empty = $("tx-empty");
    var emptyMsg = $("tx-empty-msg");
    var clearBtn = $("empty-clear-btn");
    var transferLink = $("empty-transfer-link");

    if (visible.length > 0) {
      empty.hidden = true;
      return;
    }
    empty.hidden = false;
    if (allTransactions.length === 0) {
      emptyMsg.textContent = "You have no transactions yet. Make a transfer and it will show up here.";
      clearBtn.hidden = true;
      transferLink.hidden = false;
    } else {
      emptyMsg.textContent = "No transactions match your search or filter.";
      clearBtn.hidden = false;
      transferLink.hidden = true;
    }
  }

  // ---------- Events ----------
  function clearFilters() {
    searchInput.value = "";
    typeSelect.value = "all";
    sortSelect.value = "newest";
    render();
    searchInput.focus();
  }

  searchInput.addEventListener("input", render);
  typeSelect.addEventListener("change", render);
  sortSelect.addEventListener("change", render);
  $("clear-btn").addEventListener("click", clearFilters);
  $("empty-clear-btn").addEventListener("click", clearFilters);

  // Pressing Enter in the search box should not reload the page
  $("filter-form").addEventListener("submit", function (e) { e.preventDefault(); });

  // Logout: remove the login flag, then the link goes to the login page
  $("logout-link").addEventListener("click", function () {
    try {
      sessionStorage.removeItem(LOGIN_FLAG_KEY);
      localStorage.removeItem(LOGIN_FLAG_KEY);
    } catch (e) {}
  });

  // ---------- Start ----------
  if (loadProblem) {
    var alertBox = $("tx-alert");
    alertBox.textContent = loadProblem;
    alertBox.hidden = false;
  }
  showSummary();
  render();
})();
