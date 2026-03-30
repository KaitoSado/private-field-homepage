import { redirect } from "next/navigation";

export const metadata = {
  title: "My Page | FieldCard Social"
};

export default function DashboardPage() {
  redirect("/me");
}
