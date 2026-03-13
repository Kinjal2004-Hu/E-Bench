"use client";

import { Settings, Moon, Globe, Bell, Shield, Save } from "lucide-react";

export default function SettingsPage() {
    return (
        <div className="flex flex-col gap-6 h-full max-w-4xl">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-white border border-gray-200 rounded-xl text-[#0F2854] shadow-sm"><Settings size={24} /></div>
                <div>
                    <h1 className="text-2xl font-bold text-[#0F2854] font-serif">Platform Settings</h1>
                    <p className="text-sm text-gray-500">Manage your preferences, notifications, and account settings.</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden divide-y divide-gray-100">

                {/* Theme Settings */}
                <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
                    <div className="flex gap-4 max-w-sm">
                        <div className="p-2 bg-[#F5F7FA] text-[#1C4D8D] rounded-lg h-min"><Moon size={20} /></div>
                        <div>
                            <h3 className="font-semibold text-[#0F2854] mb-1">Theme Preference</h3>
                            <p className="text-sm text-gray-500">Switch between Light and Dark mode depending on your environment.</p>
                        </div>
                    </div>
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button className="px-4 py-2 text-sm font-medium rounded-md bg-white shadow-sm text-[#0F2854]">Light</button>
                        <button className="px-4 py-2 text-sm font-medium rounded-md text-gray-500 hover:text-gray-700">Dark</button>
                        <button className="px-4 py-2 text-sm font-medium rounded-md text-gray-500 hover:text-gray-700">System</button>
                    </div>
                </div>

                {/* Language Settings */}
                <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
                    <div className="flex gap-4 max-w-sm">
                        <div className="p-2 bg-[#F5F7FA] text-[#1C4D8D] rounded-lg h-min"><Globe size={20} /></div>
                        <div>
                            <h3 className="font-semibold text-[#0F2854] mb-1">Language & Region</h3>
                            <p className="text-sm text-gray-500">Set your preferred UI language and law region for accuracy.</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <select className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-[#4988C4] focus:border-[#4988C4] block w-full p-2.5 outline-none">
                            <option>English</option>
                            <option>Hindi</option>
                            <option>Marathi</option>
                        </select>
                        <select className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-[#4988C4] focus:border-[#4988C4] block w-full p-2.5 outline-none">
                            <option>India (Central)</option>
                        </select>
                    </div>
                </div>

                {/* Notification Settings */}
                <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
                    <div className="flex gap-4 max-w-sm">
                        <div className="p-2 bg-[#F5F7FA] text-[#1C4D8D] rounded-lg h-min"><Bell size={20} /></div>
                        <div>
                            <h3 className="font-semibold text-[#0F2854] mb-1">Notification Settings</h3>
                            <p className="text-sm text-gray-500">Enable or disable alerts for news and task completions.</p>
                        </div>
                    </div>
                    <div className="flex flex-col gap-3">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" defaultChecked />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4988C4]"></div>
                            <span className="ml-3 text-sm font-medium text-gray-700">Email Alerts</span>
                        </label>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" defaultChecked />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4988C4]"></div>
                            <span className="ml-3 text-sm font-medium text-gray-700">Browser Push</span>
                        </label>
                    </div>
                </div>

                {/* Privacy */}
                <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
                    <div className="flex gap-4 max-w-sm">
                        <div className="p-2 bg-[#F5F7FA] text-[#1C4D8D] rounded-lg h-min"><Shield size={20} /></div>
                        <div>
                            <h3 className="font-semibold text-[#0F2854] mb-1">Data Privacy</h3>
                            <p className="text-sm text-gray-500">Manage data sharing and document retention policies.</p>
                        </div>
                    </div>
                    <button className="border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                        Manage Privacy
                    </button>
                </div>
            </div>

            <div className="flex justify-end gap-4 mt-2">
                <button className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                    Cancel
                </button>
                <button className="flex items-center gap-2 px-5 py-2.5 bg-[#0F2854] text-white rounded-lg text-sm font-medium hover:bg-[#1C4D8D] transition-colors shadow-sm">
                    <Save size={16} /> Save Changes
                </button>
            </div>
        </div>
    );
}
