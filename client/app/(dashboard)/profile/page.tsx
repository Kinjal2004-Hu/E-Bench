"use client";

import { useState, useEffect } from "react";
import {
    User, Mail, Phone, Building2, MapPin, FileText,
    Shield, Lock, Key, Monitor, Bell, BellOff,
    Sparkles, BookOpen, Scale, MessageSquare, BookMarked,
    ChevronRight, AlertTriangle, Download, Trash2,
    CheckCircle, Edit3, Save, X, LogOut, ExternalLink,
    Gavel, BadgeCheck
} from "lucide-react";
import { fetchUserProfile, updateUserProfile } from "@/lib/userApi";

/* ── Types ── */
type ProfileData = {
    fullName: string;
    email: string;
    phone: string;
    organization: string;
    location: string;
    bio: string;
    role: string;
    barId: string;
};

type NotificationPrefs = {
    legalUpdates: boolean;
    caseLawAlerts: boolean;
    emailNotifications: boolean;
    productUpdates: boolean;
};

/* ── Reusable components ── */
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}>
            {children}
        </div>
    );
}

function CardHeader({ title, icon: Icon, action }: { title: string; icon: typeof User; action?: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0F2854] flex items-center justify-center">
                    <Icon size={15} className="text-white" />
                </div>
                <h2 className="font-bold text-[#0F2854] text-sm tracking-wide uppercase">{title}</h2>
            </div>
            {action}
        </div>
    );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
    return (
        <button
            onClick={onChange}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? "bg-[#0F2854]" : "bg-gray-200"}`}
        >
            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-1"}`} />
        </button>
    );
}

function UsageBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
    const pct = Math.min(Math.round((value / max) * 100), 100);
    return (
        <div>
            <div className="flex justify-between text-xs font-medium text-gray-600 mb-1.5">
                <span>{label}</span>
                <span>{value} / {max}</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
        </div>
    );
}

