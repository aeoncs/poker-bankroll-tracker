import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getSession, updateSession } from "../api/sessions";
import { useAuth } from "../context/AuthContext";
import EntryForm from "../components/EntryForm";

export default function EditEntryPage() {
  const nav = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const bankrolls = useMemo(() => user?.bankrolls || [], [user]);

  const [entry, setEntry] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setError("");
      try {
        const data = await getSession(id);
        setEntry(data.entry);
      } catch (e) {
        setError(e.message);
      }
    })();
  }, [id]);

  return (
    <div style={{ padding: 24, maxWidth: 520, fontFamily: "system-ui, sans-serif" }}>
      <h1>Edit Entry</h1>

      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {!entry ? (
        <p>Loading...</p>
      ) : (
        <EntryForm
          mode="edit"
          bankrolls={bankrolls}
          initialValues={entry}
          onSubmit={async (payload) => {
            await updateSession(id, payload);
            nav("/entries");
          }}
          onCancel={() => nav("/entries")}
        />
      )}
    </div>
  );
}