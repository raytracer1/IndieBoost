// Agent API client — communicates with backend instead of direct DB access
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8787';

async function fetchJSON(path, options = {}) {
  const url = `${BACKEND_URL}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// GET /api/executions/pending — Get pending executions
function getPendingExecutions() {
  return fetchJSON('/api/executions/pending');
}

// POST /api/executions/:id/complete — Submit agent results
function completeExecution(id, results) {
  return fetchJSON(`/api/executions/${id}/complete`, {
    method: 'POST',
    body: JSON.stringify(results),
  });
}

module.exports = { getPendingExecutions, completeExecution };
