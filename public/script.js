  const backendURL = "https://spent-nest-backend.vercel.app";
// const backendURL = "http://localhost:3000";

/* -------------------------
   NOTIFICATIONS & SOUND
   ------------------------- */
function playCoinSound() {
  const audio = document.getElementById("coinSound");
  if (!audio) return;
  audio.currentTime = 0;
  audio.play().catch(() => {
    // ignore browser autoplay blocking until user interacts
  });
}

function _createToastEl(message, type = "success") {
  const el = document.createElement("div");
  el.className = "toast";
  if (type === "error") el.classList.add("toast-error");
  if (type === "info") el.classList.add("toast-info");
  el.innerText = message;
  return el;
}

function showToast(message, type = "success", duration = 3000) {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const toast = _createToastEl(message, type);
  container.appendChild(toast);

  // trigger animation
  requestAnimationFrame(() => toast.classList.add("show"));

  // remove after duration
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 220);
  }, duration);
}

function notifySuccess(message) {
  playCoinSound();
  showToast(message, "success");
}

function notifyError(message) {
  showToast(message, "error");
}

function notifyInfo(message) {
  showToast(message, "info");
}

/* -------------------------
   UTILITIES
   ------------------------- */
function showMessage(text, isError = false) {
  // backward-compatible wrapper
  if (isError) notifyError(text);
  else notifySuccess(text);
}

