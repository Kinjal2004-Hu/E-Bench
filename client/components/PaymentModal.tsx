"use client";

import { useState } from "react";
import { X, CreditCard, Video, MessageSquare, Lock } from "lucide-react";
import type { ApiConsultant } from "@/lib/chatApi";

export type SessionType = "video" | "chat";

interface Props {
  lawyer: ApiConsultant;
  onSuccess: (sessionType: SessionType) => void;
  onClose: () => void;
}

export default function PaymentModal({ lawyer, onSuccess, onClose }: Props) {
  const [sessionType, setSessionType] = useState<SessionType>("video");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [name, setName] = useState("");
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    if (!name.trim()) e.name = "Card holder name is required";
    const rawCard = cardNumber.replace(/\s/g, "");
    if (rawCard.length !== 16) e.cardNumber = "Enter a valid 16-digit card number";
    if (!/^\d{2}\/\d{2}$/.test(expiry)) e.expiry = "Enter expiry as MM/YY";
    if (!/^\d{3,4}$/.test(cvv)) e.cvv = "Enter 3 or 4 digit CVV";
    return e;
  };

  const handlePay = () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setProcessing(true);
    // Simulate payment processing (dummy)
    setTimeout(() => {
      setProcessing(false);
      onSuccess(sessionType);
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: "#F5EFE4", border: "1.5px solid #C8B48A" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ background: "#8D7A55", color: "#F5EFE4" }}
        >
          <div>
            <h2 className="text-xl font-bold">Confirm &amp; Pay</h2>
            <p className="text-sm opacity-75 mt-0.5">Consulting {lawyer.fullName}</p>
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

            {/* Name */}
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

            {/* Card Number */}
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

            {/* Expiry + CVV */}
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

          {/* Pay button */}
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
                Processing…
              </>
            ) : (
              <>
                <Lock size={16} /> Pay ₹{fee}
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
