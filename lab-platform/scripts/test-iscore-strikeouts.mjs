import assert from 'node:assert/strict'
import { statRows } from './apply-iscore-import.mjs'
for (const input of [{ K: '8' }, { SO: '5' }, { K: '0', SO: '3' }]) {
  const game = { year: 2017, home: 'Falcons', visitor: 'Condores', externalKey: 'test', csv: { statsHomePitching: null } }
  game.csv['statsHomePitching.csv'] = { rows: [{ Name: 'Pitcher', IP: '1', ...input }] }
  const sql = statRows([game]).pitching[0]
  const expected = Number(input.K ?? input.SO)
  assert.ok(sql.includes(`, 1, 0, 0, 0, 0, ${expected}, 0, false`), sql)
}
console.log('3 strikeout alias regression cases passed')
