"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X, ChevronDown, ArrowRight, HelpCircle } from "lucide-react";

const PLANS = [
  {
    name: "Starter",
    tagline: "DIY. Full control.",
    setupPrice: "₹0",
    monthlyPrice: "₹2,999",
    billingCycle: "flat / WABA / month",
    ctaText: "Get Started DIY",
    ctaLink: "/signup",
    recommended: false,
    features: [
      "All core platform features",
      "Shared Team Inbox",
      "Broadcast Campaigns",
      "Visual Flow Builder",
      "AI Knowledge Base Integration",
      "0% message markup (Direct to Meta)",
      "Standard email support",
    ],
  },
  {
    name: "Growth",
    tagline: "We launch you. You run it.",
    setupPrice: "₹7,000",
    monthlyPrice: "₹9,999",
    afterPrice: "₹2,999/month after 1st month",
    billingCycle: "1st month (includes setup)",
    ctaText: "Book a Strategy Call",
    ctaLink: "/book-demo",
    recommended: true,
    features: [
      "Everything in Starter",
      "Official WABA Number connection",
      "Custom AI Chatbot configuration",
      "2-3 core automations setup",
      "Pre-built Shopify / Razorpay triggers",
      "Priority WhatsApp Support Group",
      "1-on-1 onboarding strategy call",
    ],
  },
  {
    name: "Managed",
    tagline: "We run everything.",
    setupPrice: "₹27,000",
    monthlyPrice: "₹29,999",
    afterPrice: "₹2,999/month after 1st month",
    billingCycle: "1st month (includes setup)",
    ctaText: "Book a Strategy Call",
    ctaLink: "/book-demo",
    recommended: false,
    features: [
      "Everything in Growth",
      "Full custom chatbot copywriting",
      "Monthly AI knowledge base training",
      "Unlimited template approvals",
      "Monthly optimization & analytics review",
      "Dedicated Account Manager",
      "Monthly strategy deep-dives",
    ],
  },
];

const MATRIX_CATEGORIES = [
  {
    category: "Platform Access",
    rows: [
      { label: "Shared Team Inbox", starter: true, growth: true, managed: true },
      { label: "Broadcast Campaigns & Analytics", starter: true, growth: true, managed: true },
      { label: "Visual Flow & Chatbot Builder", starter: true, growth: true, managed: true },
      { label: "0% Message Markup (Direct to Meta)", starter: true, growth: true, managed: true },
      { label: "Shopify / Razorpay Integrations", starter: true, growth: true, managed: true },
    ],
  },
  {
    category: "Onboarding & Configuration",
    rows: [
      { label: "WABA Number Setup & Connection", starter: "DIY", growth: "Assisted", managed: "Done-For-You" },
      { label: "AI Assistant Configuration", starter: "DIY", growth: "Custom trained", managed: "Fully managed & optimized" },
      { label: "Active Automations Setup", starter: "0", growth: "2 - 3", managed: "Unlimited" },
      { label: "Custom Copywriting & Templates", starter: false, growth: "Templates only", managed: "Full copywriting" },
    ],
  },
  {
    category: "Support & Strategy",
    rows: [
      { label: "Support Channel", starter: "Email", growth: "Priority WhatsApp Group", managed: "Dedicated Manager + WhatsApp" },
      { label: "Strategy Consultations", starter: "Onboarding call", growth: "1x onboarding", managed: "Monthly 1-on-1 deep dives" },
      { label: "Template Approval Fast-Track", starter: false, growth: true, managed: true },
    ],
  },
];

const PRICING_FAQS = [
  {
    q: "Why is the price ₹2,999/month flat after the first month?",
    a: "We believe in transparent pricing. We do not charge per-agent fees or add markups to your messages. Whether you choose Growth or Managed, once the initial custom setup and onboarding phase is complete, your subscription reverts to the flat platform fee of ₹2,999/month per WhatsApp Business API number.",
  },
  {
    q: "What are Meta's conversation charges?",
    a: "Meta charges for conversations based on categories: Utility, Marketing, Authentication, and Service. These charges are paid directly to Meta via your payment method linked in your Meta Business Manager. WaCRM charges 0% markup on these fees.",
  },
  {
    q: "What is the difference between Growth and Managed?",
    a: "With Growth, our team does the initial heavy lifting: we connect your number, build your AI chatbot, set up 2-3 core automations, and hand it over to you with training. With Managed, we act as your outsourced WhatsApp operations team. We continuously update your AI's knowledge base, write new campaign copy, submit templates for approval, and optimize your flows monthly.",
  },
  {
    q: "Can I upgrade or downgrade my plan?",
    a: "Absolutely. You can start with Starter (DIY) and upgrade to Growth or Managed at any time if you decide you want our team to build or manage your automations. Since there are no lock-in contracts, you can also downgrade back to the Starter plan.",
  },
  {
    q: "Can I use my existing WhatsApp number?",
    a: "Yes. You can migrate an existing number to the official WhatsApp Business Cloud API. Note that once migrated, the number can no longer be used on the standard WhatsApp mobile app, but you will manage all chats through WaCRM's Shared Team Inbox.",
  },
];

