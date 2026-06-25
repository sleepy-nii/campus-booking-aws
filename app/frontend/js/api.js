/* ============================================================
   API Client — wraps all fetch calls to the Express backend.
   All responses are JSON. A 401 from any endpoint redirects
   the user to the login page automatically.
   ============================================================ */

const API = (() => {
  async function request(method, path, body) {
    const opts = { method, credentials: 'same-origin', headers: {} };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const res = await fetch('/api' + path, opts);
    if (res.status === 401) {
      Session.clear();
      window.location.href = 'index.html';
      return;
    }
    const data = await res.json();
    if (!res.ok) throw data;
    return data;
  }

  return {
    get:    (path)        => request('GET',    path),
    post:   (path, body)  => request('POST',   path, body),
    put:    (path, body)  => request('PUT',    path, body),
    patch:  (path, body)  => request('PATCH',  path, body),
    delete: (path)        => request('DELETE', path),
  };
})();
