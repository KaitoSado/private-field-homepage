import { GameArcade } from "@/components/game-arcade";

export const metadata = {
  title: "Games | Apps | Commune",
  description: "はね玉アリーナ、賽の河原を含む、Apps の中でそのまま遊べるミニゲーム集。"
};

export default function GamesPage() {
  return (
    <main className="shell">
      <GameArcade />
    </main>
  );
}
