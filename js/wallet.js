/*
  WALLET
  Pure data functions for the balance and the "owed back to me" list.
  Nothing here touches the DOM or the network.
*/

const Wallet = (() => {
  function setBalance(account, newAmount) {
    account.balance = Number(newAmount);
    logHistory(account, `Balance set to ${account.balance}`);
  }

  function adjustBalance(account, delta) {
    account.balance = Number(account.balance) + Number(delta);
    const sign = delta >= 0 ? "+" : "";
    logHistory(account, `Balance changed by ${sign}${delta}`);
  }

  function addPending(account, name, amount, note) {
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name,
      amount: Number(amount),
      note: note || "",
      date: new Date().toISOString(),
      returned: false
    };
    account.pending.push(entry);
    logHistory(account, `${name} owes ${amount} back`);
    return entry;
  }

  function editPending(account, id, changes) {
    const entry = account.pending.find(p => p.id === id);
    if (!entry) return;
    Object.assign(entry, changes);
  }

  function markReturned(account, id) {
    const entry = account.pending.find(p => p.id === id);
    if (!entry || entry.returned) return;
    entry.returned = true;
    entry.returnedDate = new Date().toISOString();
    account.balance = Number(account.balance) + Number(entry.amount);
    logHistory(account, `${entry.name} returned ${entry.amount}`);
  }

  function removePending(account, id) {
    account.pending = account.pending.filter(p => p.id !== id);
  }

  function pendingTotal(account) {
    return account.pending
      .filter(p => !p.returned)
      .reduce((sum, p) => sum + Number(p.amount), 0);
  }

  function projectedBalance(account) {
    return Number(account.balance) + pendingTotal(account);
  }

  function logHistory(account, message) {
    if (!account.history) account.history = [];
    account.history.unshift({ message, date: new Date().toISOString() });
    account.history = account.history.slice(0, 100);
  }

  return {
    setBalance,
    adjustBalance,
    addPending,
    editPending,
    markReturned,
    removePending,
    pendingTotal,
    projectedBalance
  };
})();
