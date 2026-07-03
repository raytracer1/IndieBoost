// IndieBoost Agent Daemon
// Polls backend API for pending executions, runs simulations, submits results.
// Completely independent from backend — no shared code, no direct DB access.

const { getPendingExecutions, completeExecution } = require('./api');

const agents = {
  seo: require('./seo'),
  reddit: require('./reddit'),
  twitter: require('./twitter'),
  newsletter: require('./newsletter'),
};

const POLL_INTERVAL_MS = 3000;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8787';

async function processExecution(execution) {
  const agent = agents[execution.executor_category];
  if (!agent) {
    console.log(`[agent] Unknown category: ${execution.executor_category}, skipping execution ${execution.id}`);
    return;
  }

  console.log(`[agent] Processing execution #${execution.id} (${execution.executor_name}, campaign #${execution.campaign_id})`);

  try {
    const results = await agent.run({
      executionId: execution.id,
      campaignId: execution.campaign_id,
      executorId: execution.executor_id,
      productUrl: execution.product_url,
      productName: execution.product_name,
      budget: execution.budget,
      goal: execution.goal,
    });

    await completeExecution(execution.id, results);
    console.log(`[agent] Execution #${execution.id} completed: ${results.visits} visits, ${results.signups} signups`);
  } catch (err) {
    console.error(`[agent] Error processing execution #${execution.id}:`, err.message);
    // Mark as failed via the API
    try {
      await completeExecution(execution.id, {
        visits: 0,
        signups: 0,
        conversions: 0,
        cost: execution.budget,
        notes: `Error: ${err.message}`,
      });
    } catch (e) {
      console.error(`[agent] Failed to mark execution #${execution.id} as failed:`, e.message);
    }
  }
}

async function poll() {
  try {
    const executions = await getPendingExecutions();
    if (executions.length > 0) {
      console.log(`[agent] Found ${executions.length} pending execution(s)`);
      for (const execution of executions) {
        await processExecution(execution);
      }
    }
  } catch (err) {
    console.error(`[agent] Poll error:`, err.message);
  }
}

async function main() {
  console.log(`[agent] IndieBoost Agent Daemon starting...`);
  console.log(`[agent] Backend: ${BACKEND_URL}`);
  console.log(`[agent] Poll interval: ${POLL_INTERVAL_MS}ms`);

  // Run immediately, then on interval
  await poll();
  setInterval(poll, POLL_INTERVAL_MS);
}

main().catch((err) => {
  console.error('[agent] Fatal error:', err);
  process.exit(1);
});