export default function PricingPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  return (
    <div className="space-y-24 py-12 md:py-20 px-4 max-w-7xl mx-auto overflow-x-hidden">
      {/* --- HEADER --- */}
      <section className="text-center max-w-3xl mx-auto space-y-6">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
          One platform. <span className="text-blue-500">Three ways to get started.</span>
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
          After the first month, every plan is <span className="text-foreground font-semibold">₹2,999/WABA/month — flat</span>. The difference is how much help you get on day one. You choose your level of support.
        </p>
      </section>

      {/* --- PRICING CARDS --- */}
      <section className="grid md:grid-cols-3 gap-8 items-stretch">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-3xl border p-8 flex flex-col justify-between relative transition-all duration-350 ${
              plan.recommended
                ? "border-blue-500 bg-blue-950/10 shadow-[0_0_30px_rgba(37,99,235,0.15)] md:-translate-y-4"
                : "border-card bg-card/10 hover:border-border"
            }`}
          >
            {plan.recommended && (
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-1 text-xs font-semibold text-foreground shadow-md">
                Most Popular
              </span>
            )}

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{plan.tagline}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-extrabold text-foreground">{plan.monthlyPrice}</span>
                  <span className="text-xs text-muted-foreground font-medium">{plan.billingCycle}</span>
                </div>
                {plan.setupPrice !== "₹0" && (
                  <p className="text-[11px] text-muted-foreground">
                    Includes setup fee ({plan.setupPrice} one-time)
                  </p>
                )}
                {plan.afterPrice && (
                  <p className="text-xs text-blue-400 font-medium">{plan.afterPrice}</p>
                )}
              </div>

              <div className="border-t border-card" />

              <ul className="space-y-3.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-xs text-foreground leading-relaxed">
                    <Check className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-card/40">
              <Link
                href={plan.ctaLink}
                className={`w-full text-center font-semibold py-3.5 rounded-xl transition-all block text-sm ${
                  plan.recommended
                    ? "bg-blue-600 hover:bg-blue-500 text-foreground shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                    : "border border-border hover:border-border text-foreground hover:text-foreground hover:bg-card/70"
                }`}
              >
                {plan.ctaText}
              </Link>
            </div>
          </div>
        ))}
      </section>

      {/* --- COMPARISON MATRIX --- */}
      <section className="space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Compare Plans</h2>
          <p className="text-muted-foreground text-xs sm:text-sm">Detailed breakdown of features and support levels.</p>
        </div>

        <div className="rounded-2xl border border-card bg-muted/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-card text-xs font-semibold text-muted-foreground">
                  <th className="p-5 w-2/5">Features & Services</th>
                  <th className="p-5 text-center w-1/5">Starter</th>
                  <th className="p-5 text-center w-1/5">Growth</th>
                  <th className="p-5 text-center w-1/5">Managed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60">
                {MATRIX_CATEGORIES.map((cat) => (
                  <tr key={cat.category} className="bg-card/10">
                    <td colSpan={4} className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {cat.category}
                    </td>
                  </tr>
                ))}
                {MATRIX_CATEGORIES.flatMap((cat) =>
                  cat.rows.map((row) => (
                    <tr key={row.label} className="hover:bg-card/20 text-xs sm:text-sm">
                      <td className="p-5 text-foreground font-medium">{row.label}</td>
                      <td className="p-5 text-center text-muted-foreground">
                        {typeof row.starter === "boolean" ? (
                          row.starter ? <Check className="h-4 w-4 text-blue-500 mx-auto" /> : <X className="h-4 w-4 text-muted-foreground mx-auto" />
                        ) : (
                          row.starter
                        )}
                      </td>
                      <td className="p-5 text-center text-muted-foreground">
                        {typeof row.growth === "boolean" ? (
                          row.growth ? <Check className="h-4 w-4 text-blue-500 mx-auto" /> : <X className="h-4 w-4 text-muted-foreground mx-auto" />
                        ) : (
                          row.growth
                        )}
                      </td>
                      <td className="p-5 text-center text-muted-foreground">
                        {typeof row.managed === "boolean" ? (
                          row.managed ? <Check className="h-4 w-4 text-blue-500 mx-auto" /> : <X className="h-4 w-4 text-muted-foreground mx-auto" />
                        ) : (
                          row.managed
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* --- FAQS --- */}
      <section className="max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <HelpCircle className="h-8 w-8 text-blue-500 mx-auto" />
          <h2 className="text-3xl font-bold text-foreground">Pricing FAQs</h2>
        </div>

        <div className="space-y-4">
          {PRICING_FAQS.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div
                key={faq.q}
                className="rounded-xl border border-card bg-card/15 overflow-hidden transition-all duration-200"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between p-5 text-left font-semibold text-foreground hover:text-foreground hover:bg-card/30 transition-all"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180 text-blue-400" : ""}`} />
                </button>
                <div
                  className={`transition-all duration-200 ease-in-out ${
                    isOpen ? "max-h-60 border-t border-card/50 p-5" : "max-h-0 overflow-hidden"
                  }`}
                >
                  <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