/* ── Main Page ── */
export default function ProfilePage() {
    const [editing, setEditing] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState("");
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [activeTab, setActiveTab] = useState("profile");

    const [profile, setProfile] = useState<ProfileData>({
        fullName: "",
        email: "",
        phone: "",
        organization: "",
        location: "",
        bio: "",
        role: "Client",
        barId: "",
    });
    const [draft, setDraft] = useState<ProfileData>(profile);

    const [notifications, setNotifications] = useState<NotificationPrefs>({
        legalUpdates: true,
        caseLawAlerts: true,
        emailNotifications: false,
        productUpdates: true,
    });

    // Load profile from DB on mount
    useEffect(() => {
        fetchUserProfile()
            .then((data) => {
                const p: ProfileData = {
                    fullName: data.fullName || "",
                    email: data.email || "",
                    phone: data.phone || "",
                    organization: data.organization || "",
                    location: data.location || "",
                    bio: data.bio || "",
                    role: data.role || "Client",
                    barId: data.barId || "",
                };
                setProfile(p);
                setDraft(p);
            })
            .catch(() => { /* keep default empty */ });
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setSaveError("");
        try {
            const updated = await updateUserProfile(draft);
            const p: ProfileData = {
                fullName: updated.fullName || "",
                email: updated.email || "",
                phone: updated.phone || "",
                organization: updated.organization || "",
                location: updated.location || "",
                bio: updated.bio || "",
                role: updated.role || "Client",
                barId: updated.barId || "",
            };
            setProfile(p);
            setDraft(p);
            setEditing(false);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (err: unknown) {
            setSaveError(err instanceof Error ? err.message : "Failed to save.");
        } finally {
            setSaving(false);
        }
    };
    const handleCancel = () => { setDraft(profile); setEditing(false); setSaveError(""); };

    const TABS = [
        { id: "profile", label: "Profile" },
        { id: "security", label: "Security" },
        { id: "plan", label: "Plan & Usage" },
        { id: "notifications", label: "Notifications" },
        { id: "activity", label: "Saved Activity" },
    ];

    return (
        <div className="flex flex-col gap-5 flex-1 pb-8">
            {/* ── Page Header / Hero ── */}
            <Card className="overflow-hidden">
                <div className="h-28 bg-gradient-to-r from-[#0B1E45] via-[#0F2854] to-[#1C4D8D] relative opacity-0" >
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
                    <div className="absolute top-4 right-5 flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/25 px-3 py-1.5 rounded-full text-white text-xs font-medium">
                        <BadgeCheck size={13} /> Verified Partner
                    </div>
                </div>

                <div className="px-8 pb-6 flex flex-col sm:flex-row gap-5 sm:gap-6 items-center sm:items-end relative -mt-14">
                    <div className="w-24 h-24 rounded-2xl border-4 border-white bg-gradient-to-br from-[#1C4D8D] to-[#0F2854] text-white flex items-center justify-center text-3xl font-bold shadow-lg uppercase shrink-0">
                        {profile.fullName.split(" ").map(w => w[0]).slice(0, 2).join("")}
                    </div>
                    <div className="flex-1 text-center sm:text-left mb-1">
                        <h1 className="text-2xl font-bold text-[#0F2854]" style={{ fontFamily: "'Playfair Display', serif" }}>
                            {profile.fullName}
                        </h1>
                        <div className="flex items-center gap-2 justify-center sm:justify-start mt-1 flex-wrap">
                            <span className="text-[#1C4D8D] font-medium text-sm">{profile.role}</span>
                            <span className="w-1 h-1 rounded-full bg-gray-300" />
                            <span className="text-gray-500 text-sm">{profile.organization}</span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EEF4FF] text-[#1C4D8D] text-[11px] font-semibold border border-[#C8DEFF]">
                                <CheckCircle size={10} /> Bar ID: {profile.barId}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                        {saved && (
                            <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                                <CheckCircle size={15} /> Saved
                            </span>
                        )}
                        {saveError && (
                            <span className="text-sm text-red-600">{saveError}</span>
                        )}
                        <button
                            onClick={() => editing ? handleCancel() : setEditing(true)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${editing ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-[#0F2854] text-white hover:bg-[#1C4D8D]"}`}
                        >
                            {editing ? <><X size={15} /> Cancel</> : <><Edit3 size={15} /> Edit Profile</>}
                        </button>
                        {editing && (
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-60"
                            >
                                <Save size={15} /> {saving ? "Saving…" : "Save"}
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-t border-gray-100 px-8 flex gap-1 overflow-x-auto">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id ? "border-[#0F2854] text-[#0F2854]" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </Card>

            {/* ── PROFILE TAB ── */}
            {activeTab === "profile" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Personal Info */}
                    <div className="lg:col-span-2 flex flex-col gap-5">
                        <Card>
                            <CardHeader title="Personal Information" icon={User} />
                            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
                                {([
                                    { label: "Full Name", key: "fullName", icon: User },
                                    { label: "Email Address", key: "email", icon: Mail },
                                    { label: "Phone Number", key: "phone", icon: Phone },
                                    { label: "Organization / Law Firm", key: "organization", icon: Building2 },
                                    { label: "Location", key: "location", icon: MapPin },
                                    { label: "Bar Council ID", key: "barId", icon: Gavel },
                                ] as Array<{ label: string; key: keyof ProfileData; icon: typeof User }>).map(({ label, key, icon: Icon }) => (
                                    <div key={key}>
                                        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                                            <Icon size={12} /> {label}
                                        </label>
                                        {editing ? (
                                            <input
                                                value={draft[key]}
                                                onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))}
                                                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#4988C4] focus:ring-1 focus:ring-[#4988C4] bg-[#F8FAFC] transition-all"
                                            />
                                        ) : (
                                            <p className="text-sm font-medium text-gray-800">{profile[key]}</p>
                                        )}
                                    </div>
                                ))}
                                <div className="sm:col-span-2">
                                    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                                        <FileText size={12} /> Bio / About
                                    </label>
                                    {editing ? (
                                        <textarea
                                            rows={3}
                                            value={draft.bio}
                                            onChange={e => setDraft(d => ({ ...d, bio: e.target.value }))}
                                            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#4988C4] focus:ring-1 focus:ring-[#4988C4] bg-[#F8FAFC] resize-none transition-all"
                                        />
                                    ) : (
                                        <p className="text-sm text-gray-600 leading-relaxed">{profile.bio}</p>
                                    )}
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Right column */}
                    <div className="flex flex-col gap-5">
                        {/* Role section */}
                        <Card>
                            <CardHeader title="Account Role" icon={BadgeCheck} />
                            <div className="p-5">
                                {editing ? (
                                    <select
                                        value={draft.role}
                                        onChange={e => setDraft(d => ({ ...d, role: e.target.value }))}
                                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-[#F8FAFC] focus:outline-none focus:border-[#4988C4]"
                                    >
                                        {["Senior Lawyer", "Junior Lawyer", "Legal Researcher", "Law Student", "Judge (Retd.)", "Corporate Counsel"].map(r => (
                                            <option key={r}>{r}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        {["Senior Lawyer", "Legal Researcher", "Law Student", "Corporate Counsel"].map(r => (
                                            <button
                                                key={r}
                                                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium border transition-all ${profile.role === r ? "bg-[#EEF4FF] border-[#4988C4] text-[#0F2854]" : "bg-gray-50 border-gray-100 text-gray-500"}`}
                                            >
                                                {profile.role === r && <CheckCircle size={14} className="text-[#1C4D8D]" />}
                                                {r}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Quick Links
                        <Card>
                            <CardHeader title="Quick Links" icon={ExternalLink} />
                            <div className="p-3 flex flex-col">
                                {[
                                    { label: "My Cases", href: "/cases", icon: Scale },
                                    { label: "My Contracts", href: "/contracts", icon: FileText },
                                    { label: "My Chats", href: "/chats", icon: MessageSquare },
                                    { label: "Downloads", href: "/downloads", icon: Download },
                                ].map(({ label, icon: Icon }) => (
                                    <button key={label} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors group">
                                        <Icon size={16} className="text-[#4988C4]" />
                                        <span className="text-sm font-medium text-gray-700 flex-1 text-left">{label}</span>
                                        <ChevronRight size={14} className="text-gray-300 group-hover:text-[#4988C4] transition-colors" />
                                    </button>
                                ))}
                            </div>
                        </Card> */}
                    </div>
                </div>
            )}

            {/* ── SECURITY TAB ── */}
            {activeTab === "security" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Account Security */}
                    <Card>
                        <CardHeader title="Account Security" icon={Shield} />
                        <div className="p-5 flex flex-col gap-3">
                            {[
                                { label: "Change Password", desc: "Last changed 3 months ago", icon: Key, action: () => setShowPasswordModal(true) },
                                { label: "Two-Factor Authentication", desc: "Add an extra layer of security", icon: Shield, action: () => {} },
                                { label: "Manage Login Sessions", desc: "2 active sessions", icon: Monitor, action: () => {} },
                                { label: "Account Privacy Settings", desc: "Control who can see your profile", icon: Lock, action: () => {} },
                            ].map(({ label, desc, icon: Icon, action }) => (
                                <button
                                    key={label}
                                    onClick={action}
                                    className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-[#4988C4]/40 hover:bg-[#F8FAFC] transition-all group text-left"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-[#EEF4FF] flex items-center justify-center shrink-0">
                                        <Icon size={18} className="text-[#1C4D8D]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800">{label}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                                    </div>
                                    <ChevronRight size={16} className="text-gray-300 group-hover:text-[#4988C4] shrink-0 transition-colors" />
                                </button>
                            ))}
                        </div>
                    </Card>

                    {/* Active Sessions */}
                    <Card>
                        <CardHeader title="Active Sessions" icon={Monitor} />
                        <div className="p-5 flex flex-col gap-3">
                            {[
                                { device: "Chrome on Windows 11", location: "Mumbai, IN", time: "Current session", current: true },
                                { device: "Safari on iPhone 15", location: "Mumbai, IN", time: "2 hours ago", current: false },
                            ].map((s, i) => (
                                <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border ${s.current ? "border-emerald-200 bg-emerald-50" : "border-gray-100"}`}>
                                    <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${s.current ? "bg-emerald-500" : "bg-gray-300"}`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800">{s.device}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{s.location} · {s.time}</p>
                                    </div>
                                    {!s.current && (
                                        <button className="text-xs text-red-500 font-medium hover:underline shrink-0">Revoke</button>
                                    )}
                                    {s.current && <span className="text-[11px] text-emerald-600 font-semibold shrink-0">Active</span>}
                                </div>
                            ))}
                            <button className="flex items-center justify-center gap-2 w-full mt-1 py-2.5 text-sm font-medium text-red-600 border border-red-100 rounded-xl hover:bg-red-50 transition-colors">
                                <LogOut size={14} /> Logout from all devices
                            </button>
                        </div>
                    </Card>

                    {/* Danger Zone */}
                    <div className="lg:col-span-2">
                        <Card className="border-red-100">
                            <div className="flex items-center gap-2.5 px-6 py-4 border-b border-red-100">
                                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                                    <AlertTriangle size={15} className="text-red-500" />
                                </div>
                                <h2 className="font-bold text-red-600 text-sm tracking-wide uppercase">Danger Zone</h2>
                            </div>
                            <div className="p-6 flex flex-col sm:flex-row gap-4">
                                <div className="flex-1 flex items-start gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50">
                                    <Download size={20} className="text-gray-500 mt-0.5 shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-gray-800">Export My Data</p>
                                        <p className="text-xs text-gray-500 mt-0.5">Download all your data including chats, cases, and documents.</p>
                                    </div>
                                    <button className="px-4 py-2 text-xs font-semibold border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-colors shrink-0">Export</button>
                                </div>
                                <div className="flex-1 flex items-start gap-4 p-4 rounded-xl border border-red-100 bg-red-50">
                                    <Trash2 size={20} className="text-red-500 mt-0.5 shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-red-700">Delete Account</p>
                                        <p className="text-xs text-red-400 mt-0.5">Permanently delete your account and all associated data.</p>
                                    </div>
                                    <button
                                        onClick={() => setShowDeleteConfirm(v => !v)}
                                        className="px-4 py-2 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shrink-0"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                            {showDeleteConfirm && (
                                <div className="mx-6 mb-6 p-4 rounded-xl border border-red-200 bg-red-50 flex items-center gap-3">
                                    <AlertTriangle size={16} className="text-red-500 shrink-0" />
                                    <p className="text-sm text-red-700 flex-1">Are you sure? This action <strong>cannot be undone</strong>.</p>
                                    <button className="px-3 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">Confirm Delete</button>
                                    <button onClick={() => setShowDeleteConfirm(false)} className="text-xs text-gray-500 hover:underline">Cancel</button>
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            )}

            {/* ── PLAN & USAGE TAB ── */}
            {activeTab === "plan" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Current Plan */}
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader title="Subscription Plan" icon={Sparkles} />
                            <div className="p-6">
                                <div className="flex items-center gap-4 p-5 rounded-xl bg-gradient-to-r from-[#0F2854] to-[#1C4D8D] text-white mb-6">
                                    <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
                                        <Sparkles size={22} className="text-yellow-300" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-blue-200">Current Plan</p>
                                        <p className="text-xl font-bold mt-0.5">Pro Plan</p>
                                        <p className="text-xs text-blue-200 mt-0.5">Renews on April 12, 2026</p>
                                    </div>
                                    <span className="px-3 py-1.5 rounded-full bg-yellow-400/20 text-yellow-300 text-xs font-bold border border-yellow-400/30">ACTIVE</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                                    {[
                                        { label: "AI Queries", used: 847, max: 1000 },
                                        { label: "Documents Stored", used: 23, max: 100 },
                                        { label: "Case Analyses", used: 124, max: 200 },
                                    ].map(({ label, used, max }) => (
                                        <div key={label} className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                                            <p className="text-sm font-bold text-[#0F2854] mb-0.5">{used}<span className="text-gray-400 font-normal text-xs"> /{max}</span></p>
                                            <p className="text-xs text-gray-500 mb-2">{label}</p>
                                            <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                                                <div className="h-1.5 rounded-full bg-[#0F2854]" style={{ width: `${Math.min((used / max) * 100, 100)}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <UsageBar label="Storage Used" value={2.3} max={10} color="#1C4D8D" />
                                    <UsageBar label="API Calls This Month" value={847} max={1000} color="#C49A10" />
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Plan options */}
                    <div className="flex flex-col gap-4">
                        {[
                            { name: "Free", price: "₹0", features: ["50 AI queries/mo", "5 documents", "Basic search"], active: false },
                            { name: "Pro", price: "₹999/mo", features: ["1000 AI queries/mo", "100 documents", "Indian Kanoon access", "Priority support"], active: true },
                            { name: "Enterprise", price: "Custom", features: ["Unlimited queries", "Unlimited storage", "Custom models", "Dedicated support"], active: false },
                        ].map(plan => (
                            <div key={plan.name} className={`p-4 rounded-xl border-2 transition-all ${plan.active ? "border-[#0F2854] bg-[#EEF4FF]" : "border-gray-100 bg-white hover:border-gray-200"}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-bold text-[#0F2854] text-sm">{plan.name}</span>
                                    {plan.active && <span className="text-[10px] font-bold bg-[#0F2854] text-white px-2 py-0.5 rounded-full">CURRENT</span>}
                                </div>
                                <p className="text-lg font-bold text-[#0F2854] mb-2">{plan.price}</p>
                                <ul className="text-xs text-gray-500 space-y-1 mb-3">
                                    {plan.features.map(f => <li key={f} className="flex items-center gap-1.5"><CheckCircle size={11} className="text-emerald-500 shrink-0" />{f}</li>)}
                                </ul>
                                {!plan.active && (
                                    <button className="w-full py-2 text-xs font-semibold bg-[#0F2854] text-white rounded-lg hover:bg-[#1C4D8D] transition-colors">
                                        {plan.name === "Enterprise" ? "Contact Sales" : "Upgrade"}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── NOTIFICATIONS TAB ── */}
            {activeTab === "notifications" && (
                <Card>
                    <CardHeader title="Notification Preferences" icon={Bell} />
                    <div className="p-6 flex flex-col gap-3">
                        {([
                            { key: "legalUpdates", label: "Legal Updates", desc: "Get notified about new law amendments and notifications", icon: Scale },
                            { key: "caseLawAlerts", label: "Case Law Alerts", desc: "Alerts for new Supreme Court & High Court judgments", icon: Gavel },
                            { key: "emailNotifications", label: "Email Notifications", desc: "Receive a daily digest to your registered email", icon: Mail },
                            { key: "productUpdates", label: "Product Updates", desc: "New features, improvements, and maintenance updates", icon: Sparkles },
                        ] as Array<{ key: keyof NotificationPrefs; label: string; desc: string; icon: typeof Bell }>).map(({ key, label, desc, icon: Icon }) => (
                            <div key={key} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                                <div className="w-10 h-10 rounded-xl bg-[#EEF4FF] flex items-center justify-center shrink-0">
                                    {notifications[key]
                                        ? <Icon size={18} className="text-[#1C4D8D]" />
                                        : <BellOff size={18} className="text-gray-400" />
                                    }
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-800">{label}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                                </div>
                                <ToggleSwitch
                                    checked={notifications[key]}
                                    onChange={() => setNotifications(p => ({ ...p, [key]: !p[key] }))}
                                />
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* ── SAVED ACTIVITY TAB ── */}
            {activeTab === "activity" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {[
                        { label: "Saved Judgements", count: 34, icon: Gavel, color: "#0F2854", bg: "#EEF4FF", href: "/cases" },
                        { label: "Saved Legal Sections", count: 87, icon: BookOpen, color: "#7C3AED", bg: "#F3EEFF", href: "/cases" },
                        { label: "Saved AI Responses", count: 152, icon: MessageSquare, color: "#0D6E4F", bg: "#ECFDF5", href: "/chats" },
                        { label: "Research Notes", count: 21, icon: BookMarked, color: "#B45309", bg: "#FFFBEB", href: "/chats?filter=Summary" },
                    ].map(({ label, count, icon: Icon, color, bg, href }) => (
                        <Card key={label} className="cursor-pointer hover:shadow-md transition-shadow group">
                            <div className="p-6 flex flex-col gap-4">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: bg }}>
                                    <Icon size={22} style={{ color }} />
                                </div>
                                <div>
                                    <p className="text-3xl font-bold" style={{ color }}>{count}</p>
                                    <p className="text-sm font-medium text-gray-600 mt-1">{label}</p>
                                </div>
                                <button className="flex items-center gap-1.5 text-xs font-semibold transition-all" style={{ color }}>
                                    View All <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                                </button>
                            </div>
                        </Card>
                    ))}

                    {/* Recent saved items */}
                    <div className="sm:col-span-2 lg:col-span-4">
                        <Card>
                            <CardHeader title="Recently Saved" icon={BookMarked} />
                            <div className="p-4 flex flex-col gap-2">
                                {[
                                    { title: "Section 279 BNS — Rash Driving", type: "Legal Section", time: "2h ago", icon: Scale },
                                    { title: "Vishaka vs. State of Rajasthan (1997)", type: "Judgement", time: "1d ago", icon: Gavel },
                                    { title: "AI response on POCSO Act amendments", type: "AI Response", time: "2d ago", icon: MessageSquare },
                                    { title: "Notes on Digital Evidence Act 2023", type: "Research Note", time: "4d ago", icon: BookMarked },
                                ].map((item, i) => (
                                    <button key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group text-left">
                                        <div className="w-9 h-9 rounded-lg bg-[#EEF4FF] flex items-center justify-center shrink-0">
                                            <item.icon size={16} className="text-[#1C4D8D]" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-800 truncate">{item.title}</p>
                                            <p className="text-[11px] text-gray-400">{item.type} · {item.time}</p>
                                        </div>
                                        <ChevronRight size={14} className="text-gray-300 group-hover:text-[#4988C4] shrink-0 transition-colors" />
                                    </button>
                                ))}
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {/* ── Change Password Modal ── */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="font-bold text-[#0F2854] text-lg">Change Password</h3>
                            <button onClick={() => setShowPasswordModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                                <X size={18} className="text-gray-500" />
                            </button>
                        </div>
                        {["Current Password", "New Password", "Confirm New Password"].map(label => (
                            <div key={label} className="mb-4">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">{label}</label>
                                <input type="password" className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#4988C4] focus:ring-1 focus:ring-[#4988C4] bg-[#F8FAFC]" placeholder="••••••••" />
                            </div>
                        ))}
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowPasswordModal(false)} className="flex-1 py-2.5 text-sm font-semibold border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50">Cancel</button>
                            <button onClick={() => setShowPasswordModal(false)} className="flex-1 py-2.5 text-sm font-semibold bg-[#0F2854] text-white rounded-xl hover:bg-[#1C4D8D]">Update Password</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}