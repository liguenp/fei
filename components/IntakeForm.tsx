"use client";

import { useState } from "react";

interface IntakeData {
  destination: string;
  dates: string;
  duration: string;
  interests: string[];
  otherInterests: string;
  pace: string;
  budget: string;
  constraints: string;
}

interface IntakeFormProps {
  onSubmit: (summary: string) => void;
}

const INTEREST_OPTIONS = [
  "History & culture",
  "Food & dining",
  "Nature & scenery",
  "Shopping",
  "Photography",
  "Kids' activities",
  "Local experiences",
  "Nightlife",
  "Art & museums",
  "Temples & spiritual",
];

export default function IntakeForm({ onSubmit }: IntakeFormProps) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<IntakeData>({
    destination: "",
    dates: "",
    duration: "",
    interests: [],
    otherInterests: "",
    pace: "Relaxed",
    budget: "Mid-range",
    constraints: "",
  });

  const toggleInterest = (interest: string) => {
    setData((d) => ({
      ...d,
      interests: d.interests.includes(interest)
        ? d.interests.filter((i) => i !== interest)
        : [...d.interests, interest],
    }));
  };

  const handleSubmit = () => {
    const allInterests = data.interests.length > 0 ? data.interests.join(", ") : "Open to suggestions";
    const interestsLine = data.otherInterests.trim()
      ? `${allInterests}, ${data.otherInterests.trim()}`
      : allInterests;

    const summary = `Here's my trip info:
- Destination: ${data.destination || "Not specified"}
- Dates: ${data.dates || "Flexible"}
- Duration: ${data.duration || "Not specified"} days
- Interests: ${interestsLine}
- Pace: ${data.pace}
- Budget: ${data.budget}${data.constraints.trim() ? `\n- Constraints & concerns: ${data.constraints.trim()}` : ""}

Please suggest places for my trip.`;

    window.gtag?.('event', 'form_submitted', { destination: data.destination, duration: data.duration });
    onSubmit(summary);
  };

  const canProceed = () => {
    if (step === 0) return data.destination.trim().length > 0;
    return true;
  };

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-fei-500 text-lg font-bold text-white">
            飞
          </div>
          <h1 className="text-lg font-semibold text-stone-900">
            Plan your China trip
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Tell me about your trip and I'll find the best places for your group
          </p>
        </div>

        {/* Progress dots */}
        <div className="mb-6 flex justify-center gap-2">
          {[0, 1, 2].map((s) => (
            <div
              key={s}
              className={`h-1.5 w-8 rounded-full transition-colors ${
                s <= step ? "bg-fei-500" : "bg-stone-200"
              }`}
            />
          ))}
        </div>

        {/* Step 0: Where & When */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-600">
                Where in China?
              </label>
              <input
                type="text"
                placeholder="e.g. Beijing, Shanghai, Yunnan..."
                value={data.destination}
                onChange={(e) =>
                  setData((d) => ({ ...d, destination: e.target.value }))
                }
                className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm placeholder:text-stone-400 focus:border-fei-400 focus:outline-none focus:ring-2 focus:ring-fei-100"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1.5 block text-xs font-medium text-stone-600">
                  When?
                </label>
                <input
                  type="text"
                  placeholder="e.g. May 2026"
                  value={data.dates}
                  onChange={(e) =>
                    setData((d) => ({ ...d, dates: e.target.value }))
                  }
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm placeholder:text-stone-400 focus:border-fei-400 focus:outline-none focus:ring-2 focus:ring-fei-100"
                />
              </div>
              <div className="w-24">
                <label className="mb-1.5 block text-xs font-medium text-stone-600">
                  Days
                </label>
                <input
                  type="number"
                  placeholder="5"
                  min="1"
                  max="30"
                  value={data.duration}
                  onChange={(e) =>
                    setData((d) => ({ ...d, duration: e.target.value }))
                  }
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm placeholder:text-stone-400 focus:border-fei-400 focus:outline-none focus:ring-2 focus:ring-fei-100"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Interests & Pace (the exciting stuff first) */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-medium text-stone-600">
                What interests your group? (pick any)
              </label>
              <div className="flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map((interest) => (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      data.interests.includes(interest)
                        ? "bg-fei-500 text-white"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <input
                type="text"
                placeholder="Other interests? e.g. daughter loves dinosaurs..."
                value={data.otherInterests}
                onChange={(e) =>
                  setData((d) => ({ ...d, otherInterests: e.target.value }))
                }
                className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm placeholder:text-stone-400 focus:border-fei-400 focus:outline-none focus:ring-2 focus:ring-fei-100"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1.5 block text-xs font-medium text-stone-600">
                  Pace
                </label>
                <select
                  value={data.pace}
                  onChange={(e) =>
                    setData((d) => ({ ...d, pace: e.target.value }))
                  }
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm focus:border-fei-400 focus:outline-none focus:ring-2 focus:ring-fei-100"
                >
                  <option value="Relaxed">Relaxed</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Packed">Packed</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="mb-1.5 block text-xs font-medium text-stone-600">
                  Budget
                </label>
                <select
                  value={data.budget}
                  onChange={(e) =>
                    setData((d) => ({ ...d, budget: e.target.value }))
                  }
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm focus:border-fei-400 focus:outline-none focus:ring-2 focus:ring-fei-100"
                >
                  <option value="Budget">Budget</option>
                  <option value="Mid-range">Mid-range</option>
                  <option value="Luxury">Luxury</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Constraints & Concerns */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-600">
                Any constraints or concerns?
              </label>
              <p className="mb-3 text-xs text-stone-400">
                e.g. elderly parents with limited mobility, young kids who tire
                easily, must-visit locations, dietary needs, wheelchair access,
                sensory sensitivities...
              </p>
              <textarea
                placeholder="Tell us anything that might affect your trip planning..."
                value={data.constraints}
                onChange={(e) =>
                  setData((d) => ({ ...d, constraints: e.target.value }))
                }
                rows={4}
                className="w-full resize-none rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm placeholder:text-stone-400 focus:border-fei-400 focus:outline-none focus:ring-2 focus:ring-fei-100"
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-6 flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="rounded-xl border border-stone-200 px-4 py-3 text-sm text-stone-600 transition-colors hover:bg-stone-50"
            >
              Back
            </button>
          )}
          {step < 2 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
              className="flex-1 rounded-xl bg-fei-500 py-3 text-sm font-medium text-white transition-all hover:bg-fei-600 active:scale-[0.98] disabled:opacity-30"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="flex-1 rounded-xl bg-fei-500 py-3 text-sm font-medium text-white transition-all hover:bg-fei-600 active:scale-[0.98]"
            >
              Find places for my trip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
