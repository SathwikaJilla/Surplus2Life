import React, { useState } from "react";
import {
  Send,
  Smartphone,
  Sparkles,
  X,
  RefreshCw,
  Signal,
  Battery
} from "lucide-react";
import { api } from "../api";
import confetti from "canvas-confetti";

export default function SMSGatewaySimulator({ isOpen, onClose, onDonationCreated }) {
  const [phoneNumber, setPhoneNumber] = useState("+91 98401 99882");
  const [smsInput, setSmsInput] = useState("200 plates rice curry 1pm Anna Nagar");
  const [isSending, setIsSending] = useState(false);
  const [lastParsed, setLastParsed] = useState(null);
  const [messages, setMessages] = useState([
    {
      sender: "system",
      text: "Surplus2Life SMS Gateway Active. Send donations in format: <qty> <food> <time> <location>",
      time: "10:00 AM"
    }
  ]);

  if (!isOpen) return null;

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!smsInput.trim() || isSending) return;

    const userMsg = {
      sender: "user",
      text: smsInput,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    const currentText = smsInput;
    setSmsInput("");
    setIsSending(true);

    try {
      const res = await api.sendSMS(phoneNumber, currentText);
      setLastParsed(res.parsed_entities);

      const replyMsg = {
        sender: "system",
        text: res.response_sms,
        donationId: res.donation_id,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, replyMsg]);

      if (res.donation_id) {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 }
        });
        if (onDonationCreated) onDonationCreated();
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "system",
          text: "SMS Gateway Error: " + err.message,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const samplePrompts = [
    "200 plates rice curry 1pm Anna Nagar",
    "40 kg bread rolls 10am T Nagar",
    "100 meals vegetable pulao 2:30pm Chetpet",
    "30 litres used cooking oil Guindy"
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-3xl bg-white border border-[#E5EAE1] shadow-2xl overflow-hidden my-4">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-[#E5EAE1] bg-[#F5F7F2]">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-teal-600" />
            <div>
              <h3 className="text-sm font-bold text-[#17211B]">SMS Fallback Gateway Simulator</h3>
              <p className="text-[10px] text-[#647067]">For basic phone users & areas without internet connection</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#647067] hover:text-[#17211B] hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Realistic Phone Frame Container */}
        <div className="p-4 sm:p-6 bg-[#F5F7F2]">
          <div className="w-full max-w-sm mx-auto rounded-3xl bg-white border-2 border-slate-300 shadow-xl overflow-hidden flex flex-col h-[520px]">
            
            {/* Phone Status Bar */}
            <div className="px-5 py-2 bg-[#F5F7F2] border-b border-[#E5EAE1] flex items-center justify-between text-[11px] text-[#647067]">
              <span className="font-semibold text-[#17211B]">Surplus2Life Gateway</span>
              <div className="flex items-center gap-2">
                <Signal className="w-3 h-3 text-teal-600" />
                <span>4G</span>
                <Battery className="w-3.5 h-3.5 text-emerald-600" />
              </div>
            </div>

            {/* Inbound Phone Identifier */}
            <div className="px-4 py-2 bg-white border-b border-[#E5EAE1] flex items-center justify-between text-xs text-[#17211B]">
              <span className="text-[#647067]">Donor Mobile:</span>
              <span className="font-mono text-teal-700 font-bold">{phoneNumber}</span>
            </div>

            {/* Message Thread Scroll Area */}
            <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-[#FFFDF5]">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                      m.sender === "user"
                        ? "bg-emerald-600 text-white rounded-br-none shadow-xs"
                        : "bg-white text-[#17211B] border border-[#E5EAE1] rounded-bl-none shadow-xs"
                    }`}
                  >
                    {m.text}
                    {m.donationId && (
                      <div className="mt-1 pt-1 border-t border-[#E5EAE1] text-[10px] text-emerald-700 font-bold">
                        Passport ID: {m.donationId} (Listed)
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-[#647067] mt-0.5 px-1">{m.time}</span>
                </div>
              ))}
              {isSending && (
                <div className="flex items-center gap-2 text-xs text-teal-600 italic">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>NLP analyzing entities...</span>
                </div>
              )}
            </div>

            {/* Quick Sample Prompts Strip */}
            <div className="p-2 bg-[#F5F7F2] border-t border-[#E5EAE1] overflow-x-auto flex gap-1.5 scrollbar-none">
              {samplePrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => setSmsInput(p)}
                  className="px-2 py-1 rounded-md bg-white hover:bg-slate-100 text-[10px] text-[#17211B] whitespace-nowrap shrink-0 border border-[#E5EAE1]"
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Phone SMS Input Bar */}
            <form onSubmit={handleSend} className="p-2.5 bg-white border-t border-[#E5EAE1] flex items-center gap-2">
              <input
                type="text"
                value={smsInput}
                onChange={(e) => setSmsInput(e.target.value)}
                placeholder="Type SMS donation..."
                className="flex-1 px-3 py-2 text-xs rounded-xl bg-[#F5F7F2] border border-[#E5EAE1] text-[#17211B] placeholder-[#647067] focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={isSending || !smsInput.trim()}
                className="p-2 rounded-xl bg-[#16A34A] hover:bg-[#15803d] text-white font-bold disabled:opacity-40 shadow-xs"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

          </div>

          {/* NLP Extracted Entities breakdown preview */}
          {lastParsed && (
            <div className="mt-4 p-3.5 rounded-xl bg-white border border-[#E5EAE1] text-xs shadow-xs">
              <div className="flex items-center gap-1.5 text-teal-700 font-bold mb-1">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span>NLP Parsed Entities:</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-[#647067]">
                <div>Quantity: <strong className="text-[#17211B]">{lastParsed.quantity} {lastParsed.unit}</strong></div>
                <div>Food: <strong className="text-[#17211B]">{lastParsed.food_item}</strong></div>
                <div>Time: <strong className="text-[#17211B]">{lastParsed.preparation_time}</strong></div>
                <div>Location: <strong className="text-[#17211B]">{lastParsed.location}</strong></div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
