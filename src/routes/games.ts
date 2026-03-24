import { Router } from "express";
import { startGame, playRound, getGames } from "../controllers/gameController";

const router = Router();

router.post("/start", startGame);
router.post("/play", playRound);
router.get("/:userId", getGames);

export default router;