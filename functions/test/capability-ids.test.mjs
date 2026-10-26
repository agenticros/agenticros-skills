import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { skillMatchesCapability } = require("../lib/util/capability-ids.js");

test("a capability match does not depend on the popular page", () => {
  const popular = {
    starCount: 100,
    visibility: "public",
    capabilities: [{ id: "find_object" }],
  };
  const later = {
    starCount: 0,
    visibility: "public",
    capabilities: [{ id: "navigate_to", verb: "navigate" }],
  };
  assert.equal(skillMatchesCapability(popular, "navigate_to", false), false);
  assert.equal(skillMatchesCapability(later, "navigate_to", false), true);
});

test("unlisted skills stay out of the public capability query", () => {
  const tutorial = {
    visibility: "unlisted",
    capabilityIds: ["hello"],
  };
  assert.equal(skillMatchesCapability(tutorial, "hello", false), false);
  assert.equal(skillMatchesCapability(tutorial, "hello", true), true);
});
