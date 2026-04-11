import { redirect } from "next/navigation";

export const metadata = {
  title: "My Page | Commune"
};

export default function DashboardPage() {
  redirect("/me");
}
