const supabase = require("../supabase");

function generateMines(total, count) {
  const positions = new Set();
  while (positions.size < count) {
    positions.add(Math.floor(Math.random() * total));
  }
  return [...positions];
}

exports.startGame = async (req, res) => {
  try {
    const { userId, betAmount, bombs, gridSize } = req.body;
    if (!userId || !betAmount || !bombs || !gridSize)
      return res.json({ success: false, error: "Missing fields" });
    if (betAmount < 10) return res.json({ success: false, error: "Min bet ₹10" });

    const { data: user } = await supabase.from("users").select("balance").eq("id", userId).single();
    if (!user || user.balance < betAmount)
      return res.json({ success: false, error: "Insufficient balance" });

    await supabase.from("users").update({ balance: user.balance - betAmount }).eq("id", userId);

    const totalCells = gridSize * gridSize;
    const minePositions = generateMines(totalCells, bombs);

    const { data: game } = await supabase.from("mines_games").insert([{
      user_id: userId, bet_amount: betAmount, bombs,
      grid_size: gridSize, mine_positions: minePositions,
      status: "active", revealed: [], multiplier: 1.00
    }]).select().single();

    return res.json({ success: true, gameId: game.id });
  } catch (err) { return res.json({ success: false, error: err.message }); }
};

exports.revealCell = async (req, res) => {
  try {
    const { gameId, cellIndex, userId } = req.body;
    const { data: game } = await supabase.from("mines_games").select("*").eq("id", gameId).single();
    if (!game || game.status !== "active")
      return res.json({ success: false, error: "Game not active" });

    const isMine = game.mine_positions.includes(cellIndex);

    if (isMine) {
      await supabase.from("mines_games").update({ status: "lost" }).eq("id", gameId);
      return res.json({ success: true, isMine: true, minePositions: game.mine_positions });
    }

    const newRevealed = [...game.revealed, cellIndex];
    const totalCells = game.grid_size * game.grid_size;
    const safeCells = totalCells - game.bombs;
    let multi = 1;
    for (let i = 0; i < newRevealed.length; i++) {
      multi *= (safeCells - i) / (totalCells - i);
    }
    const multiplier = parseFloat((0.97 / multi).toFixed(2));

    await supabase.from("mines_games").update({ revealed: newRevealed, multiplier }).eq("id", gameId);
    return res.json({ success: true, isMine: false, multiplier, revealed: newRevealed });
  } catch (err) { return res.json({ success: false, error: err.message }); }
};

exports.cashout = async (req, res) => {
  try {
    const { gameId, userId } = req.body;
    const { data: game } = await supabase.from("mines_games").select("*").eq("id", gameId).single();
    if (!game || game.status !== "active")
      return res.json({ success: false, error: "Game not active" });
    if (game.revealed.length === 0)
      return res.json({ success: false, error: "Reveal at least one cell" });

    const winAmount = parseFloat((game.bet_amount * game.multiplier).toFixed(2));
    await supabase.from("mines_games").update({ status: "won", win_amount: winAmount }).eq("id", gameId);

    const { data: user } = await supabase.from("users").select("balance").eq("id", userId).single();
    await supabase.from("users").update({ balance: (user?.balance || 0) + winAmount }).eq("id", userId);

    return res.json({ success: true, winAmount, multiplier: game.multiplier });
  } catch (err) { return res.json({ success: false, error: err.message }); }
};
