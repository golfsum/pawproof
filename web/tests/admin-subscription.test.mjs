import assert from "node:assert/strict";
import test from "node:test";
import {
  planLabel,
  premiumStoreLabel,
  resolvePlanCadence,
} from "../src/lib/admin-subscription.ts";

test("resolves the configured monthly and yearly products", () => {
  assert.equal(resolvePlanCadence("plus_monthly_499"), "monthly");
  assert.equal(resolvePlanCadence("PLUS_YEARLY_3999"), "yearly");
});

test("keeps missing and unrecognized products honest", () => {
  assert.equal(resolvePlanCadence(null), "unknown");
  assert.equal(resolvePlanCadence("test-store-product"), "unknown");
  assert.equal(planLabel(true, "unknown"), "Plus");
  assert.equal(planLabel(false, "yearly"), "Free");
});

test("formats known billing stores without changing unknown values", () => {
  assert.equal(premiumStoreLabel("APP_STORE"), "App Store");
  assert.equal(premiumStoreLabel("RC_BILLING"), "RevenueCat");
  assert.equal(premiumStoreLabel("partner_store"), "partner_store");
});
