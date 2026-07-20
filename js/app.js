/*
  APP
  Wires the screens together, keeps the current account in memory,
  saves to GitHub after every change, and applies theme/language.
*/

let currentUser = null;
let currentAccount = null;
let currentSha = null;
let authMode = "signin"; // or "signup"

const el = id => document.getElementById(id);

/* ---------- boot ---------- */
window.addEventListener("DOMContentLoaded", () => {
  applyTheme(localStorage.getItem("theme") || "light");
  applyLang(localStorage.getItem("lang") || "en");

  el("themeToggle").addEventListener("click", toggleTheme);
  el("langToggle").addEventListener("click", toggleLang);
  el("logoutBtn").addEventListener("click", logout);

  el("saveTokenBtn").addEventListener("click", saveTokenAndContinue);
  el("authSwitch").addEventListener("click", switchAuthMode);
  el("authSubmit").addEventListener("click", submitAuth);

  el("btnSetBalance").addEventListener("click", () => modifyBalance("set"));
  el("btnAddBalance").addEventListener("click", () => modifyBalance("add"));
  el("btnSubBalance").addEventListener("click", () => modifyBalance("sub"));
  el("btnAddPending").addEventListener("click", addPendingEntry);

  if (GitHubStore.hasToken()) {
    tryRestoreSession();
  } else {
    showScreen("setup");
  }
});

/* ---------- session persistence ---------- */
async function tryRestoreSession() {
  const savedUser = localStorage.getItem("currentUser");
  if (!savedUser) {
    showScreen("auth");
    return;
  }

  setStatus("...");
  try {
    const stored = await GitHubStore.readUser(savedUser);
    currentUser = savedUser;
    currentAccount = stored.data;
    currentSha = stored.sha;

    applyTheme(currentAccount.settings.theme);
    applyLang(currentAccount.settings.lang);
    renderAll();
    showScreen("app");
    setStatus("");
  } catch (e) {
    // Saved session no longer valid (e.g. token revoked, account gone) — fall back to auth
    localStorage.removeItem("currentUser");
    showScreen("auth");
    el("authError").textContent = e.message;
    setStatus("");
  }
}

/* ---------- screens ---------- */
function showScreen(name) {
  el("setupScreen").style.display = name === "setup" ? "flex" : "none";
  el("authScreen").style.display = name === "auth" ? "flex" : "none";
  el("appScreen").style.display = name === "app" ? "block" : "none";
  el("logoutBtn").style.display = name === "app" ? "flex" : "none";
}

function saveTokenAndContinue() {
  const token = el("tokenInput").value.trim();
  if (!token) {
    el("setupError").textContent = t("errorRequired");
    return;
  }
  GitHubStore.setToken(token);
  showScreen("auth");
}

/* ---------- auth ---------- */
function switchAuthMode() {
  authMode = authMode === "signin" ? "signup" : "signin";
  const title = authMode === "signin" ? "signIn" : "signUp";
  const switchLabel = authMode === "signin" ? "needAccount" : "haveAccount";
  el("authTitle").setAttribute("data-i18n", title);
  el("authTitle").textContent = t(title);
  el("authSubmit").setAttribute("data-i18n", title);
  el("authSubmit").textContent = t(title);
  el("authSwitch").setAttribute("data-i18n", switchLabel);
  el("authSwitch").textContent = t(switchLabel);
  el("authError").textContent = "";
}

async function submitAuth() {
  const username = el("authUsername").value.trim();
  const password = el("authPassword").value;
  el("authError").textContent = "";

  if (!username || !password) {
    el("authError").textContent = t("errorRequired");
    return;
  }

  setStatus("...");
  try {
    let account;
    if (authMode === "signup") {
      account = await Auth.signUp(username, password);
    } else {
      account = await Auth.signIn(username, password);
    }
    currentUser = username;
    currentAccount = account;
    const stored = await GitHubStore.readUser(username);
    currentSha = stored.sha;
    localStorage.setItem("currentUser", username);

    applyTheme(account.settings.theme);
    applyLang(account.settings.lang);
    renderAll();
    showScreen("app");
    setStatus("");
  } catch (e) {
    el("authError").textContent = e.message;
    setStatus("");
  }
}

function logout() {
  currentUser = null;
  currentAccount = null;
  currentSha = null;
  localStorage.removeItem("currentUser");
  el("authUsername").value = "";
  el("authPassword").value = "";
  showScreen("auth");
}

/* ---------- saving ---------- */
async function persist() {
  setStatus("saving...");
  try {
    currentSha = await GitHubStore.writeUser(currentUser, currentAccount, currentSha);
    setStatus("saved");
    setTimeout(() => setStatus(""), 1200);
  } catch (e) {
    setStatus(e.message);
  }
}

