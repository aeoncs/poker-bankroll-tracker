import request from "supertest";
import { createApp } from "../app.js";
import { connectTestDb, disconnectTestDb } from "./db.js";

const app = createApp();

beforeAll(async () => {
  await connectTestDb();
});

afterAll(async () => {
  await disconnectTestDb();
});

test("register then /me returns user", async () => {
  const agent = request.agent(app);

  await agent
    .post("/api/auth/register")
    .send({ email: "test@example.com", password: "pass1234" })
    .expect(201);

  const meRes = await agent.get("/api/auth/me").expect(200);
  expect(meRes.body.user.email).toBe("test@example.com");
});