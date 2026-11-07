import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import Layout from "@/components/Layout";
import IdeaForm from "@/components/IdeaForm";

export default async function NewIdeaPage() {
  if (!(await isAuthenticated())) redirect("/login");

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">New reel</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Title, script, five to eight scenes, and when it should run.
          </p>
        </div>
        <IdeaForm />
      </div>
    </Layout>
  );
}