function setStatus(msg) {
  el("globalStatus").textContent = msg;
}

/* ---------- balance actions ---------- */
function modifyBalance(mode) {
  const raw = el("balanceAmount").value;
  if (raw === "") return;
  const amount = Number(raw);
  if (mode === "set") Wallet.setBalance(currentAccount, amount);
  if (mode === "add") Wallet.adjustBalance(currentAccount, amount);
  if (mode === "sub") Wallet.adjustBalance(currentAccount, -amount);
  el("balanceAmount").value = "";
  renderAll();
  persist();
}

/* ---------- pending actions ---------- */
function addPendingEntry() {
  const name = el("pendingName").value.trim();
  const amount = el("pendingAmount").value;
  const note = el("pendingNote").value.trim();
  if (!name || amount === "") return;
  Wallet.addPending(currentAccount, name, Number(amount), note);
  el("pendingName").value = "";
  el("pendingAmount").value = "";
  el("pendingNote").value = "";
  renderAll();
  persist();
}

function handlePendingReturn(id) {
  Wallet.markReturned(currentAccount, id);
  renderAll();
  persist();
}

function handlePendingDelete(id) {
  Wallet.removePending(currentAccount, id);
  renderAll();
  persist();
}

/* ---------- rendering ---------- */
function renderAll() {
  el("balanceValue").textContent = fmt(currentAccount.balance);
  el("pendingValue").textContent = fmt(Wallet.pendingTotal(currentAccount));
  el("projectedValue").textContent = fmt(Wallet.projectedBalance(currentAccount));
  renderPending();
  renderHistory();
}

function fmt(n) {
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function renderPending() {
  const list = el("pendingList");
  list.innerHTML = "";
  const items = [...currentAccount.pending].sort((a, b) => a.returned - b.returned);
  el("pendingEmpty").style.display = items.length ? "none" : "block";

  const tpl = el("pendingItemTemplate");
  items.forEach(entry => {
    const node = tpl.content.cloneNode(true);
    const li = node.querySelector(".pending-item");
    if (entry.returned) li.classList.add("is-returned");
    node.querySelector(".pending-name").textContent = entry.name;
    node.querySelector(".pending-amount").textContent = fmt(entry.amount);
    node.querySelector(".pending-note").textContent = entry.note || "";
    const returnBtn = node.querySelector(".returnBtn");
    const deleteBtn = node.querySelector(".deleteBtn");
    returnBtn.textContent = t("markReturned");
    deleteBtn.textContent = t("delete");
    if (entry.returned) {
      returnBtn.disabled = true;
      returnBtn.style.opacity = "0.4";
    } else {
      returnBtn.addEventListener("click", () => handlePendingReturn(entry.id));
    }
    deleteBtn.addEventListener("click", () => handlePendingDelete(entry.id));
    list.appendChild(node);
  });
}

function renderHistory() {
  const list = el("historyList");
  list.innerHTML = "";
  const items = currentAccount.history || [];
  el("historyEmpty").style.display = items.length ? "none" : "block";
  items.slice(0, 20).forEach(h => {
    const li = document.createElement("li");
    const when = new Date(h.date).toLocaleString();
    li.innerHTML = `<span>${h.message}</span> · ${when}`;
    list.appendChild(li);
  });
}

/* ---------- theme ---------- */
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  el("themeIconSun").style.display = theme === "light" ? "block" : "none";
  el("themeIconMoon").style.display = theme === "dark" ? "block" : "none";
  if (currentAccount) currentAccount.settings.theme = theme;
}

function toggleTheme() {
  const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
  applyTheme(next);
  if (currentAccount) persist();
}

/* ---------- language ---------- */
function applyLang(lang) {
  document.documentElement.setAttribute("data-lang", lang);
  document.documentElement.setAttribute("lang", lang);
  document.documentElement.setAttribute("dir", I18N[lang].dir);
  localStorage.setItem("lang", lang);
  if (currentAccount) currentAccount.settings.lang = lang;
  translatePage();
}

function toggleLang() {
  const next = document.documentElement.getAttribute("data-lang") === "en" ? "ar" : "en";
  applyLang(next);
  if (currentAccount) persist();
  if (currentAccount) renderAll();
}

function translatePage() {
  document.querySelectorAll("[data-i18n]").forEach(node => {
    node.textContent = t(node.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(node => {
    node.setAttribute("placeholder", t(node.getAttribute("data-i18n-placeholder")));
  });
}