function clearInputs(ids) {
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

/* -------------------------
   INIT / PAGE LOAD
   ------------------------- */
window.addEventListener("pageshow", () => {
  const page = window.location.pathname;

  if (page.includes("dashboard.html")) {
    if (!localStorage.getItem("token")) {
      window.location.href = "index.html";
    } else {
      loadDashboard();
    }
  }

  if (page.includes("ai.html")) {
    if (!localStorage.getItem("token")) {
      window.location.href = "index.html";
    } else {
      loadPrediction();
      loadRecommendations();
      loadAutoBudget();
      loadSavingsChallenge();
    }
  }

  const container = document.getElementById("container");
  const signUpBtn = document.getElementById("signUp");
  const signInBtn = document.getElementById("signIn");

  if (signUpBtn && signInBtn && container) {
    signUpBtn.addEventListener("click", () => container.classList.add("active"));
    signInBtn.addEventListener("click", () => container.classList.remove("active"));
  }
});

/* -------------------------
   DASHBOARD LOADER
   ------------------------- */
function loadDashboard() {
  getExpenses();
  getBudgets();
  getRemainingByCategory();
  getRemainingBudget();
  fetchSavings();
  setupSavingsListeners();
  getSavingsHistory();
  getIncome();
  loadAutoBudget();
  loadPrediction();
  loadRecommendations();
  loadSavingsChallenge();
  if (typeof loadQuote === "function") loadQuote();
  loadSummaryCard();
}

/* -------------------------
   AUTH
   ------------------------- */
async function login() {
  const email = document.getElementById("email")?.value;
  const password = document.getElementById("password")?.value;
  const btn = document.getElementById("signIn");

  if (!email || !password) {
    notifyError("Please enter email and password");
    return;
  }

  if (!btn) return;

  btn.disabled = true;
  btn.textContent = "Logging in...";
  btn.style.opacity = 0.6;
  btn.style.cursor = "not-allowed";

  try {
    const res = await fetch(`${backendURL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (res.ok) {
      notifySuccess("Login successful");
      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", data.user.id || data.user._id);
      localStorage.setItem("userName", data.user.name);
      localStorage.setItem("userEmail", data.user.email);

      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 350);
    } else {
      notifyError(data.message || "Login failed");
      resetLoginButton();
    }
  } catch (err) {
    console.error(err);
    notifyError("Login failed");
    resetLoginButton();
  }

  function resetLoginButton() {
    btn.disabled = false;
    btn.textContent = "Login";
    btn.style.opacity = 1;
    btn.style.cursor = "pointer";
  }
}

async function signup() {
  const name = document.getElementById("name")?.value;
  const email = document.getElementById("signupEmail")?.value;
  const password = document.getElementById("signupPassword")?.value;
  const btn = document.getElementById("signUp");

  if (!name || !email || !password) {
    notifyError("Please fill all fields");
    return;
  }

  if (!btn) return;

  btn.disabled = true;
  btn.textContent = "Signing up...";
  btn.style.opacity = 0.6;
  btn.style.cursor = "not-allowed";

  try {
    const res = await fetch(`${backendURL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();
    if (res.ok) {
      notifySuccess("Signup successful! Please sign in.");
      clearInputs(["name", "signupEmail", "signupPassword"]);
    } else {
      notifyError(data.message || "Signup failed");
    }
  } catch (err) {
    console.error(err);
    notifyError("Signup failed");
  }

  btn.disabled = false;
  btn.textContent = "Sign Up";
  btn.style.opacity = 1;
  btn.style.cursor = "pointer";
}

/* -------------------------
   LOGOUT
   ------------------------- */
function logout() {
  localStorage.clear();
  window.location.href = "index.html";
}

/* -------------------------
   INCOME
   ------------------------- */
async function setIncome() {
  const amount = document.getElementById("incomeAmount")?.value;
  const month = document.getElementById("incomeMonth")?.value;

  if (!amount || !month) {
    notifyError("Please enter income amount and month");
    return;
  }

  const income = {
    userId: localStorage.getItem("userId"),
    amount,
    month,
  };

  try {
    const res = await fetch(`${backendURL}/api/income/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(income),
    });

    const data = await res.json();
    if (res.ok) {
      notifySuccess("Income set successfully");
      clearInputs(["incomeAmount", "incomeMonth"]);
      getIncome();
    } else {
      notifyError(data.message || "Error setting income");
    }
  } catch (err) {
    console.error(err);
    notifyError("Error setting income");
  }
}

async function getIncome() {
  const userId = localStorage.getItem("userId");
  const list = document.getElementById("incomeList");
  if (!list) return;

  try {
    const res = await fetch(`${backendURL}/api/income/${userId}`);
    const incomes = await res.json();
    list.innerHTML = "";

    incomes.sort((a, b) => b.month.localeCompare(a.month));

    incomes.forEach((income) => {
      const item = document.createElement("div");
      item.innerHTML = `
        ${income.month} - ₹${income.amount}
        <button onclick="deleteIncome('${income._id}')">Delete</button>
      `;
      list.appendChild(item);
    });
  } catch (err) {
    console.error(err);
    notifyError("Error fetching incomes");
  }
}

async function deleteIncome(id) {
  if (!confirm("Are you sure you want to delete this income?")) return;

  try {
    const res = await fetch(`${backendURL}/api/income/${id}`, {
      method: "DELETE",
    });

    const data = await res.json();
    if (res.ok) {
      notifySuccess("Income deleted");
      getIncome();
    } else {
      notifyError(data.message || "Error deleting income");
    }
  } catch (err) {
    console.error(err);
    notifyError("Error deleting income");
  }
}

/* =========================
   DUES – FRONTEND LOGIC
========================= */

document.addEventListener("DOMContentLoaded", () => {
  const duesList = document.getElementById("dues-list");
  const totalReceive = document.getElementById("total-receive");
  const totalOwe = document.getElementById("total-owe");
  const addDueForm = document.getElementById("addDueForm");

  const userId = localStorage.getItem("userId");
  if (!userId) return;

  /* -------------------------
     FETCH + RENDER DUES
  -------------------------- */

  async function fetchDues() {
    try {
      const res = await fetch(`${backendURL}/api/dues/${userId}`);
      const dues = await res.json();
      renderDues(dues);
    } catch (err) {
      console.error("Fetch dues failed:", err);
    }
  }

  function renderDues(dues = []) {
    let receive = 0;
    let owe = 0;

    duesList.innerHTML = "";

    dues.forEach((due) => {
      if (due.status === "PENDING") {
        if (due.type === "LENT") receive += due.amount;
        if (due.type === "BORROW") owe += due.amount;
      }

      const div = document.createElement("div");
      div.className = `due-item ${due.status.toLowerCase()}`;

      div.innerHTML = `
        <div class="info">
          <strong>${due.personName}</strong>
          <small>${due.type} • ₹${due.amount}</small>
          <small>${due.notes}</small>
        </div>

        <div class="actions">
          ${
            due.status === "PENDING"
              ? `<button class="done-btn" data-id="${due._id}">Done</button>`
              : ""
          }
          <button class="delete-btn" data-id="${due._id}">Delete</button>
        </div>
      `;

      duesList.appendChild(div);
    });

    totalReceive.textContent = `₹${receive}`;
    totalOwe.textContent = `₹${owe}`;
  }

  /* -------------------------
     ADD DUE
  -------------------------- */

  if (addDueForm) {
    addDueForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const payload = {
        userId,
        type: addDueForm.type.value,
        personName: addDueForm.personName.value.trim(),
        amount: Number(addDueForm.amount.value),
        category: addDueForm.category.value,
        date: addDueForm.date.value,
        expectedReturnDate: addDueForm.expectedReturnDate.value,
        notes: addDueForm.notes.value || ""
      };

      if (!payload.personName || !payload.amount || !payload.date) {
        alert("Required fields missing");
        return;
      }

      try {
        const res = await fetch(`${backendURL}/api/dues`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const err = await res.json();
          alert(err.message || "Failed to add due");
          return;
        }

        addDueForm.reset();
        closeDueModal();
        fetchDues();
      } catch (err) {
        console.error("Add due failed:", err);
      }
    });
  }

  /* -------------------------
     MARK DONE + DELETE (EVENT DELEGATION)
  -------------------------- */

  duesList.addEventListener("click", async (e) => {
    const dueId = e.target.dataset.id;
    if (!dueId) return;

    /* MARK AS DONE */
    if (e.target.classList.contains("done-btn")) {
      try {
        await fetch(`${backendURL}/api/dues/${dueId}/done`, {
          method: "PATCH"
        });
        fetchDues();
      } catch (err) {
        console.error("Mark done failed:", err);
      }
    }

    /* DELETE */
    if (e.target.classList.contains("delete-btn")) {
      if (!confirm("Delete this due?")) return;

      try {
        await fetch(`${backendURL}/api/dues/${dueId}`, {
          method: "DELETE"
        });
        fetchDues();
      } catch (err) {
        console.error("Delete due failed:", err);
      }
    }
  });

  /* -------------------------
     INIT
  -------------------------- */

  fetchDues();
});

/* -------------------------
   MODAL HELPER
-------------------------- */
function closeDueModal() {
  document.getElementById("dueModal")?.classList.remove("open");
}


document.getElementById("add-due-btn")
  ?.addEventListener("click", () => {
    document.getElementById("dueModal").classList.add("open");
  });




/* -------------------------
   SAVINGS
   ------------------------- */
function setupSavingsListeners() {
  const savingsSlider = document.getElementById("savingsGoal");
  const savingsValueDisplay = document.getElementById("savingsValue");
  const savedAmountInput = document.getElementById("savedAmount");

  if (savingsSlider && savingsValueDisplay && savedAmountInput) {
    savingsSlider.addEventListener("input", () => {
      const val = Math.round(parseInt(savingsSlider.value || "0", 10) / 100) * 100;
      savingsSlider.value = val;
      savingsValueDisplay.textContent = `₹${val}`;
      updateSavingsBar();
    });

    savedAmountInput.addEventListener("input", updateSavingsBar);
  }
}

function updateSavingsBar() {
  const goalEl = document.getElementById("savingsGoal");
  const savedEl = document.getElementById("savedAmount");
  const bar = document.getElementById("savingsProgress");
  if (!goalEl || !savedEl || !bar) return;

  const goal = parseFloat(goalEl.value) || 0;
  const saved = parseFloat(savedEl.value) || 0;

  if (goal > 0) {
    const percent = Math.min((saved / goal) * 100, 100);
    bar.style.width = `${percent}%`;
  } else {
    bar.style.width = "0%";
  }
}

async function saveSavings() {
  const userId = localStorage.getItem("userId");
  const goal = parseFloat(document.getElementById("savingsGoal")?.value) || 0;
  const saved = parseFloat(document.getElementById("savedAmount")?.value) || 0;
  const month = document.getElementById("savingsMonth")?.value;

  if (!month) {
    notifyError("Please select a month for savings");
    return;
  }

  try {
    const res = await fetch(`${backendURL}/api/savings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, goal, saved, month }),
    });

    const data = await res.json();
    if (res.ok) {
      notifySuccess("Savings updated successfully!");
      updateSavingsBar();
      fetchSavings();
      getSavingsHistory();
    } else {
      notifyError(data.message || "Failed to update savings");
    }
  } catch (err) {
    console.error(err);
    notifyError("Error updating savings");
  }
}

