import express from "express";
import cors from "cors";
import { logger } from "./utils/logger";
import authRoutes from "./routes/auth";
import gameRoutes from "./routes/games";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/auth", authRoutes);
app.use("/games", gameRoutes);

app.get("/", (req, res) => {
  res.send("Server running");
});

app.listen(3000, () => {
  logger.info("Server running on port 3000");
});