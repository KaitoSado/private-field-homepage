import Link from "next/link";
import { HomeAuthEntry } from "@/components/home-auth-entry";

export const revalidate = 0;

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-copy">
          <h1>自分の公開ページを、そのまま育てる。</h1>
          <HomeAuthEntry />
          <div className="hero-actions">
            <Link href="/explore" className="button button-secondary">
              発見を見る
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
