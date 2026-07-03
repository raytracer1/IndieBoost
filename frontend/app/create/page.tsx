import CampaignForm from "@/components/CampaignForm";

export default function CreateCampaignPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create Campaign</h1>
        <p className="text-sm text-gray-500 mt-1">
          Set up your growth campaign and let AI agents do the rest.
        </p>
      </div>
      <CampaignForm />
    </div>
  );
}
