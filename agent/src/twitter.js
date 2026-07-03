// Twitter Agent — simulates social media engagement
// Lower volume, medium conversion (engaged audience)

function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

async function run({ executionId, campaignId, productUrl, productName, budget }) {
  const rand = seededRandom(executionId * 1000 + campaignId + 200);
  const budgetDollars = budget || 10;

  const visitsPerDollar = 15 + rand() * 15; // 15-30 visits per dollar
  const visits = Math.round(budgetDollars * visitsPerDollar);

  const signupRate = 0.05 + rand() * 0.03; // 5-8%
  const signups = Math.round(visits * signupRate);

  const conversionRate = 0.15 + rand() * 0.10; // 15-25%
  const conversions = Math.round(signups * conversionRate);

  const tweets = Math.round(3 + rand() * 5);
  const threads = Math.round(rand() * 2);
  const impressions = Math.round(visits * (15 + rand() * 10));

  return {
    visits,
    signups,
    conversions,
    cost: budget,
    notes: `Twitter campaign: Published ${tweets} tweets and ${threads} threads. ${impressions} total impressions. ${visits} link clicks.`,
  };
}

module.exports = { run };
