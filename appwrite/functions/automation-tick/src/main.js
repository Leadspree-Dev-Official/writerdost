/**
 * Writerdost AI — scheduler heartbeat.
 *
 * This is the Appwrite Function that replaces the pg_cron + pg_net job the
 * Supabase schema used to carry. It does one thing: poke the app every few
 * minutes and let the app decide which automations are actually due. One
 * schedule to operate instead of one cron entry per automation.
 *
 * Deploy it with a schedule of `*\/5 * * * *` and these variables:
 *   WRITERDOST_APP_URL      https://your-app.example.com
 *   WRITERDOST_CRON_SECRET  the same value the app has
 *
 * The function can also be executed by hand from the Appwrite console to force
 * a tick without waiting for the schedule.
 */
const tick = async ({ req, res, log, error }) => {
  const appUrl = (process.env.WRITERDOST_APP_URL || "").replace(/\/+$/, "");
  const secret = process.env.WRITERDOST_CRON_SECRET || "";

  if (!appUrl || !secret) {
    error("WRITERDOST_APP_URL and WRITERDOST_CRON_SECRET must both be set.");
    return res.json({ ok: false, error: "Function is not configured." }, 500);
  }

  // A manual execution can ask for the health check instead of a real tick.
  const healthOnly = req?.query?.check === "1" || req?.headers?.["x-writerdost-check"] === "1";
  const endpoint = `${appUrl}/api/automations/tick`;

  try {
    const response = await fetch(endpoint, {
      method: healthOnly ? "GET" : "POST",
      headers: {
        "content-type": "application/json",
        "x-cron-secret": secret,
      },
      body: healthOnly ? undefined : "{}",
    });

    const body = await response.text();

    if (!response.ok) {
      error(`Tick failed with ${response.status}: ${body.slice(0, 500)}`);
      return res.json({ ok: false, status: response.status, body: body.slice(0, 500) }, 502);
    }

    log(`Tick ok: ${body.slice(0, 500)}`);
    return res.text(body, 200, { "content-type": "application/json" });
  } catch (cause) {
    error(`Could not reach ${endpoint}: ${cause?.message || cause}`);
    return res.json({ ok: false, error: "The app could not be reached." }, 502);
  }
};

export default tick;
