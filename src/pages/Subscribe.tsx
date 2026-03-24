import { useState } from "react";

export default function Subscribe({ onBack }: { onBack?: () => void }) {
  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h1 style={{ color: "#1e3a8a" }}>Nos formules</h1>
      <p>Starter 49,99€ | Business 89,99€ | Enterprise 149,99€</p>
      {onBack && <button onClick={onBack}>Retour</button>}
    </div>
  );
}
