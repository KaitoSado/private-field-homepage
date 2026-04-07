import { MeRedirectPanel } from "@/components/me-redirect-panel";

export const metadata = {
  title: "拠点 | New Commune"
};

export default function MePage() {
  return (
    <main className="shell">
      <MeRedirectPanel />
    </main>
  );
}
