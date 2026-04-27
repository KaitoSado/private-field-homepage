import { MeRedirectPanel } from "@/components/me-redirect-panel";

export const metadata = {
  title: "拠点 | Commune"
};

export default function MePage() {
  return (
    <main className="shell me-hub-shell">
      <MeRedirectPanel />
    </main>
  );
}
