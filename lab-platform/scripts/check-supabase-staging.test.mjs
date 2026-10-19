import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkStaging, readOnlyRequest, STAGING_REF } from './check-supabase-staging.mjs'

const url = `https://${STAGING_REF}.supabase.co`
const key = 'sb_publishable_test_key'

test('only targets staging with a limited read-only request', () => {
  const request = readOnlyRequest(url, key)
  assert.equal(request.options.method, 'GET')
  assert.equal(request.options.redirect, 'error')
  assert.equal(new URL(request.url).search, '?select=id&limit=1')
  assert.equal(request.options.headers.Authorization, undefined)
})
test('rejects production, extra URL components, missing keys and privileged keys', () => {
  for (const other of ['https://fhyurtioqpfmiwdciylt.supabase.co', url + '/rest/v1', url + '?test=1', 'http://' + STAGING_REF + '.supabase.co']) {
    assert.throws(() => readOnlyRequest(other, key))
  }
  for (const other of ['', undefined, 'sb_secret_do_not_use', 'invalid']) assert.throws(() => readOnlyRequest(url, other))
  const privileged = `test.${Buffer.from(JSON.stringify({ role: 'service_role', ref: STAGING_REF })).toString('base64url')}.signature`
  assert.throws(() => readOnlyRequest(url, privileged))
})
test('accepts a legacy anon key for staging, not another project', () => {
  const token = (ref) => `test.${Buffer.from(JSON.stringify({ role: 'anon', ref })).toString('base64url')}.signature`
  assert.equal(readOnlyRequest(url, token(STAGING_REF)).options.headers.Authorization, `Bearer ${token(STAGING_REF)}`)
  assert.throws(() => readOnlyRequest(url, token('other-project')))
})
test('checks the database without returning its records', async () => {
  const result = await checkStaging({ url, key, fetchImpl: async () => new Response(JSON.stringify([{ id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' }])) })
  assert.equal(result.status, 'ok')
  assert.equal(result.attempts, 1)
  assert.equal(JSON.stringify(result).includes('aaaaaaaa'), false)
})
test('retries transient failures at most three times', async () => {
  let calls = 0
  const result = await checkStaging({ url, key, wait: async () => {}, fetchImpl: async () => {
    calls++
    return calls < 3 ? new Response('', { status: 503 }) : new Response('[]')
  } })
  assert.equal(calls, 3)
  assert.equal(result.attempts, 3)
})
test('does not retry authorization failures', async () => {
  let calls = 0
  await assert.rejects(checkStaging({ url, key, fetchImpl: async () => { calls++; return new Response('', { status: 401 }) } }), /HTTP 401/)
  assert.equal(calls, 1)
})
test('sanitizes network errors and rejects non-database responses', async () => {
  await assert.rejects(checkStaging({ url, key, wait: async () => {}, fetchImpl: async () => { throw new Error(key) } }), /connection failed after 3 attempts/)
  for (const body of ['<html>Gateway</html>', '{}', '[{"id":"not-a-uuid"}]']) {
    await assert.rejects(checkStaging({ url, key, fetchImpl: async () => new Response(body) }))
  }
})
