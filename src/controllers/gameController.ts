import { Request, Response } from "express";
import { db } from "../db";

export const startGame = async (req: Request, res: Response) => {
  const { userId } = req.body;

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

  let playerCards = JSON.parse(game.player_cards);
  let computerCards = JSON.parse(game.computer_cards);

  const playerCard = playerCards.shift();
  const computerCard = computerCards.shift();

  let result = "";

  if (playerCard > computerCard) {
    playerCards.push(playerCard, computerCard);
    result = "player";
  } else if (computerCard > playerCard) {
    computerCards.push(playerCard, computerCard);
    result = "computer";
  } else {
    // WAR (simplified)
    result = "war";
  }

  let rounds = game.rounds + 1;

  let status = "active";

  if (playerCards.length === 52) {
    status = "finished";

    await db.query(
      "INSERT INTO games (user_id, rounds, result, created_at) VALUES (?, ?, 'win', NOW())",
      [userId, rounds]
    );
  }

  if (computerCards.length === 52) {
    status = "finished";

    await db.query(
      "INSERT INTO games (user_id, rounds, result, created_at) VALUES (?, ?, 'loss', NOW())",
      [userId, rounds]
    );
  }

  await db.query(
    "UPDATE game_states SET player_cards=?, computer_cards=?, rounds=?, status=? WHERE id=?",
    [JSON.stringify(playerCards), JSON.stringify(computerCards), rounds, status, game.id]
  );

  res.json({
    playerCard,
    computerCard,
    result,
    rounds,
    playerCount: playerCards.length,
    computerCount: computerCards.length
  });
};

export const getGames = async (req: Request, res: Response) => {
  const { userId } = req.params;

  const [rows] = await db.query(
    "SELECT * FROM games WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  );

  res.json(rows);
};