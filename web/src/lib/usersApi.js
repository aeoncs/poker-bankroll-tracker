import { apiFetch } from "./apiFetch";

// Settings (preferences + defaults + defaultBankrollId)
export function getSettings() {
  return apiFetch("/api/users/settings");
}

export function updateSettings(payload) {
  return apiFetch("/api/users/settings", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// Bankrolls
export function listBankrolls() {
  return apiFetch("/api/users/bankrolls");
}

export function createBankroll({ name, currency, startingBankroll }) {
  return apiFetch("/api/users/bankrolls", {
    method: "POST",
    body: JSON.stringify({
      name,
      currency,
      startingBankroll: Number(startingBankroll),
    }),
  });
}

export function updateBankroll(bankrollId, { name, currency, startingBankroll }) {
  return apiFetch(`/api/users/bankrolls/${bankrollId}`, {
    method: "PUT",
    body: JSON.stringify({
      name,
      currency,
      startingBankroll: Number(startingBankroll),
    }),
  });
}

export function deleteBankroll(bankrollId) {
  return apiFetch(`/api/users/bankrolls/${bankrollId}`, {
    method: "DELETE",
  });
}

// Setup (onboarding)
export function completeSetup(payload) {
  return apiFetch("/api/users/setup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}