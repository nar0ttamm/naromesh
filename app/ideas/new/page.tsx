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
          <h1 className="text-2xl font-bold text-gray-900">New Video Idea</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Fill in the details and scene breakdown for your AI reel.
          </p>
        </div>
        <IdeaForm />
      </div>
    </Layout>
  );
}
