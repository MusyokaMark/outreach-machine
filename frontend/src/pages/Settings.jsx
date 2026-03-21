import { useState } from "react";

const defaultProfile = {
  yourName: "",
  yourEmail: "",
  service: "",
  skills: "",
  experience: "",
  results: "",
};

function loadProfile() {
  try {
    const stored = localStorage.getItem("profile");
    return stored ? JSON.parse(stored) : defaultProfile;
  } catch {
    return defaultProfile;
  }
}

export default function Settings() {
  const [profile, setProfile] = useState(loadProfile);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    localStorage.setItem("profile", JSON.stringify(profile));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const fields = [
    { key: "yourName", label: "Your Name", placeholder: "e.g. John Doe" },
    {
      key: "yourEmail",
      label: "Your Email",
      placeholder: "e.g. john@gmail.com",
    },
    {
      key: "service",
      label: "Your Service",
      placeholder: "e.g. Social media management",
    },
    {
      key: "skills",
      label: "Your Skills",
      placeholder: "e.g. Instagram, TikTok, Facebook Ads",
    },
    {
      key: "experience",
      label: "Your Experience",
      placeholder: "e.g. 3 years managing SME accounts",
    },
    {
      key: "results",
      label: "Your Best Result",
      placeholder: "e.g. Grew a page from 200 to 15k followers",
    },
  ];

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Settings</h1>
      <p className="text-gray-500 mb-6">
        Your profile is used by AI to write personalized outreach
      </p>

      <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-4">
        {fields.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {label}
            </label>
            <input
              value={profile[key]}
              onChange={(e) =>
                setProfile((p) => ({ ...p, [key]: e.target.value }))
              }
              placeholder={placeholder}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
        ))}

        <button
          onClick={handleSave}
          className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
            saved
              ? "bg-green-500 text-white"
              : "bg-indigo-600 text-white hover:bg-indigo-700"
          }`}
        >
          {saved ? "Saved!" : "Save Profile"}
        </button>
      </div>
    </div>
  );
}
