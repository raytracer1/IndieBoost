import Link from "next/link";

export default function LandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 py-20 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight mb-4">
          Get Your First Users as an{" "}
          <span className="text-indigo-600">Indie Hacker</span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
          AI-powered growth agents handle SEO, Reddit, Twitter, and Newsletter
          promotion — starting at just $5 per campaign. Transparent ROI tracking
          on every channel.
        </p>
        <Link
          href="/create"
          className="inline-block bg-indigo-600 text-white text-lg font-semibold px-8 py-4 rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
        >
          Start Campaign
        </Link>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-10">
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              step: "1",
              title: "Submit Your Product",
              desc: "Enter your SaaS URL and set a small budget ($5–$100). We'll automatically detect your product details.",
            },
            {
              step: "2",
              title: "AI Agents Execute",
              desc: "Our AI agents run growth campaigns across SEO, Reddit, Twitter, and newsletters — optimized for your goal.",
            },
            {
              step: "3",
              title: "Track ROI",
              desc: "See exactly where your traffic and signups come from. Real-time dashboard with per-agent attribution.",
            },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-4">
                {item.step}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-sm text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Agents */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-10">
          AI Growth Agents
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: "SEO Agent", desc: "Organic search traffic", color: "text-green-600 bg-green-50" },
            { name: "Reddit Agent", desc: "Community engagement", color: "text-orange-600 bg-orange-50" },
            { name: "X Agent", desc: "Social media buzz", color: "text-blue-600 bg-blue-50" },
            { name: "Newsletter Agent", desc: "Email outreach", color: "text-purple-600 bg-purple-50" },
          ].map((agent) => (
            <div key={agent.name} className={`rounded-xl p-5 text-center ${agent.color}`}>
              <h3 className="font-semibold">{agent.name}</h3>
              <p className="text-sm opacity-75 mt-1">{agent.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="bg-indigo-600 rounded-2xl p-10 text-white">
          <h2 className="text-2xl font-bold mb-3">Ready to Grow Your SaaS?</h2>
          <p className="text-indigo-200 mb-6">
            Your first campaign starts at just $5. No commitments, no complexity.
          </p>
          <Link
            href="/create"
            className="inline-block bg-white text-indigo-600 font-semibold px-8 py-3 rounded-xl hover:bg-indigo-50 transition"
          >
            Start Your First Campaign
          </Link>
        </div>
      </section>
    </div>
  );
}
