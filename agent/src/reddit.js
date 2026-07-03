// Reddit Agent — simulates community engagement and referral traffic
// Medium volume, medium conversion rate

function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

async function run({ executionId, campaignId, productUrl, productName, budget }) {
  const rand = seededRandom(executionId * 1000 + campaignId + 100);
  const budgetDollars = budget || 10;

  const visitsPerDollar = 20 + rand() * 15; // 20-35 visits per dollar
  const visits = Math.round(budgetDollars * visitsPerDollar);

  const signupRate = 0.06 + rand() * 0.04; // 6-10%
  const signups = Math.round(visits * signupRate);

  const conversionRate = 0.15 + rand() * 0.10; // 15-25%
  const conversions = Math.round(signups * conversionRate);

  const subreddits = ['SaaS', 'SideProject', 'indiehackers', 'Entrepreneur', 'startups'];
  const picked = subreddits.slice(0, Math.ceil(2 + rand() * 3));
  const upvotes = Math.round(visits * (0.2 + rand() * 0.3));
  const comments = Math.round(upvotes * (0.1 + rand() * 0.2));

  return {
    visits,
    signups,
    conversions,
    cost: budget,
    notes: `Reddit campaign: Posted in r/${picked.join(', r/')}. Gained ${upvotes} upvotes and ${comments} comments. Generated ${visits} referral visits.`,
  };
}

module.exports = { run };
