'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function SubmitCompanyForm() {
  const [formData, setFormData] = useState({
    name: '',
    country: '',
    website: '',
    description: '',
    why: '',
  });

  const [status, setStatus] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('');

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setStatus('You must be logged in to submit a company.');
      return;
    }

    const { data: request, error: requestError } = await supabase
      .from('company_requests')
      .insert([{ ...formData, user_id: user.id }])
      .select()
      .single();

    if (requestError) {
      setStatus(`Error creating request: ${requestError.message}`);
      return;
    }

    const { error: evidenceError } = await supabase.from('evidence').insert([
      {
        title: formData.name,
        summary: formData.why || formData.description,
        entity_type: 'company',
        entity_id: null,
        company_request_id: request.id,
        user_id: user.id,
        status: 'pending',
      },
    ]);

    if (evidenceError) {
      setStatus(`Error creating evidence: ${evidenceError.message}`);
      return;
    }

    setStatus('Company submitted for moderation.');
    setFormData({
      name: '',
      country: '',
      website: '',
      description: '',
      why: '',
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-bold">Submit a New Company</h2>

      <input
        type="text"
        placeholder="Company Name"
        required
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        className="w-full border p-2 rounded"
      />

      <input
        type="text"
        placeholder="Country"
        required
        value={formData.country}
        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
        className="w-full border p-2 rounded"
      />

      <input
        type="url"
        placeholder="Website (optional)"
        value={formData.website}
        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
        className="w-full border p-2 rounded"
      />

      <textarea
        placeholder="Description (optional)"
        value={formData.description}
        onChange={(e) =>
          setFormData({ ...formData, description: e.target.value })
        }
        className="w-full border p-2 rounded"
      />

      <textarea
        placeholder="Why are you submitting this company? (optional)"
        value={formData.why}
        onChange={(e) => setFormData({ ...formData, why: e.target.value })}
        className="w-full border p-2 rounded"
      />

      <button type="submit" className="bg-black text-white px-4 py-2 rounded">
        Submit Company
      </button>

      {status && <p className="text-sm mt-2">{status}</p>}
    </form>
  );
}
