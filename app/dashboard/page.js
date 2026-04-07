import { redirect } from "next/navigation";

export const metadata = {
  title: "My Page | New Commune"
};

export default function DashboardPage() {
  redirect("/me");
}
