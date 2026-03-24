import { Request, Response } from "express";
import { db } from "../db";
import bcrypt from "bcrypt";

export const register = async (req: Request, res: Response) => {
  const { username, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  await db.query(
    "INSERT INTO users (username, password, created_at) VALUES (?, ?, NOW())",
    [username, hashedPassword]
  );

  res.json({ message: "User registered" });
};

export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;

  const [rows]: any = await db.query(
    "SELECT * FROM users WHERE username = ?",
    [username]
  );

  const user = rows[0];

  if (!user) {
    return res.status(400).json({ message: "User not found" });
  }

  const valid = await bcrypt.compare(password, user.password);

  if (!valid) {
    return res.status(400).json({ message: "Invalid password" });
  }

  res.json({ message: "Login successful", userId: user.id });
};