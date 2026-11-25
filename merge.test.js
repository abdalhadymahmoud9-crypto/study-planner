import { mergeValue, mergeAll } from "./merge.js";
import assert from "node:assert/strict";
const t = (n, f) => { f(); console.log("ok", n); };
const A = (id, x = 0) => ({ id, x });
t("distinct additions on two devices are both kept", () => {
  const r = mergeValue([A(1)], [A(1), A(2)], [A(1), A(3)]);
  assert.deepEqual(r.map((x) => x.id).sort(), [1, 2, 3]);
});
t("delete here stays deleted, even if other side unchanged", () => {
  assert.deepEqual(mergeValue([A(1), A(2)], [A(1)], [A(1), A(2)]), [A(1)]);
});
t("delete there removes here", () => {
  assert.deepEqual(mergeValue([A(1), A(2)], [A(1), A(2)], [A(1)]), [A(1)]);
});
t("edit here beats unchanged there; edit there beats unchanged here", () => {
  assert.deepEqual(mergeValue([A(1, 0)], [A(1, 5)], [A(1, 0)]), [A(1, 5)]);
  assert.deepEqual(mergeValue([A(1, 0)], [A(1, 0)], [A(1, 9)]), [A(1, 9)]);
});
t("empty base (first import) is a union, nothing overwritten", () => {
  const r = mergeValue([], [A(2, 1)], [A(1, 7), A(2, 9)]);
  assert.deepEqual(r.find((x) => x.id === 2), A(2, 9)); // not changed vs empty base? local counts as new on both: remote kept
  assert.equal(r.length, 2);
});
t("object maps merge per key; scalars take changed side", () => {
  assert.deepEqual(mergeValue({ a: 1 }, { a: 1, b: 2 }, { a: 5 }), { a: 5, b: 2 });
  assert.equal(mergeValue("100", "200", "100"), "200");
  assert.equal(mergeValue("100", "100", "300"), "300");
});
t("mergeAll keeps string/JSON shapes", () => {
  const r = mergeAll({}, { k: JSON.stringify([A(1)]), n: "5" }, { k: JSON.stringify([A(2)]) }, ["k", "n"]);
  assert.equal(JSON.parse(r.k).length, 2); assert.equal(r.n, "5");
});
