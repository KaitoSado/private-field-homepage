import { MeRedirectPanel } from "@/components/me-redirect-panel";

export const metadata = {
  title: "My Page | FieldCard Social"
};

export default function MePage() {
  return (
    <main className="shell">
      <MeRedirectPanel />
    </main>
  );
}
