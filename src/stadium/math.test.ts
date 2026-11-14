import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bernabeuEnvelopePoint,
  computeIrisPetalTransform,
  computeRoofLeafOffsets,
  dampValue,
  roofElevationAt,
  superellipsePoint,
} from './math';
import { STADIUM_DIMS } from './constants';

test('superellipsePoint respects major semi-axes at cardinal angles', () => {
  const east = superellipsePoint(0, 100, 120);
  assert.ok(Math.abs(east.x - 100) < 1e-6);
  assert.ok(Math.abs(east.z) < 1e-6);

  const south = superellipsePoint(Math.PI / 2, 100, 120);
  assert.ok(Math.abs(south.x) < 1e-6);
  assert.ok(Math.abs(south.z - 120) < 1e-6);
});

test('bernabeuEnvelopePoint produces asymmetric Paseo de la Castellana bulge on west (-X)', () => {
  const midWest = bernabeuEnvelopePoint(Math.PI, 0.5);
  const midEast = bernabeuEnvelopePoint(0, 0.5);

  // West facade projects noticeably farther outward than East facade
  assert.ok(Math.abs(midWest.x) > Math.abs(midEast.x) + 8);
  assert.ok(midWest.x < -STADIUM_DIMS.facadeHalfX);
});

test('roofElevationAt peaks at center crown and slopes toward perimeter', () => {
  const center = roofElevationAt(0, 0);
  const corner = roofElevationAt(1, 1);

  assert.ok(center > corner);
  assert.ok(center > STADIUM_DIMS.facadeHeight);
  assert.ok(corner >= STADIUM_DIMS.facadeHeight);
});

test('computeRoofLeafOffsets slides symmetrically north and south', () => {
  const closed = computeRoofLeafOffsets(0);
  assert.equal(closed.northZ, 0);
  assert.equal(closed.southZ, 0);

  const open = computeRoofLeafOffsets(1);
  assert.ok(open.northZ < -50);
  assert.ok(open.southZ > 50);
  assert.equal(open.northZ, -open.southZ);
});

test('computeIrisPetalTransform retracts radially and scales smoothly', () => {
  const closed = computeIrisPetalTransform(0, 12, 0);
  assert.equal(closed.offsetX, 0);
  assert.equal(closed.offsetZ, 0);
  assert.equal(closed.scaleRadial, 1);

  const openEast = computeIrisPetalTransform(0, 12, 1);
  assert.ok(openEast.offsetX > 20);
  assert.ok(openEast.scaleRadial < 0.7);
  assert.ok(openEast.yawTilt > 0);
});

test('dampValue approaches target smoothly and stays bounded', () => {
  const step1 = dampValue(0, 10, 6, 0.016);
  assert.ok(step1 > 0 && step1 < 10);

  const settled = dampValue(9.999, 10, 6, 0.1);
  assert.ok(settled > 9.999 && settled <= 10);
});
