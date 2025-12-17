// app/submit-company/page.tsx

import SubmitCompanyForm from '@/components/SubmitCompanyForm';

export default function SubmitCompanyPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <SubmitCompanyForm />
    </div>
  );
}






export default async function SubmitCompanyPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold">You must be logged in to submit a company.</h2>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <SubmitCompanyForm user={user} />
    </div>
  );
}
