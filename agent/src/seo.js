// SEO Agent — simulates organic search traffic generation
// High volume, low conversion rate

function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

async function run({ executionId, campaignId, productUrl, productName, budget }) {
  const rand = seededRandom(executionId * 1000 + campaignId);
  const budgetDollars = budget || 10;

  // SEO: high impressions, lower signups
  const visitsPerDollar = 30 + rand() * 20; // 30-50 visits per dollar
  const visits = Math.round(budgetDollars * visitsPerDollar);

  const signupRate = 0.03 + rand() * 0.02; // 3-5%
  const signups = Math.round(visits * signupRate);

  const conversionRate = 0.10 + rand() * 0.10; // 10-20%
  const conversions = Math.round(signups * conversionRate);

  const keywordsFound = Math.round(budgetDollars * (2 + rand() * 4)); // 2-6 keywords per dollar
  const blogPosts = Math.max(1, Math.round(budgetDollars * 0.5));

  return {
    visits,
    signups,
    conversions,
    cost: budget,
    notes: `SEO campaign: Found ${keywordsFound} target keywords. Generated ${blogPosts} blog posts. Estimated ${visits} monthly organic visits from search engines.`,
  };
}

module.exports = { run };