async function fetchSavings() {
  const userId = localStorage.getItem("userId");
  const month =
    document.getElementById("savingsMonth")?.value ||
    new Date().toISOString().slice(0, 7);

  try {
    const res = await fetch(`${backendURL}/api/savings/${userId}?month=${month}`);
    const data = await res.json();

    if (res.ok && data) {
      const slider = document.getElementById("savingsGoal");
      const savedInput = document.getElementById("savedAmount");
      const display = document.getElementById("savingsValue");
      const historyDiv = document.getElementById("savingsHistory");

      if (slider && display) {
        slider.value = data.goal || 0;
        display.textContent = `₹${data.goal || 0}`;
      }

      if (savedInput) {
        savedInput.value = data.saved || 0;
      }

      if (historyDiv) {
        historyDiv.innerHTML = `
          <p>Previous Goal: ₹${data.goal || 0}</p>
          <p>Previous Saved: ₹${data.saved || 0}</p>
        `;
      }

      updateSavingsBar();
    }
  } catch (err) {
    console.error("Error fetching savings data:", err);
  }
}

async function getSavingsHistory() {
  const userId = localStorage.getItem("userId");
  const list = document.getElementById("savingsHistoryList");
  if (!list) return;

  try {
    const res = await fetch(`${backendURL}/api/savings/${userId}`);
    const data = await res.json();
    if (!Array.isArray(data)) return;

    const sorted = data.sort((a, b) => b.month.localeCompare(a.month));
    list.innerHTML = "";

    sorted.forEach((entry) => {
      const div = document.createElement("div");
      const label = new Date(entry.month + "-01").toLocaleString("default", {
        month: "long",
        year: "numeric",
      });

      div.className = "bg-white bg-opacity-10 p-2 rounded mb-2";
      div.innerHTML = `
        <strong>${label}</strong>: Goal ₹${entry.goal}, Saved ₹${entry.saved}
        <button onclick="deleteSaving('${entry._id}')">Delete</button>
      `;

      list.appendChild(div);
    });
  } catch (err) {
    console.error("Error fetching savings history:", err);
  }
}

