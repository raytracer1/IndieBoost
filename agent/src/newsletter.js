// Newsletter Agent — simulates email outreach
// Lowest volume, highest conversion rate (targeted audience)

function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

async function run({ executionId, campaignId, productUrl, productName, budget }) {
  const rand = seededRandom(executionId * 1000 + campaignId + 300);
  const budgetDollars = budget || 10;

  const visitsPerDollar = 8 + rand() * 7; // 8-15 visits per dollar
  const visits = Math.round(budgetDollars * visitsPerDollar);

  const signupRate = 0.08 + rand() * 0.07; // 8-15%
  const signups = Math.round(visits * signupRate);

  const conversionRate = 0.20 + rand() * 0.20; // 20-40%
  const conversions = Math.round(signups * conversionRate);

  const subscribers = Math.round(budgetDollars * (2 + rand() * 6));
  const openRate = Math.round((20 + rand() * 20) * 100) / 100;

  return {
    visits,
    signups,
    conversions,
    cost: budget,
    notes: `Newsletter campaign: Reached ${subscribers} subscribers with targeted emails. ${openRate}% open rate. ${visits} clicks, ${signups} signups.`,
  };
}

module.exports = { run };
