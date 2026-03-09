import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import EntryForm from "../EntryForm";

function renderEntryForm(overrides = {}) {
  const props = {
    bankrolls: [{ _id: "b1", name: "Main", currency: "USD" }],
    onSubmit: vi.fn().mockResolvedValue(undefined),
    onCancel: vi.fn(),
    gameOptions: ["NLH", "PLO"],
    stakeOptions: ["1/3", "2/5"],
    locationOptions: ["Commerce", "Bike"],
    defaultGame: "NLH",
    defaultStake: "1/3",
    defaultLocation: "Commerce",
    ...overrides,
  };

  const utils = render(<EntryForm {...props} />);
  return { ...utils, props };
}

describe("EntryForm", () => {
  it("submits the correct payload for a cash session", async () => {
    const { props } = renderEntryForm();

    await userEvent.clear(screen.getByLabelText(/buy-in/i));
    await userEvent.type(screen.getByLabelText(/buy-in/i), "200");

    await userEvent.clear(screen.getByLabelText(/cash-out/i));
    await userEvent.type(screen.getByLabelText(/cash-out/i), "350");

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(props.onSubmit).toHaveBeenCalledTimes(1);

    const payload = props.onSubmit.mock.calls[0][0];

    expect(payload).toMatchObject({
      bankrollId: "b1",
      type: "CASH",
      game: "NLH",
      stakes: "1/3",
      location: "Commerce",
      buyIn: 200,
      cashOut: 350,
    });

    expect(payload.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("shows an error and does not submit when cash stake is missing", async () => {
  const { props, container } = renderEntryForm({
    defaultStake: "",
  });

  await userEvent.selectOptions(screen.getByLabelText(/stake/i), "");

  const form = container.querySelector("form");
  fireEvent.submit(form);

  expect(props.onSubmit).not.toHaveBeenCalled();
  expect(
    await screen.findByText("Stake is required for cash sessions.")
  ).toBeInTheDocument();
});

  it("submits the correct payload for a tourney session", async () => {
    const { props } = renderEntryForm({
      defaultStake: "",
    });

    await userEvent.selectOptions(screen.getByLabelText(/^type/i), "TOURNEY");

    await userEvent.selectOptions(screen.getByLabelText(/game/i), "PLO");
    await userEvent.selectOptions(screen.getByLabelText(/location/i), "Bike");

    await userEvent.clear(screen.getByLabelText(/buy-in/i));
    await userEvent.type(screen.getByLabelText(/buy-in/i), "120");

    await userEvent.clear(screen.getByLabelText(/fee/i));
    await userEvent.type(screen.getByLabelText(/fee/i), "20");

    await userEvent.clear(screen.getByLabelText(/winnings/i));
    await userEvent.type(screen.getByLabelText(/winnings/i), "500");

    await userEvent.clear(screen.getByLabelText(/rebuys/i));
    await userEvent.type(screen.getByLabelText(/rebuys/i), "50");

    await userEvent.clear(screen.getByLabelText(/add-ons/i));
    await userEvent.type(screen.getByLabelText(/add-ons/i), "30");

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(props.onSubmit).toHaveBeenCalledTimes(1);

    const payload = props.onSubmit.mock.calls[0][0];

    expect(payload).toMatchObject({
      bankrollId: "b1",
      type: "TOURNEY",
      game: "PLO",
      location: "Bike",
      buyIn: 120,
      fee: 20,
      winnings: 500,
      rebuys: 50,
      addons: 30,
    });

    expect(payload).not.toHaveProperty("cashOut");
    expect(payload.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("shows an error when end time is before start time", async () => {
    const { props } = renderEntryForm();

    await userEvent.type(
      screen.getByLabelText(/start time/i),
      "2026-03-01T12:00"
    );
    await userEvent.type(
      screen.getByLabelText(/end time/i),
      "2026-03-01T11:00"
    );

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(props.onSubmit).not.toHaveBeenCalled();
    expect(
      await screen.findByText("End time must be after start time.")
    ).toBeInTheDocument();
  });

  it("calls onCancel when cancel is clicked", async () => {
    const { props } = renderEntryForm();

    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(props.onCancel).toHaveBeenCalledTimes(1);
  });

  it("hides timer controls in edit mode and pre-fills initial values", () => {
    renderEntryForm({
      mode: "edit",
      initialValues: {
        _id: "e1",
        bankrollId: "b1",
        type: "CASH",
        date: "2026-03-01T00:00:00.000Z",
        game: "NLH",
        stakes: "2/5",
        location: "Bike",
        notes: "Good session",
        startTime: "2026-03-01T18:00:00.000Z",
        endTime: "2026-03-01T20:30:00.000Z",
        buyIn: 300,
        cashOut: 475,
        durationMinutes: 150,
      },
    });

    expect(
      screen.queryByRole("button", { name: /start session/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^break$/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /end session/i })
    ).not.toBeInTheDocument();

    expect(screen.getByLabelText(/game/i)).toHaveValue("NLH");
    expect(screen.getByLabelText(/stake/i)).toHaveValue("2/5");
    expect(screen.getByLabelText(/location/i)).toHaveValue("Bike");
    expect(screen.getByLabelText(/buy-in/i)).toHaveValue(300);
    expect(screen.getByLabelText(/cash-out/i)).toHaveValue(475);
    expect(screen.getByLabelText(/notes/i)).toHaveValue("Good session");
  });
});