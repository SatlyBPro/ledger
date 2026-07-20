/*
  AUTH
  Simple username/password check. Passwords are hashed with SHA-256
  before they ever leave the browser or get saved to the repo.
  This is fine for a private family tool, it is not bank-grade security.
*/

const Auth = (() => {
  async function hash(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  }

  function blankAccount(passwordHash) {
    return {
      passwordHash,
      balance: 0,
      pending: [],
      settings: { theme: "light", lang: "en" },
      history: []
    };
  }

  async function signUp(username, password) {
    const { data } = await GitHubStore.readUser(username);
    if (data) throw new Error("That username already exists.");
    const passwordHash = await hash(password);
    const account = blankAccount(passwordHash);
    await GitHubStore.writeUser(username, account, null);
    return account;
  }

  async function signIn(username, password) {
    const { data } = await GitHubStore.readUser(username);
    if (!data) throw new Error("No account found with that username.");
    const passwordHash = await hash(password);
    if (passwordHash !== data.passwordHash) throw new Error("Wrong password.");
    return data;
  }

  return { signUp, signIn };
})();
