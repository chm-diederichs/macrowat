const util = require('util')
const parse = require('.')

const input = `
  for (let i = 0; i < 10; i++) {
    for (let i = 0; i < 10; i++) {
      for (let how of why) {
        fe25519_add(r[0], p[1], p[0])
        fe25519_sub(r[1], p[1], p[0])
        fe25519_mul(r[2], r[0], q[0])
        fe25519_mul(r[1], r[1], q[1])
        fe25519_mul(r[3], q[3], p[3])
        fe25519_mul(r[0], p[2], q[2])       
      }
    }
    for (let i = 0; i < 10; i++) {
    }
  }
  fe25519_add(r[0], p[1], p[0])
  fe25519_sub(r[1], p[1], p[0])
  fe25519_mul(r[2], r[0], q[0])
  fe25519_mul(r[1], r[1], q[1])
  fe25519_mul(r[3], q[3], p[3])
  fe25519_mul(r[0], p[2], q[2])
  fe25519_add(t0, r[0], r[0])
  fe25519_sub(r[0], r[2], r[1])
  fe25519_add(r[1], r[2], r[1])
  fe25519_add(r[2], t0, r[3])
  fe25519_sub(r[3], t0, r[3])
`

const table = [
  'fe25519_mul',
  'fe25519_sq',
  'fe25519_invert'
]

// parse(input, table)
console.log(parse.parseScopes(input))
// parse.parseScopes(input)
// log(parse(input, table))

function log (...args) {
  for (let a of args) console.log(util.inspect(a, false, null, true))
}
