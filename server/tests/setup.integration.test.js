import request from "supertest";
import mongoose from "mongoose";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createApp } from "../src/app.js";

describe("Setup integration", () => {
  const app = createApp();
  const agent = request.agent(app);

  beforeAll(async () => {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    expect(uri, "MONGO_URI (or MONGODB_URI) must be set for tests").toBeTruthy();
    await mongoose.connect(uri);
  }, 20000);

  afterAll(async () => {
    try {
      await mongoose.connection.dropDatabase();
    } catch {}
    await mongoose.disconnect();
  }, 20000);

  it("new user starts not onboarded; completeSetup sets onboarding + defaults", async () => {
    const email = `test_${Date.now()}@example.com`;
    const password = "Password123!";

    // Register -> cookie set in agent
    await agent.post("/api/auth/register").send({ email, password }).expect(201);

    // Me should show onboardingCompleted false
    const me1 = await agent.get("/api/auth/me").expect(200);
    expect(me1.body?.user?.onboardingCompleted).toBe(false);

    // Complete setup
    const payload = {
      bankroll: { name: "Main", currency: "USD", startingBankroll: 1000 },
      theme: "dark",
      games: ["No Limit Holdem", "Pot Limit Omaha"],
      stakes: ["1/2", "2/5"],
      locations: ["Bellagio"],
    };

    await agent.post("/api/users/setup").send(payload).expect(201);

    // Me should now show onboardingCompleted true + bankroll/defaults set
    const me2 = await agent.get("/api/auth/me").expect(200);
    const u = me2.body?.user;

    expect(u?.onboardingCompleted).toBe(true);
    expect(Array.isArray(u?.bankrolls)).toBe(true);
    expect(u.bankrolls.length).toBe(1);

    // defaultBankrollId should be set to the only bankroll
    expect(u.defaultBankrollId).toBeTruthy();

    // defaults should be set to first list entries (based on your controller)
    expect(u.defaultGame).toBe("No Limit Holdem");
    expect(u.defaultStake).toBe("1/2");
    expect(u.defaultLocation).toBe("Bellagio");
  });

  it("setup rejects duplicate bankroll name for same user", async () => {
    const email = `test_${Date.now()}@example.com`;
    const password = "Password123!";

    await agent.post("/api/auth/register").send({ email, password }).expect(201);

    const payload = {
      bankroll: { name: "Main", currency: "USD", startingBankroll: 1000 },
      theme: "dark",
      games: [],
      stakes: [],
      locations: [],
    };

    await agent.post("/api/users/setup").send(payload).expect(201);

    // attempt setup again with same bankroll name should 409
    await agent.post("/api/users/setup").send(payload).expect(409);
  });
});