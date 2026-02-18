"use client";

import { useState } from "react";
import type { Journey, DateString } from "../lib/types";
import * as svc from "../lib/service";

interface JourneyManagerProps {
  userId: string;
  journeys: Journey[];
  onCreated: (journey: Journey) => void;
  onDeleted: (journeyId: string) => void;
}

export default function JourneyManager({
  userId,
  journeys,
  onCreated,
  onDeleted,
}: JourneyManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const userJourneys = journeys.filter((j) => j.user_id === userId);

  async function handleAdd() {
    setError("");
    if (!startDate || !endDate) {
      setError("Both dates required");
      return;
    }
    if (endDate < startDate) {
      setError("End must be after start");
      return;
    }
    try {
      const j = await svc.createJourney(userId, startDate as DateString, endDate as DateString);
      onCreated(j);
      setStartDate("");
      setEndDate("");
      setShowForm(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create journey");
    }
  }

  async function handleDelete(journeyId: string) {
    try {
      await svc.deleteJourney(journeyId);
      onDeleted(journeyId);
      setConfirmDeleteId(null);
    } catch {
      setError("Failed to delete journey");
    }
  }

  function formatRange(j: Journey) {
    const s = new Date(j.start_date + "T12:00:00");
    const e = new Date(j.end_date + "T12:00:00");
    const fmt = (d: Date) =>
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${fmt(s)} – ${fmt(e)}`;
  }

  return (
    <div className="ht-journey-manager">
      {userJourneys.length > 0 && (
        <div className="ht-journey-list">
          {userJourneys.map((j) => (
            <div key={j.id} className="ht-journey-item">
              {confirmDeleteId === j.id ? (
                <>
                  <span className="ht-journey-confirm-text">Delete?</span>
                  <button
                    className="ht-journey-confirm-yes"
                    onClick={() => handleDelete(j.id)}
                  >
                    Yes
                  </button>
                  <button
                    className="ht-journey-confirm-no"
                    onClick={() => setConfirmDeleteId(null)}
                  >
                    No
                  </button>
                </>
              ) : (
                <>
                  <span className="ht-journey-dates">{formatRange(j)}</span>
                  <button
                    className="ht-journey-delete-btn"
                    onClick={() => setConfirmDeleteId(j.id)}
                    aria-label="Delete journey"
                  >
                    <svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true">
                      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <div className="ht-journey-form">
          <label className="ht-journey-form-label">
            Start
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label className="ht-journey-form-label">
            End
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
          {error && <p className="ht-journey-form-error">{error}</p>}
          <div className="ht-journey-form-actions">
            <button
              onClick={() => {
                setShowForm(false);
                setError("");
                setStartDate("");
                setEndDate("");
              }}
            >
              Cancel
            </button>
            <button className="ht-journey-form-submit" onClick={handleAdd}>
              Add
            </button>
          </div>
        </div>
      ) : (
        <button
          className="ht-journey-add-btn"
          onClick={() => setShowForm(true)}
        >
          + Add journey
        </button>
      )}
    </div>
  );
}
