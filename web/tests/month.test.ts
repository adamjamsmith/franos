import { describe, expect, it } from "vitest";
import { isMonth, monthGrid, monthLabel, monthOf, shiftMonth } from "../src/calls/month";

describe("the calls calendar", () => {
  it("lays November 2026 out Monday to Sunday, padded with the days either side", () => {
    const weeks = monthGrid("2026-11");
    expect(weeks).toHaveLength(6);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    // 1 November 2026 is a Sunday, so the first week is Monday 26 October to Sunday 1 November.
    expect(weeks[0][0]).toEqual({ key: "2026-10-26", day: 26, inMonth: false });
    expect(weeks[0][6]).toEqual({ key: "2026-11-01", day: 1, inMonth: true });
    expect(weeks[5][0]).toEqual({ key: "2026-11-30", day: 30, inMonth: true });
    expect(weeks[5][6]).toEqual({ key: "2026-12-06", day: 6, inMonth: false });
    expect(weeks.flat().filter((d) => d.inMonth)).toHaveLength(30);
  });

  it("needs only four weeks for a February that starts on a Monday", () => {
    const weeks = monthGrid("2027-02");
    expect(weeks).toHaveLength(4);
    expect(weeks[0][0].key).toBe("2027-02-01");
    expect(weeks[3][6].key).toBe("2027-02-28");
  });

  it("moves between months, across the year end", () => {
    expect(shiftMonth("2026-11", 1)).toBe("2026-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2027-01", -1)).toBe("2026-12");
    expect(monthLabel("2026-11")).toBe("November 2026");
  });

  it("puts a moment in its UK month, even late on the last evening of summer time", () => {
    expect(monthOf(new Date("2026-11-15T12:00:00Z"))).toBe("2026-11");
    // 23:30 UTC on 30 June is 00:30 on 1 July in the UK.
    expect(monthOf(new Date("2026-06-30T23:30:00Z"))).toBe("2026-07");
  });

  it("only accepts a real month from the address bar", () => {
    expect(isMonth("2026-11")).toBe(true);
    expect(isMonth("2026-13")).toBe(false);
    expect(isMonth("november")).toBe(false);
    expect(isMonth(undefined)).toBe(false);
  });
});
