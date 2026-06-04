const supabase = require("../supabase");

// ----------------------
// RESULT GENERATOR
// ----------------------
function generateResult() {
  const num = Math.floor(Math.random() * 10);

  const color =
    num === 0 || num === 5
      ? "violet"
      : num % 2 === 0
      ? "red"
      : "green";

  return { num, color };
}


// ----------------------
// SETTLE BETS (MAIN LOGIC)
// ----------------------
async function settleBets(period_id, result, color) {
  console.log("💰 SETTLING BETS FOR:", period_id);

  const { data: bets } = await supabase
    .from("bets")
    .select("*")
    .eq("status", "pending")
    .eq("period_id", period_id);

  if (!bets || bets.length === 0) {
    console.log("❌ No bets found for settlement");
    return;
  }

  for (let bet of bets) {
    let isWin = false;

    // NUMBER BET
    if (bet.type === "number") {
      if (Number(bet.value) === result) {
        isWin = true;
      }
    }

    // COLOR BET
    if (bet.type === "color") {
      if (bet.value === color) {
        isWin = true;
      }
    }

    // UPDATE BET STATUS
    await supabase
      .from("bets")
      .update({
        status: isWin ? "win" : "lose",
      })
      .eq("id", bet.id);

    // IF WIN → ADD BALANCE
    if (isWin) {
      const { data: user } = await supabase
        .from("users")
        .select("*")
        .eq("id", bet.user_id)
        .single();

      if (user) {
        const winAmount = bet.amount * 2; // simple multiplier

        await supabase
          .from("users")
          .update({
            balance: user.balance + winAmount,
          })
          .eq("id", bet.user_id);

        console.log(`🎉 USER WON: ${bet.user_id} +${winAmount}`);
      }
    } else {
      console.log(`❌ USER LOST: ${bet.user_id}`);
    }
  }
}


// ----------------------
// RUN GAME ROUND
// ----------------------
async function runGameRound() {
  const { num, color } = generateResult();
  const period_id = Date.now().toString();

  console.log("🎮 NEW ROUND:", { num, color, period_id });

  // SAVE RESULT
  await supabase.from("game_rounds").insert([
    {
      period_id,
      result: num,
      color,
    },
  ]);

  // SETTLE BETS
  await settleBets(period_id, num, color);
}


// ----------------------
// START LOOP
// ----------------------
function startGameLoop() {
  console.log("🔥 GAME ENGINE STARTED");

  // every 60 sec new round
  setInterval(() => {
    runGameRound();
  }, 60 * 1000);

  // first run instantly
  runGameRound();
}

module.exports = { startGameLoop };
