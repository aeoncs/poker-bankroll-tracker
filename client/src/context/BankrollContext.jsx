import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";

const BankrollContext = createContext(null);

const STORAGE_KEY = "activeBankrollId";

export function BankrollProvider({ children }) {
  const { user } = useAuth();
  const bankrolls = user?.bankrolls || [];

  const [activeBankrollId, setActiveBankrollId] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || "";
  });

  // Ensure activeBankrollId is valid whenever user/bankrolls change
  useEffect(() => {
    if (!user) {
      setActiveBankrollId("");
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    if (!bankrolls.length) {
      setActiveBankrollId("");
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    const exists = bankrolls.some((b) => b._id === activeBankrollId);
    if (!exists) {
      const nextId = bankrolls[0]._id;
      setActiveBankrollId(nextId);
      localStorage.setItem(STORAGE_KEY, nextId);
    }
  }, [user, bankrolls, activeBankrollId]);

  function setActive(id) {
    setActiveBankrollId(id);
    localStorage.setItem(STORAGE_KEY, id);
  }

  const activeBankroll = useMemo(() => {
    return bankrolls.find((b) => b._id === activeBankrollId) || null;
  }, [bankrolls, activeBankrollId]);

  const value = useMemo(
    () => ({
      bankrolls,
      activeBankrollId,
      activeBankroll,
      setActiveBankrollId: setActive,
    }),
    [bankrolls, activeBankrollId, activeBankroll]
  );

  return <BankrollContext.Provider value={value}>{children}</BankrollContext.Provider>;
}

export function useBankroll() {
  return useContext(BankrollContext);
}