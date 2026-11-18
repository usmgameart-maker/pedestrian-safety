(function (root) {
  'use strict';
  const VERSION = 1;
  const KEY = 'safety-academy.pedestrian.route.v1';
  function fresh(length) { return {version: VERSION, current: 0, steps: Array(length).fill(0)}; }
  function normalize(value, scenes) {
    const result = fresh(scenes.length);
    if (!value || value.version !== VERSION || !Array.isArray(value.steps)) return result;
    result.current = Number.isInteger(value.current) ? Math.max(0, Math.min(scenes.length - 1, value.current)) : 0;
    result.steps = scenes.map((s, i) => Number.isInteger(value.steps[i]) ? Math.max(0, Math.min(s.tasks.length, value.steps[i])) : 0);
    return result;
  }
  function complete(state, scenes, index) { return state.steps[index] >= scenes[index].tasks.length; }
  function mark(state, scenes, index, taskIndex) {
    if (!scenes[index] || !scenes[index].tasks[taskIndex]) throw new RangeError('Unknown scene or task');
    const result = normalize(state, scenes);
    result.current = index;
    result.steps[index] = Math.max(result.steps[index], taskIndex + 1);
    return result;
  }
  function next(state, scenes) {
    if (!complete(state, scenes, state.current)) return state.current;
    const after = scenes.findIndex((s, i) => i > state.current && !complete(state, scenes, i));
    return after >= 0 ? after : scenes.findIndex((s, i) => !complete(state, scenes, i));
  }
  const api = {VERSION, KEY, fresh, normalize, complete, mark, next};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.GameEngine = api;
})(typeof window !== 'undefined' ? window : null);
