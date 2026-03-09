import { apiFetch } from "./apiFetch";

export function listSessions(params = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === "") continue;
    qs.set(k, String(v));
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch(`/api/sessions${suffix}`);
}

export function getSession(id) {
  return apiFetch(`/api/sessions/${id}`);
}

export function createSession(payload) {
  return apiFetch("/api/sessions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateSession(id, payload) {
  return apiFetch(`/api/sessions/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteSession(id) {
  return apiFetch(`/api/sessions/${id}`, { method: "DELETE" });
}