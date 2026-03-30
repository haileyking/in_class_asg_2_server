import { Request, Response } from "express";
import { db } from "../db";

export const startGame = async (req: Request, res: Response) => {
  const { userId } = req.body;

  // remove any existing active game
  await db.query(
    "DELETE FROM game_states WHERE user_id = ? AND status = 'active'",
    [userId]
  );

  const deck = shuffle(createDeck());

  const playerCards = deck.slice(0, 26);
  const computerCards = deck.slice(26);

  await db.query(
    "INSERT INTO game_states (user_id, player_cards, computer_cards, rounds, status) VALUES (?, ?, ?, 0, 'active')",
    [userId, JSON.stringify(playerCards), JSON.stringify(computerCards)]
  );

  res.json({ message: "Game started" });
};

const createDeck = (): number[] => {
  return Array.from({ length: 52 }, (_, i) => i);
};

const shuffle = (deck: number[]): number[] => {
  return deck.sort(() => Math.random() - 0.5);
};

export const playRound = async (req: Request, res: Response) => {
  const { userId } = req.body;

  const [rows]: any = await db.query(
    "SELECT * FROM game_states WHERE user_id = ? AND status = 'active'",
    [userId]
  );

  const game = rows[0];

  if (!game) {
    return res.status(400).json({ message: "No active game" });
  }

  let playerCards: number[] = JSON.parse(game.player_cards);
  let computerCards: number[] = JSON.parse(game.computer_cards);

  // ✅ STOP if game already over
  if (playerCards.length === 0 || computerCards.length === 0) {
    const winner = playerCards.length === 0 ? "computer" : "player";

    return res.json({
      playerCard: null,
      computerCard: null,
      result: winner,
      rounds: game.rounds,
      playerCount: playerCards.length,
      computerCount: computerCards.length,
      gameOver: true,
      winner,
    });
  }

const getValue = (c: number) => (c % 13) + 2;

  let pile: number[] = [];

  let playerCard = playerCards.shift()!;
  let computerCard = computerCards.shift()!;

  pile.push(playerCard, computerCard);

  let war = false;

  // WAR loop
  while (getValue(playerCard) === getValue(computerCard)) {
    war = true;

    // ✅ FIX: handle not enough cards for war → END GAME
    if (playerCards.length < 4 || computerCards.length < 4) {
      const winner = playerCards.length < 4 ? "computer" : "player";

      const rounds = game.rounds + 1;

      await db.query(
        `INSERT INTO games (user_id, rounds, result, created_at)
         VALUES (?, ?, ?, NOW())`,
        [userId, rounds, winner === "player" ? "win" : "loss"]
      );

      await db.query(
        "UPDATE game_states SET status = 'finished' WHERE id = ?",
        [game.id]
      );

      return res.json({
        playerCard,
        computerCard,
        result: winner === "player" ? "war-player" : "war-computer",
        rounds,
        playerCount: playerCards.length,
        computerCount: computerCards.length,
        gameOver: true,
        winner,
      });
    }

    // 3 face-down
    for (let i = 0; i < 3; i++) {
      pile.push(playerCards.shift()!, computerCards.shift()!);
    }

    // 1 face-up
    playerCard = playerCards.shift()!;
    computerCard = computerCards.shift()!;

    pile.push(playerCard, computerCard);
  }

  const playerValue = getValue(playerCard);
  const computerValue = getValue(computerCard);

  let result = "";

  if (playerValue > computerValue) {
    playerCards.push(...pile);
    result = war ? "war-player" : "player";
  } else {
    computerCards.push(...pile);
    result = war ? "war-computer" : "computer";
  }

  const rounds = game.rounds + 1;

  // ✅ UPDATE game state
  await db.query(
    "UPDATE game_states SET player_cards=?, computer_cards=?, rounds=? WHERE id=?",
    [JSON.stringify(playerCards), JSON.stringify(computerCards), rounds, game.id]
  );

  // ✅ FIX: proper game end condition
  const gameOver =
    playerCards.length === 0 || computerCards.length === 0;

  let winner: "player" | "computer" | null = null;

  if (gameOver) {
    winner = playerCards.length === 0 ? "computer" : "player";

    await db.query(
      `INSERT INTO games (user_id, rounds, result, created_at)
       VALUES (?, ?, ?, NOW())`,
      [userId, rounds, winner === "player" ? "win" : "loss"]
    );

    await db.query(
      "UPDATE game_states SET status = 'finished' WHERE id = ?",
      [game.id]
    );
  }

  res.json({
    playerCard,
    computerCard,
    result,
    rounds,
    playerCount: playerCards.length,
    computerCount: computerCards.length,
    gameOver,
    winner,
  });
};

export const getGames = async (req: Request, res: Response) => {
  const { userId } = req.params;

  const [rows]: any = await db.query(
    `SELECT 
        id,
        rounds,
        result,
        created_at AS finishedAt
     FROM games 
     WHERE user_id = ? 
     ORDER BY created_at DESC`,
    [userId]
  );

  res.json(rows);
};