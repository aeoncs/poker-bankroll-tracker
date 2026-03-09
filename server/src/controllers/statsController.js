import mongoose from "mongoose";
import { Entry } from "../models/Entry.js";
import { User } from "../models/User.js";

function buildDateFilter(start, end) {
  if (!start && !end) return null;
  const f = {};
  if (start) f.$gte = new Date(String(start));
  if (end) f.$lte = new Date(String(end));
  return f;
}

export async function getSummary(req, res, next) {
  try {
    const bankrollId = String(req.query.bankrollId || "");
    if (!bankrollId) return res.status(400).json({ message: "bankrollId is required" });

    const { start, end } = req.query;

    const user = await User.findById(req.user.id).select("bankrolls");
    if (!user) return res.status(404).json({ message: "User not found" });

    const bankroll = user.bankrolls.id(bankrollId);
    if (!bankroll) return res.status(400).json({ message: "Invalid bankrollId" });

    const startingBankroll = bankroll.startingBankroll;
    const currency = bankroll.currency;
    const bankrollName = bankroll.name;

    const match = {
      userId: new mongoose.Types.ObjectId(req.user.id),
      bankrollId: new mongoose.Types.ObjectId(bankrollId),
    };

    const dateFilter = buildDateFilter(start, end);
    if (dateFilter) match.date = dateFilter;

    const agg = await Entry.aggregate([
  { $match: match },
  {
    $addFields: {
      profit: {
        $cond: [
          { $eq: ["$type", "CASH"] },
          { $subtract: ["$cashOut", "$buyIn"] },
          {
            $subtract: [
              "$winnings",
              { $add: ["$buyIn", "$fee", "$rebuys", "$addons"] },
            ],
          },
        ],
      },
      tourneyCost: { $add: ["$buyIn", "$fee", "$rebuys", "$addons"] },


      durationMinutesSafe: { $ifNull: ["$durationMinutes", 0] },
    },
  },
  {
    $group: {
      _id: null,

      totalProfit: { $sum: "$profit" },
      count: { $sum: 1 },

 
      totalMinutes: { $sum: "$durationMinutesSafe" },
      winCount: { $sum: { $cond: [{ $gt: ["$profit", 0] }, 1, 0] } },

      cashProfit: { $sum: { $cond: [{ $eq: ["$type", "CASH"] }, "$profit", 0] } },
      cashMinutes: { $sum: { $cond: [{ $eq: ["$type", "CASH"] }, "$durationMinutesSafe", 0] } },
      cashCount: { $sum: { $cond: [{ $eq: ["$type", "CASH"] }, 1, 0] } },

      tourneyProfit: { $sum: { $cond: [{ $eq: ["$type", "TOURNEY"] }, "$profit", 0] } },
      tourneyCostSum: { $sum: { $cond: [{ $eq: ["$type", "TOURNEY"] }, "$tourneyCost", 0] } },
      tourneyCount: { $sum: { $cond: [{ $eq: ["$type", "TOURNEY"] }, 1, 0] } },
    },
  },
]);

const row = agg[0] || {
  totalProfit: 0,
  count: 0,

  totalMinutes: 0,
  winCount: 0,

  cashProfit: 0,
  cashMinutes: 0,
  cashCount: 0,

  tourneyProfit: 0,
  tourneyCostSum: 0,
  tourneyCount: 0,
};

const bankrollTotal = startingBankroll + row.totalProfit;


const cashHours = row.cashMinutes / 60;
const cashHourly = cashHours > 0 ? row.cashProfit / cashHours : null;


const tourneyROI = row.tourneyCostSum > 0 ? row.tourneyProfit / row.tourneyCostSum : null;


const totalHours = row.totalMinutes / 60;
const dollarsPerSession = row.count > 0 ? row.totalProfit / row.count : null;
const winPct = row.count > 0 ? row.winCount / row.count : null;

res.json({
  bankrollId,
  bankrollName,
  currency,
  startingBankroll,
  bankroll: bankrollTotal,
  totalProfit: row.totalProfit,


  totals: {
    minutes: row.totalMinutes,
    hours: totalHours,
    sessions: row.count,
    wins: row.winCount,
    winPct,
    dollarsPerSession,
  },

  counts: { entries: row.count, cash: row.cashCount, tourney: row.tourneyCount },
  cash: { profit: row.cashProfit, hours: cashHours, hourly: cashHourly },
  tourney: { profit: row.tourneyProfit, cost: row.tourneyCostSum, roi: tourneyROI },
});
  } catch (err) {
    next(err);
  }
}

export async function getTimeseries(req, res, next) {
  try {
    const bankrollId = String(req.query.bankrollId || "");
    if (!bankrollId) return res.status(400).json({ message: "bankrollId is required" });

    const bucket = String(req.query.bucket || "day").toLowerCase();

    const unit =
      bucket === "year"
        ? "year"
        : bucket === "month"
        ? "month"
        : bucket === "week"
        ? "week"
        : "day";

    const { start, end } = req.query;

    const match = {
      userId: new mongoose.Types.ObjectId(req.user.id),
      bankrollId: new mongoose.Types.ObjectId(bankrollId),
    };

    const dateFilter = buildDateFilter(start, end);
    if (dateFilter) match.date = dateFilter;

    const points = await Entry.aggregate([
      { $match: match },
      {
        $addFields: {
          profit: {
            $cond: [
              { $eq: ["$type", "CASH"] },
              { $subtract: ["$cashOut", "$buyIn"] },
              {
                $subtract: [
                  "$winnings",
                  { $add: ["$buyIn", "$fee", "$rebuys", "$addons"] },
                ],
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: { $dateTrunc: { date: "$date", unit } },
          profit: { $sum: "$profit" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    let cumulative = 0;
    const series = points.map((p) => {
      cumulative += p.profit;
      return { date: p._id, profit: p.profit, cumulative };
    });

    res.json({ bankrollId, bucket: unit, series });
  } catch (err) {
    next(err);
  }
}