async function deleteSaving(id) {
  if (!confirm("Are you sure you want to delete this saving?")) return;

  try {
    const res = await fetch(`${backendURL}/api/savings/${id}`, {
      method: "DELETE",
    });

    const data = await res.json();
    if (res.ok) {
      notifySuccess("Saving deleted successfully");
      getSavingsHistory();
    } else {
      notifyError(data.message || "Error deleting saving");
    }
  } catch (err) {
    console.error(err);
    notifyError("Error deleting saving");
  }
}

/* -------------------------
   EXPENSES
   ------------------------- */
async function addExpense() {
  const expense = {
    userId: localStorage.getItem("userId"),
    amount: document.getElementById("amount")?.value,
    category: document.getElementById("category")?.value,
    date: document.getElementById("date")?.value,
    description: document.getElementById("description")?.value,
  };

  if (!expense.amount || !expense.category || !expense.date) {
    notifyError("Please fill amount, category, and date");
    return;
  }

  try {
    const res = await fetch(`${backendURL}/api/expenses/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(expense),
    });

    const data = await res.json();
    if (res.ok) {
      notifySuccess("Expense added successfully");
      clearInputs(["amount", "category", "date", "description"]);
      getExpenses();
      getRemainingBudget();
      getRemainingByCategory();
    } else {
      notifyError(data.message || "Error adding expense");
    }
  } catch (err) {
    console.error(err);
    notifyError("Error adding expense");
  }
}

async function getExpenses() {
  const userId = localStorage.getItem("userId");
  const container = document.getElementById("expenseList");
  if (!container) return;

  try {
    const res = await fetch(`${backendURL}/api/expenses/${userId}`);
    const expenses = await res.json();

    const grouped = {};
    expenses.forEach((exp) => {
      const monthKey = exp.date.slice(0, 7);
      if (!grouped[monthKey]) grouped[monthKey] = [];
      grouped[monthKey].push(exp);
    });

    container.innerHTML = "";
    const sortedMonths = Object.keys(grouped).sort().reverse();

    sortedMonths.forEach((month) => {
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      const monthName = new Date(month + "-01").toLocaleString("default", {
        month: "long",
        year: "numeric",
      });
      summary.textContent = monthName;
      details.appendChild(summary);

      grouped[month].forEach((exp) => {
        const item = document.createElement("div");
        item.innerHTML = `
          ${exp.date} - ${exp.category}: ₹${exp.amount} (${exp.description || ""})
          <button onclick="editExpense('${exp._id}', '${exp.amount}', '${exp.category}', '${exp.date}', '${(exp.description || "").replace(/'/g, "\\'")}')">Edit</button>
          <button onclick="deleteExpense('${exp._id}')">Delete</button>
        `;
        details.appendChild(item);
      });

      container.appendChild(details);
    });
  } catch (err) {
    console.error(err);
    notifyError("Error fetching expenses");
  }
}

function editExpense(id, amount, category, date, description) {
  const list = document.getElementById("expenseList");
  if (!list) return;

  list.innerHTML = `
    <input type="number" id="edit-amount" value="${amount}" />
    <input type="text" id="edit-category" value="${category}" />
    <input type="date" id="edit-date" value="${date}" />
    <input type="text" id="edit-description" value="${description || ""}" />
    <button onclick="saveExpense('${id}')">Save</button>
    <button onclick="getExpenses()">Cancel</button>
  `;
}

async function saveExpense(id) {
  const expense = {
    amount: document.getElementById("edit-amount")?.value,
    category: document.getElementById("edit-category")?.value,
    date: document.getElementById("edit-date")?.value,
    description: document.getElementById("edit-description")?.value,
  };

  try {
    const res = await fetch(`${backendURL}/api/expenses/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(expense),
    });

    const data = await res.json();
    if (res.ok) {
      notifySuccess("Expense updated successfully");
      getExpenses();
      getRemainingBudget();
      getRemainingByCategory();
    } else {
      notifyError(data.message || "Error updating expense");
    }
  } catch (err) {
    console.error(err);
    notifyError("Error updating expense");
  }
}

