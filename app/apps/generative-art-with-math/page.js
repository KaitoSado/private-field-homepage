import { GenerativeArtWithMathGallery } from "@/components/generative-art-with-math-gallery";

export const metadata = {
  title: "GenerativeArtWithMath | Apps | Commune",
  description: "Processing output と live preview で数学から生成する作品を並べる GenerativeArtWithMath gallery。初期作品は Spiral Polygon。"
};

export default function GenerativeArtWithMathPage() {
  return (
    <main className="shell generative-art-shell">
      <GenerativeArtWithMathGallery />
    </main>
  );
}
