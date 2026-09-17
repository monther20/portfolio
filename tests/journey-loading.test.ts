import { test } from "node:test";
import assert from "node:assert/strict";
import { JOURNEY } from "../src/components/scene/journeyConfig";
import { JOURNEY_SECTIONS } from "../src/components/scene/sectionNavigation";
import {
  JOURNEY_LOAD_STAGES,
  canLoadJourneyStage,
  completeJourneyStage,
  readyJourneyFarBound,
} from "../src/components/scene/journeyLoading";

test("the entrance and About are explorable without any distant scene", () => {
  const bound = readyJourneyFarBound(0);
  assert.ok(bound < JOURNEY.corridorStart);
  assert.ok(JOURNEY_SECTIONS[0].z >= bound);
  assert.ok(bound > JOURNEY.launchTriggerZ);
});

test("background stages load in travel order and completed scenes stay mounted", () => {
  for (
    let completed = 0;
    completed <= JOURNEY_LOAD_STAGES.length;
    completed++
  ) {
    JOURNEY_LOAD_STAGES.forEach((stage, index) => {
      assert.equal(
        canLoadJourneyStage(stage.id, completed),
        index <= completed,
      );
    });
  }
});

test("readiness cannot skip a missing stage or advance twice on duplicate signals", () => {
  assert.equal(completeJourneyStage("contact", 0), 0);
  let completed = 0;
  for (const stage of JOURNEY_LOAD_STAGES) {
    const before = completed;
    completed = completeJourneyStage(stage.id, completed);
    assert.equal(completed, before + 1);
    assert.equal(completeJourneyStage(stage.id, completed), completed);
  }
  assert.equal(completed, JOURNEY_LOAD_STAGES.length);
});

test("safe scroll bounds only expand, ending at the original journey far bound", () => {
  let previous: number = JOURNEY.corridorStart;
  for (
    let completed = 0;
    completed <= JOURNEY_LOAD_STAGES.length;
    completed++
  ) {
    const bound = readyJourneyFarBound(completed);
    assert.ok(Number.isFinite(bound));
    assert.ok(bound < previous);
    assert.ok(bound >= JOURNEY.farBound);
    previous = bound;
  }
  assert.equal(previous, JOURNEY.farBound);
});

test("section jumps wait for their destination and every scene on the route", () => {
  const requiredStages = {
    about: 0,
    journey: 4,
    skills: 5,
    projects: 6,
    contact: 7,
  };
  for (const section of JOURNEY_SECTIONS) {
    for (
      let completed = 0;
      completed <= JOURNEY_LOAD_STAGES.length;
      completed++
    ) {
      assert.equal(
        section.z >= readyJourneyFarBound(completed),
        completed >= requiredStages[section.id],
        `${section.id} with ${completed} ready stages`,
      );
    }
  }
});

test("window launch cannot start until both the airplane and flight scene are ready", () => {
  for (let completed = 0; completed < 3; completed++) {
    assert.ok(readyJourneyFarBound(completed) > JOURNEY.launchTriggerZ);
  }
  assert.ok(readyJourneyFarBound(3) < JOURNEY.launchTriggerZ);
});
