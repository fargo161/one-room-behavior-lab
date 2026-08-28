import { describe, expect, it } from "vitest";
import {
  buildEncounterDesignerView,
  buildEncounterPlayerView,
} from "./presentation";
import {
  applyEncounterChoice,
  createInitialEncounterState,
  currentEncounterDialogue,
  currentEncounterEnding,
} from "./runtime";
import { encounterDefinitionSchema } from "./schema";
import { trapstarPaymentEncounter as encounter } from "./trapstarPaymentEncounter";

const choiceId = (roundIndex: number, choiceIndex: number): string =>
  encounter.rounds[roundIndex]!.choices[choiceIndex]!.id;

const play = (choiceIndexes: number[]) => choiceIndexes.reduce(
  (state, index, roundIndex) => applyEncounterChoice(encounter, state, choiceId(roundIndex, index)),
  createInitialEncounterState(encounter),
);

describe("Trapstar disputed-payment encounter", () => {
  it("loads as portable validated data with exactly three rounds and three choices each", () => {
    const serialized = JSON.stringify(encounter);
    const restored = encounterDefinitionSchema.parse(JSON.parse(serialized));

    expect(restored).toEqual(encounter);
    expect(encounter.rounds).toHaveLength(3);
    expect(encounter.rounds.every(({ choices }) => choices.length === 3)).toBe(true);
    expect(serialized).not.toMatch(/className|HTMLElement|callback|function|React/);
  });

  it("starts at Trust 0, Tension 0, round one, and the guarded mood", () => {
    const state = createInitialEncounterState(encounter);

    expect(state).toMatchObject({
      roundIndex: 0,
      trust: 0,
      tension: 0,
      mood: "guarded",
      status: "ACTIVE",
      endingId: null,
      latestEffect: null,
    });
    expect(currentEncounterDialogue(encounter, state).text)
      .toBe("You’re late. We said twelve. You got twelve?");
  });

  it("keeps all nine authored choice effects exact and applies each through bounded state", () => {
    expect(encounter.rounds.map(({ choices }) => choices.map(({ effect }) => effect))).toEqual([
      [{ trust: 1, tension: 0 }, { trust: 0, tension: 1 }, { trust: -1, tension: 2 }],
      [{ trust: 1, tension: -1 }, { trust: 1, tension: 0 }, { trust: -1, tension: 1 }],
      [{ trust: 1, tension: -1 }, { trust: 0, tension: -1 }, { trust: -1, tension: 2 }],
    ]);

    const roundBases = [
      createInitialEncounterState(encounter),
      play([1]),
      play([1, 1]),
    ];

    roundBases.forEach((base, roundIndex) => {
      encounter.rounds[roundIndex]!.choices.forEach((choice) => {
        const next = applyEncounterChoice(encounter, base, choice.id);
        const expectedTrust = Math.min(4, Math.max(-2, base.trust + choice.effect.trust));
        const expectedTension = Math.min(4, Math.max(0, base.tension + choice.effect.tension));
        expect({ trust: next.trust, tension: next.tension }).toEqual({
          trust: expectedTrust,
          tension: expectedTension,
        });
        expect(next.latestEffect?.authored).toEqual(choice.effect);
        expect(next.latestEffect?.applied).toEqual({
          trust: expectedTrust - base.trust,
          tension: expectedTension - base.tension,
        });
      });
    });
  });

  it("selects round-two dialogue in tension, trust, then fallback precedence", () => {
    expect(currentEncounterDialogue(encounter, play([2])).text)
      .toBe("You’re standing in my spot talking to me like that?");
    expect(currentEncounterDialogue(encounter, play([0])).text)
      .toBe("At least you’re saying it straight.");
    expect(currentEncounterDialogue(encounter, play([1])).text)
      .toBe("You came here to tell me what my work is worth?");
  });

  it("selects round-three dialogue in tension, trust, then fallback precedence", () => {
    expect(currentEncounterDialogue(encounter, play([2, 1])).text)
      .toBe("One more wrong word and we’re done.");
    expect(currentEncounterDialogue(encounter, play([0, 0])).text)
      .toBe("All right. What exactly are you offering?");
    expect(currentEncounterDialogue(encounter, play([1, 1])).text)
      .toBe("Give me one reason I should keep working with you.");
  });

  it("derives neutral, guarded, angry, and agreement moods from ordered rules", () => {
    expect(createInitialEncounterState(encounter).mood).toBe("guarded");
    expect(play([0]).mood).toBe("neutral");
    expect(play([2]).mood).toBe("angry");
    expect(play([0, 0]).mood).toBe("agreement");
  });

  it("reaches every exact ending and applies ending mood forces", () => {
    const deal = play([0, 0, 0]);
    const walkAway = play([1, 1, 1]);
    const argument = play([2, 2, 2]);

    expect(currentEncounterEnding(encounter, deal)).toMatchObject({
      outcome: "deal",
      title: "DEAL REACHED",
      text: "Ten now, two next week. Don’t make me chase you.",
    });
    expect(deal.mood).toBe("agreement");

    expect(currentEncounterEnding(encounter, walkAway)).toMatchObject({
      outcome: "walk_away",
      title: "NEGOTIATION ENDED",
      text: "Keep your money. We’re finished after tonight.",
    });

    expect(currentEncounterEnding(encounter, argument)).toMatchObject({
      outcome: "argument",
      title: "CONFLICT ESCALATED",
      text: "Get out. The deal is dead.",
    });
    expect(argument).toMatchObject({ trust: -2, tension: 4, mood: "angry" });
    expect(argument.latestEffect).toMatchObject({
      authored: { trust: -1, tension: 2 },
      applied: { trust: 0, tension: 1 },
    });
  });

  it("exhaustively resolves all 27 choice paths with every ending reachable", () => {
    const counts = { deal: 0, walk_away: 0, argument: 0 };
    for (let first = 0; first < 3; first += 1) {
      for (let second = 0; second < 3; second += 1) {
        for (let third = 0; third < 3; third += 1) {
          const ending = currentEncounterEnding(encounter, play([first, second, third]));
          if (!ending) throw new Error("Three choices must finish the encounter.");
          counts[ending.outcome] += 1;
        }
      }
    }

    expect(counts).toEqual({ deal: 6, walk_away: 15, argument: 6 });
  });

  it("keeps encounter-local state out of the player view and exposes it in Designer View", () => {
    const state = play([0]);
    const player = buildEncounterPlayerView(encounter, state);
    const designer = buildEncounterDesignerView(encounter, state);

    expect(JSON.stringify(player)).not.toMatch(/"(?:trust|tension|latestStateEffect)"\s*:/i);
    expect(designer).toMatchObject({
      trust: 1,
      tension: 0,
      mood: "neutral",
      currentRound: "2 / 3",
      latestStateEffect: "Trust +1 · Tension 0",
    });
  });

  it("restarts to a fresh initial state and rejects out-of-node choices", () => {
    const completed = play([2, 2, 2]);
    expect(createInitialEncounterState(encounter)).toEqual(createInitialEncounterState(encounter));
    expect(() => applyEncounterChoice(encounter, completed, choiceId(0, 0)))
      .toThrow("Restart the encounter");
    expect(() => applyEncounterChoice(encounter, createInitialEncounterState(encounter), choiceId(1, 0)))
      .toThrow("is not valid");
  });
});
