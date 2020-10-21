const util = require('util')
const parse = require('./parser')

const input = `
var t0 = fe25519()
var t1 = fe25519()
var t2 = fe25519()
var t3 = fe25519()

fe25519_sq(t0, z)
fe25519_mul(t1, t0, z)
fe25519_sq(t0, t1)
fe25519_sq(t2, t0)
fe25519_sq(t2, t2)
fe25519_mul(t2, t2, t0)
fe25519_mul(t1, t2, z)
fe25519_sq(t2, t1)
for (let i = 1; i < 5; i++) {
  fe25519_sq(t2, t2)
  for (let i = 1; i < 10; i++) {
    fe25519_sq(t2, t2)
  }
}
fe25519_mul(t1, t2, t1)
fe25519_sq(t2, t1)
for (let i = 1; i < 10; i++) {
  fe25519_sq(t2, t2)
}
fe25519_mul(t2, t2, t1)
fe25519_sq(t3, t2)
for (let i = 1; i < 20; i++) {
  fe25519_sq(t3, t3)
}
fe25519_mul(t2, t3, t2)
fe25519_sq(t2, t2)
for (let i = 1; i < 10; i++) {
  fe25519_sq(t2, t2)
}
fe25519_mul(t1, t2, t1)
fe25519_sq(t2, t1)
for (let i = 1; i < 50; i++) {
  fe25519_sq(t2, t2)
}
fe25519_mul(t2, t2, t1)
fe25519_sq(t3, t2)
for (let i = 1; i < 100; i++) {
  fe25519_sq(t3, t3)
}
fe25519_mul(t2, t3, t2)
fe25519_sq(t2, t2)
for (let i = 1; i < 50; i++) {
  fe25519_sq(t2, t2)
}
fe25519_mul(t1, t2, t1)
fe25519_sq(t1, t1)
for (let i = 1; i < 4; i++) {
  fe25519_sq(t1, t1)
}
fe25519_mul(out, t1, t0)
`

const table = [
  'fe25519_mul',
  'fe25519_sq',
  'fe25519_invert'
]

// parse(input, table)
  // const lines = input.trim().split('\n').map(s => s.trim())

log(parse(input))
// parse.parseScopes(input)
// log(parse(input, table))

function log (...args) {
  for (let a of args) console.log(util.inspect(a, false, null, true))
}
