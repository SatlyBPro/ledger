/*
  GITHUB STORE
  Reads and writes JSON files inside the repo using the GitHub REST API.
  Each user gets one file: data/users/<username>.json
*/

const GitHubStore = (() => {
  function getToken() {
    return localStorage.getItem("gh_token") || "";
  }

  function setToken(token) {
    localStorage.setItem("gh_token", token);
  }

  function hasToken() {
    return !!getToken();
  }

  function apiUrl(username) {
    return `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${CONFIG.dataPath}/${username}.json`;
  }

  function toBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  function fromBase64(str) {
    return decodeURIComponent(escape(atob(str)));
  }

  async function readUser(username) {
    const res = await fetch(apiUrl(username), {
      headers: {
        Authorization: `token ${getToken()}`,
        Accept: "application/vnd.github+json"
      }
    });
    if (res.status === 404) return { data: null, sha: null };
    if (!res.ok) throw new Error("Could not reach GitHub (" + res.status + ")");
    const json = await res.json();
    const content = fromBase64(json.content.replace(/\n/g, ""));
    return { data: JSON.parse(content), sha: json.sha };
  }

  async function writeUser(username, data, sha) {
    const body = {
      message: sha ? `Update data for ${username}` : `Create data for ${username}`,
      content: toBase64(JSON.stringify(data, null, 2)),
      branch: CONFIG.branch
    };
    if (sha) body.sha = sha;

    const res = await fetch(apiUrl(username), {
      method: "PUT",
      headers: {
        Authorization: `token ${getToken()}`,
        Accept: "application/vnd.github+json"
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "GitHub save failed (" + res.status + ")");
    }
    const json = await res.json();
    return json.content.sha;
  }

  return { getToken, setToken, hasToken, readUser, writeUser };
})();
