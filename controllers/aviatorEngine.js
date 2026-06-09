const supabase = require("../supabase");

function generateCrashPoint() {
  const r = Math.random();
  if (r < 0.01) return 1.00;
  return Math.max(1.00, parseFloat((0.99 / (1 - r)).toFixed(2)));
}

async function runAviatorLoop() {
  console.log("✈️ AVIATOR ENGINE STARTED");

  while (true) {
    try {
      // 1. Create new round
      const crashPoint = generateCrashPoint();
      const { data: round } = await supabase
        .from("aviator_rounds")
        .insert([{ status: "waiting", crash_point: crashPoint }])
        .select().single();

      console.log(`✈️ New round ${round.id} | Crash: ${crashPoint}x`);

      // 2. Wait 8 seconds (betting phase)
      await sleep(8000);

      // 3. Start flying
      await supabase.from("aviator_rounds")
        .update({ status: "flying", started_at: new Date().toISOString() })
        .eq("id", round.id);

      // 4. Fly until crash
      const startTime = Date.now();
      let currentMulti = 1.00;

      while (currentMulti < crashPoint) {
        await sleep(100);
        const elapsed = (Date.now() - startTime) / 1000;
        currentMulti = parseFloat(Math.pow(Math.E, 0.06 * elapsed).toFixed(2));

        // Auto cashout check
        const { data: bets } = await supabase
          .from("aviator_bets")
          .select("*")
          .eq("round_id", round.id)
          .eq("status", "active")
          .not("auto_cashout", "is", null);

        for (const bet of (bets || [])) {
          if (bet.auto_cashout && currentMulti >= bet.auto_cashout) {
            const winAmount = parseFloat((bet.amount * bet.auto_cashout).toFixed(2));
            await supabase.from("aviator_bets")
              .update({ status: "won", cashout_multiplier: bet.auto_cashout, win_amount: winAmount })
              .eq("id", bet.id);
            const { data: user } = await supabase.from("users").select("balance").eq("id", bet.user_id).single();
            await supabase.from("users")
              .update({ balance: (user?.balance || 0) + winAmount })
              .eq("id", bet.user_id);
          }
        }
      }

      // 5. Crash!
      await supabase.from("aviator_rounds")
        .update({ status: "crashed", crashed_at: new Date().toISOString() })
        .eq("id", round.id);

      // 6. Mark all remaining active bets as lost
      await supabase.from("aviator_bets")
        .update({ status: "lost" })
        .eq("round_id", round.id)
        .eq("status", "active");

      console.log(`💥 Round ${round.id} crashed at ${crashPoint}x`);

      // 7. Wait 3 seconds before next round
      await sleep(3000);

    } catch (err) {
      console.error("Aviator engine error:", err.message);
      await sleep(5000);
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { runAviatorLoop };
