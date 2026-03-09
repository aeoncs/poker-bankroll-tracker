import request from "supertest";
import mongoose from "mongoose";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createApp } from "../src/app.js";

describe("Auth integration", () => {
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

  it("register -> me returns logged-in user", async () => {
    const email = `test_${Date.now()}@example.com`;
    const password = "Password123!";

    await agent
      .post("/api/auth/register")
      .send({ email, password })
      .expect(201);

    const me = await agent.get("/api/auth/me").expect(200);

    console.log(me.status, me.body);
    expect(me.status).toBe(200);

    expect(me.body?.user?.email).toBe(email.toLowerCase());
    expect(me.body?.user?.passwordHash).toBeUndefined(); // should be stripped
  });

  it("logout -> me returns 401", async () => {
    await agent.post("/api/auth/logout").expect(200);
    await agent.get("/api/auth/me").expect(401);
  });

  it("login works after logout", async () => {
    const email = `test_${Date.now()}@example.com`;
    const password = "Password123!";

    // register
    await agent.post("/api/auth/register").send({ email, password }).expect(201);

    // logout
    await agent.post("/api/auth/logout").expect(200);

    // login
    await agent.post("/api/auth/login").send({ email, password }).expect(200);

    // me
    const me = await agent.get("/api/auth/me").expect(200);
    expect(me.body?.user?.email).toBe(email.toLowerCase());
  });

  it("protected route rejects without auth cookie", async () => {
    // new agent = no cookies
    const anon = request.agent(app);
    await anon.get("/api/users/settings").expect(401);
  });
});