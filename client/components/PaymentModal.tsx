"use client";

import { useState } from "react";
import { X, CreditCard, Video, MessageSquare, Lock, Calendar, Clock, FileText } from "lucide-react";
import type { ApiConsultant } from "@/lib/chatApi";

export type SessionType = "video" | "chat";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00",
];

function todayString() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

interface Props {
  lawyer: ApiConsultant;
  onSuccess: (sessionType: SessionType) => void;
  onClose: () => void;
}

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || localStorage.getItem("ebench_token") || "";
}

export default function PaymentModal({ lawyer, onSuccess, onClose }: Props) {
  const [sessionType, setSessionType] = useState<SessionType>("video");
  const [date, setDate] = useState(todayString());
  const [time, setTime] = useState(TIME_SLOTS[0]);
  const [caseType, setCaseType] = useState(
    lawyer.specialization
      ? lawyer.specialization.split("-").map((x) => x.charAt(0).toUpperCase() + x.slice(1)).join(" ")
      : ""
  );
  const [message, setMessage] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [name, setName] = useState("");
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [bookingError, setBookingError] = useState("");

  const fee = lawyer.consultationFee ?? "500";

  const formatCard = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  };

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!date) e.date = "Select a date";
    if (!time) e.time = "Select a time";
    if (!caseType.trim()) e.caseType = "Enter case type";
    if (!name.trim()) e.name = "Card holder name is required";
    const rawCard = cardNumber.replace(/\s/g, "");
    if (rawCard.length !== 16) e.cardNumber = "Enter a valid 16-digit card number";
    if (!/^\d{2}\/\d{2}$/.test(expiry)) e.expiry = "Enter expiry as MM/YY";
    if (!/^\d{3,4}$/.test(cvv)) e.cvv = "Enter 3 or 4 digit CVV";
    return e;
  };

  const createBooking = async () => {
    const token = getToken();
    const response = await fetch(`${API_BASE}/api/lawyer/consultation-requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        consultantId: lawyer._id,
        legalCategory: caseType.trim(),
        requestedDate: date,
        requestedTime: time,
        consultationType: sessionType === "video" ? "Video" : "Chat",
        message: message.trim() || `Booked for ${date} at ${time}`,
      }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error || "Failed to book slot");
    }
    return response.json();
  };

  const handlePay = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setProcessing(true);
    setBookingError("");

    try {
      await createBooking();
      // Simulate payment processing (dummy)
      await new Promise((r) => setTimeout(r, 1800));
      setProcessing(false);
      onSuccess(sessionType);
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Booking failed");
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="relative w-full max-w-lg rounded-2xl shadow-2xl overflow-y-auto max-h-[95vh]"
        style={{ background: "#F5EFE4", border: "1.5px solid #C8B48A" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ background: "#8D7A55", color: "#F5EFE4" }}
        >
          <div>
            <h2 className="text-xl font-bold">Book a Slot</h2>
            <p className="text-sm opacity-75 mt-0.5">with {lawyer.fullName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Summary */}
          <div
            className="flex items-center justify-between p-3 rounded-xl"
            style={{ background: "#EDE0CB" }}
          >
            <div className="text-sm" style={{ color: "#4a3f30" }}>
              <span className="font-semibold">{lawyer.specialization}</span> · 30-min session
            </div>
            <span className="text-lg font-bold" style={{ color: "#3d3220" }}>
              ₹{fee}
            </span>
          </div>

          {/* ── Slot Booking ─────────────────────────────── */}
          <div className="space-y-3 p-4 rounded-xl border" style={{ borderColor: "#C8B48A", background: "#fff" }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#8D7A55" }}>
              <Calendar size={14} className="inline mr-1" /> Select Date &amp; Time
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium" style={{ color: "#6b5c3e" }}>Date</label>
                <input
                  type="date"
                  value={date}
                  min={todayString()}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none border mt-1"
                  style={{
                    background: "#fff",
                    border: `1px solid ${errors.date ? "#e55" : "#C8B48A"}`,
                    color: "#3d3220",
                  }}
                />
                {errors.date && <p className="text-xs mt-1 text-red-500">{errors.date}</p>}
              </div>

              <div>
                <label className="text-xs font-medium" style={{ color: "#6b5c3e" }}>Time</label>
                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border mt-1"
                  style={{
                    background: "#fff",
                    border: `1px solid ${errors.time ? "#e55" : "#C8B48A"}`,
                    color: "#3d3220",
                  }}
                >
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
                {errors.time && <p className="text-xs mt-1 text-red-500">{errors.time}</p>}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium" style={{ color: "#6b5c3e" }}>
                <FileText size={14} className="inline mr-1" /> Case Type / Legal Category
              </label>
              <input
                type="text"
                value={caseType}
                onChange={(e) => setCaseType(e.target.value)}
                placeholder="e.g. Criminal, Property Dispute, Family Law"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none border mt-1"
                style={{
                  background: "#fff",
                  border: `1px solid ${errors.caseType ? "#e55" : "#C8B48A"}`,
                  color: "#3d3220",
                }}
              />
              {errors.caseType && <p className="text-xs mt-1 text-red-500">{errors.caseType}</p>}
            </div>

            <div>
              <label className="text-xs font-medium" style={{ color: "#6b5c3e" }}>
                <MessageSquare size={14} className="inline mr-1" /> Notes (optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Briefly describe your legal issue..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none border mt-1 resize-none"
                style={{
                  background: "#fff",
                  border: `1px solid #C8B48A`,
                  color: "#3d3220",
                }}
              />
            </div>
          </div>

          {/* Session Type Toggle */}
          <div>
            <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "#8D7A55" }}>
              Session Type
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(["video", "chat"] as SessionType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setSessionType(type)}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all text-sm font-medium"
                  style={{
                    borderColor: sessionType === type ? "#8D7A55" : "#C8B48A",
                    background: sessionType === type ? "#8D7A55" : "#fff",
                    color: sessionType === type ? "#F5EFE4" : "#6b5c3e",
                  }}
                >
                  {type === "video" ? <Video size={20} /> : <MessageSquare size={20} />}
                  {type === "video" ? "Video Call" : "Text Chat"}
                  <span className="text-xs opacity-70">30 min</span>
                </button>
              ))}
            </div>
          </div>

          {/* Card Form */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#8D7A55" }}>
              Payment Details
            </p>

            <div>
              <input
                type="text"
                placeholder="Card holder name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none border"
                style={{
                  background: "#fff",
                  border: `1px solid ${errors.name ? "#e55" : "#C8B48A"}`,
                  color: "#3d3220",
                }}
              />
              {errors.name && <p className="text-xs mt-1 text-red-500">{errors.name}</p>}
            </div>

            <div>
              <div className="relative">
                <CreditCard
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: "#8D7A55" }}
                />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCard(e.target.value))}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none border"
                  style={{
                    background: "#fff",
                    border: `1px solid ${errors.cardNumber ? "#e55" : "#C8B48A"}`,
                    color: "#3d3220",
                  }}
                />
              </div>
              {errors.cardNumber && <p className="text-xs mt-1 text-red-500">{errors.cardNumber}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none border"
                  style={{
                    background: "#fff",
                    border: `1px solid ${errors.expiry ? "#e55" : "#C8B48A"}`,
                    color: "#3d3220",
                  }}
                />
                {errors.expiry && <p className="text-xs mt-1 text-red-500">{errors.expiry}</p>}
              </div>
              <div>
                <input
                  type="password"
                  inputMode="numeric"
                  placeholder="CVV"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none border"
                  style={{
                    background: "#fff",
                    border: `1px solid ${errors.cvv ? "#e55" : "#C8B48A"}`,
                    color: "#3d3220",
                  }}
                />
                {errors.cvv && <p className="text-xs mt-1 text-red-500">{errors.cvv}</p>}
              </div>
            </div>
          </div>

          {/* Booking error */}
          {bookingError && (
            <p className="text-sm text-red-600 text-center">{bookingError}</p>
          )}

          {/* Pay & Book button */}
          <button
            onClick={handlePay}
            disabled={processing}
            className="w-full py-3 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-opacity"
            style={{
              background: "#8D7A55",
              color: "#F5EFE4",
              opacity: processing ? 0.7 : 1,
            }}
          >
            {processing ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Booking…
              </>
            ) : (
              <>
                <Lock size={16} /> Pay ₹{fee} &amp; Book Slot
              </>
            )}
          </button>

          <p className="text-center text-xs" style={{ color: "#a08d70" }}>
            This is a demo payment screen. No real transaction occurs.
          </p>
        </div>
      </div>
    </div>
  );
}
