import test from 'node:test'
import assert from 'node:assert'

test('smoke: export shape', () => {
  const doc = {
    version: 1,
    nodes: [],
    edges: [],
  }
  assert.strictEqual(doc.version, 1)
  assert.ok(Array.isArray(doc.nodes))
})
