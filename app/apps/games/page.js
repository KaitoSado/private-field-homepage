import { GameArcade } from "@/components/game-arcade";

export const metadata = {
  title: "Games | Apps | New Commune",
  description: "Apps の中でそのまま遊べるミニゲーム集。"
};

export default function GamesPage() {
  return (
    <main className="shell">
      <GameArcade />
    </main>
  );
}