async function deleteExpense(id) {
  if (!confirm("Are you sure you want to delete this expense?")) return;

  try {
    const res = await fetch(`${backendURL}/api/expenses/${id}`, {
      method: "DELETE",
    });

    const data = await res.json();
    if (res.ok) {
      notifySuccess("Expense deleted");
      getExpenses();
      getRemainingBudget();
      getRemainingByCategory();
    } else {
      notifyError(data.message || "Error deleting expense");
    }
  } catch (err) {
    console.error(err);
    notifyError("Error deleting expense");
  }
}

/* -------------------------
   BUDGET
   ------------------------- */
async function setBudget() {
  const category = document.getElementById("budgetCategory")?.value;
  const amount = document.getElementById("budgetAmount")?.value;
  const month = document.getElementById("budgetMonth")?.value;

  if (!category || !amount || !month) {
    notifyError("Please fill category, amount, and month");
    return;
  }

  const budget = {
    userId: localStorage.getItem("userId"),
    category,
    amount,
    month,
  };

  try {
    const res = await fetch(`${backendURL}/api/budgets/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(budget),
    });

    const data = await res.json();
    if (res.ok) {
      notifySuccess("Budget set successfully");
      clearInputs(["budgetCategory", "budgetAmount", "budgetMonth"]);
      getBudgets();
      getRemainingBudget();
      getRemainingByCategory();
    } else {
      notifyError(data.message || "Error setting budget");
    }
  } catch (err) {
    console.error(err);
    notifyError("Error setting budget");
  }
}

async function getBudgets() {
    const userId = localStorage.getItem("userId");
    const currentMonth = new Date().toISOString().slice(0, 7);

    const currentContainer = document.getElementById("currentMonthBudget");
    const pastList = document.getElementById("pastBudgetsList");
    const pastSection = document.getElementById("pastBudgetsSection");

    if (!currentContainer || !pastList) return;

    try {
        const res = await fetch(`${backendURL}/api/budgets/${userId}`);
        const budgets = await res.json();

        // clear old UI
        currentContainer.innerHTML = "";
        pastList.innerHTML = "";

        // sort by month latest first
        budgets.sort((a, b) => b.month.localeCompare(a.month));

        // separate current & past
        const currentMonthBudgets = budgets.filter(b => b.month === currentMonth);
        const pastBudgets = budgets.filter(b => b.month !== currentMonth);

        /* ----------- CURRENT MONTH BUDGETS ------------ */
        if (currentMonthBudgets.length > 0) {
            currentContainer.innerHTML = `<h3>${currentMonth}</h3>`;
            currentMonthBudgets.forEach(b => {
                const div = document.createElement("div");
                div.className = "budget-item";
                div.innerHTML = `
                    ${b.category}: ₹${b.amount}
                    <button onclick="deleteBudget('${b._id}')">Delete</button>
                `;
                currentContainer.appendChild(div);
            });
        } else {
            currentContainer.innerHTML = `<p>No budget set for this month.</p>`;
        }

        /* ----------- PAST BUDGETS DROPDOWN ------------ */
        if (pastBudgets.length > 0) {
            pastBudgets.forEach(b => {
                const div = document.createElement("div");
                div.className = "budget-item";
                div.innerHTML = `
                    <strong>${b.month}</strong> — ${b.category}: ₹${b.amount}
                    <button onclick="deleteBudget('${b._id}')">Delete</button>
                `;
                pastList.appendChild(div);
            });

            pastSection.style.display = "block";
        } else {
            pastSection.style.display = "none"; // hide dropdown if empty
        }

    } catch (err) {
        notifyError("Error fetching budgets");
        console.error(err);
    }
}


async function deleteBudget(id) {
  if (!confirm("Are you sure you want to delete this budget?")) return;

  try {
    const res = await fetch(`${backendURL}/api/budgets/${id}`, {
      method: "DELETE",
    });

    const data = await res.json();
    if (res.ok) {
      notifySuccess("Budget deleted");
      getBudgets();
      getRemainingBudget();
      getRemainingByCategory();
    } else {
      notifyError(data.message || "Error deleting budget");
    }
  } catch (err) {
    console.error(err);
    notifyError("Error deleting budget");
  }
}

/* -------------------------
   REMAINING / UI helpers
   ------------------------- */
async function getRemainingBudget() {
  const userId = localStorage.getItem("userId");
  const currentMonth = new Date().toISOString().slice(0, 7);
  const display = document.getElementById("remainingBudget");
  if (!display) return;

  try {
    const res = await fetch(`${backendURL}/api/budgets/${userId}`);
    const budgets = await res.json();

    const thisMonthBudgets = budgets.filter(b => b.month === currentMonth);

    const remaining = thisMonthBudgets.reduce(
      (sum, b) => sum + Number(b.remainingAmount || 0),
      0
    );

    display.textContent = `₹${remaining.toFixed(2)}`;
  } catch (err) {
    console.error("Error fetching remaining budget:", err);
  }
}


async function getRemainingByCategory() {
  const userId = localStorage.getItem("userId");
  const currentMonth = new Date().toISOString().slice(0, 7);
  const display = document.getElementById("remainingByCategory");
  if (!display) return;

  try {
    const res = await fetch(`${backendURL}/api/budgets/${userId}`);
    const budgets = await res.json();

    const monthlyBudgets = budgets.filter(b => b.month === currentMonth);
    display.innerHTML = "";

    monthlyBudgets.forEach(budget => {
      const remaining = Number(budget.remainingAmount || 0);
      const total = Number(budget.amount || 0);
      const used = total - remaining;

      const usedPercent = total > 0 ? (used / total) * 100 : 0;

      let alertMsg = "";
      if (usedPercent >= 80) alertMsg = "<span style='color:red'>🔴 Over 80% used!</span>";
      else if (usedPercent >= 60) alertMsg = "<span style='color:orange'>🟠 60%+ used</span>";

      const div = document.createElement("div");
      div.innerHTML = `
        <strong>${budget.category}</strong>:
        ₹${remaining.toFixed(2)} left ${alertMsg}
      `;
      display.appendChild(div);
    });

  } catch (err) {
    console.error("Error in category budget tracker:", err);
  }
}


/* -------------------------
   SUMMARY CARD
   ------------------------- */
async function loadSummaryCard() {
  const userId = localStorage.getItem("userId");
  const currentMonth = new Date().toISOString().slice(0, 7);

  if (!userId) return;

  try {
    // fetch expenses
    const expensesRes = await fetch(`${backendURL}/api/expenses/${userId}`);
    const expenses = await expensesRes.json();

    const totalSpent = expenses
      .filter((e) => e.date.startsWith(currentMonth))
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const spentEl = document.getElementById("spentThisMonth");
    if (spentEl) spentEl.textContent = "₹" + totalSpent;

    // fetch savings
    const savingsRes = await fetch(
      `${backendURL}/api/savings/${userId}?month=${currentMonth}`
    );
    const savingsData = await savingsRes.json();

    const totalSaved = savingsData?.saved || 0;

    const savedEl = document.getElementById("savedThisMonth");
    if (savedEl) savedEl.textContent = "₹" + totalSaved;
  } catch (err) {
    console.error("Summary Load Error:", err);
  }
}

/* -------------------------
   AI Integration
   ------------------------- */
async function loadPrediction() {
  const userId = localStorage.getItem("userId");
  if (!userId) return;

  try {
    const res = await fetch(`${backendURL}/api/ai/predict/${userId}`);
    const data = await res.json();

    const el = document.getElementById("expensePrediction");
    if (!el) return;

    el.innerHTML = `
      <strong>Prediction:</strong> ₹${data.prediction.toFixed(2)} 
      (${data.trend}, conf ${Math.round(data.confidence * 100)}%)<br/>
      <strong>Persona:</strong> ${data.persona}<br/>
      <strong>Top Categories:</strong> ${data.top_categories
        .map((c) => `${c.category}: ₹${c.amount}`)
        .join(", ")}<br/>
      💡 ${data.ai_text}
    `;
  } catch (err) {
    console.error("Prediction error:", err);
    const el = document.getElementById("expensePrediction");
    if (el) el.innerText = "⚠️ Could not load prediction";
  }
}

async function loadRecommendations() {
  const userId = localStorage.getItem("userId");
  if (!userId) return;

  try {
    const r = await fetch(`${backendURL}/api/ai/recommend/${userId}`);
    const rd = await r.json();

    const el = document.getElementById("recommendations");
    if (!el) return;

    el.innerHTML = `
      <strong>Status:</strong> ${rd.status} 
      (Ratio: ${(rd.ratio * 100).toFixed(1)}%)<br/>
      <strong>Persona:</strong> ${rd.persona}<br/>
      <ul>${rd.tips.map((t) => `<li>${t}</li>`).join("")}</ul>
    `;
  } catch (err) {
    console.error("Recommendations error:", err);
    const el = document.getElementById("recommendations");
    if (el) el.innerText = "⚠️ Could not load recommendations";
  }
}

async function loadAutoBudget() {
  const userId = localStorage.getItem("userId");
  if (!userId) return;

  try {
    const a = await fetch(`${backendURL}/api/ai/autobudget/${userId}`);
    const ad = await a.json();

    const el = document.getElementById("autoBudget");
    if (!el) return;

    el.innerHTML = `
      <strong>Persona:</strong> ${ad.persona}<br/>
      <div><strong>Category-wise Plan:</strong></div>
      ${Object.entries(ad.per_category)
        .map(([cat, amt]) => `<div>${cat}: ₹${amt}</div>`)
        .join("")}
      <p>💡 ${ad.ai_text}</p>
    `;
  } catch (err) {
    console.error("AutoBudget error:", err);
    const el = document.getElementById("autoBudget");
    if (el) el.innerText = "⚠️ Could not load auto-budget";
  }
}

async function loadSavingsChallenge() {
  const userId = localStorage.getItem("userId");
  if (!userId) return;

  try {
    const c = await fetch(`${backendURL}/api/ai/challenges/${userId}`);
    const cd = await c.json();

    const el = document.getElementById("savingsChallenge");
    if (!el) return;

    el.innerHTML = `
      <strong>Challenge:</strong> ${cd.challenge}<br/>
      <strong>Target:</strong> ₹${cd.next_goal}<br/>
      <strong>Type:</strong> ${cd.type}<br/>
      💬 ${cd.motivation}<br/>
      <div><strong>Micro-challenges:</strong></div>
      <ul>${cd.micro_challenges.map((m) => `<li>${m}</li>`).join("")}</ul>
    `;
  } catch (err) {
    console.error("Challenges error:", err);
    const el = document.getElementById("savingsChallenge");
    if (el) el.innerText = "⚠️ Could not load savings challenge";
  }
}
