import request from "supertest";
import { createApp } from "../app.js";
import { connectTestDb, disconnectTestDb } from "./db.js";

const app = createApp();

beforeAll(connectTestDb);
afterAll(disconnectTestDb);

test("setup completes onboarding", async () => {
  const agent = request.agent(app);

  await agent.post("/api/auth/register").send({
    email: "setup@example.com",
    password: "pass1234",
  });

  await agent.post("/api/users/setup").send({
    bankroll: { name: "Main", currency: "USD", startingBankroll: 1000 },
    theme: "dark",
    games: ["No Limit Holdem"],
    stakes: ["2/5"],
    locations: ["Bellagio"],
  }).expect(201);

  const me = await agent.get("/api/auth/me").expect(200);
  expect(me.body.user.onboardingCompleted).toBe(true);
});