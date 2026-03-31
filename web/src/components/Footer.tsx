import { Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <p>
          built with <Heart size={14} style={{ display: "inline", verticalAlign: "middle", color: "var(--accent-primary)" }} /> from your saved collections
        </p>
        <p style={{ marginTop: "var(--space-2)", fontSize: "var(--text-xs)" }}>
          personal use only · not affiliated with Instagram
        </p>
      </div>
    </footer>
  );
}
