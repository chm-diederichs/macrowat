const fs = require('fs')
const util = require('util')
const parse = require('./parser')
const compile = require('./compile')
const header = require('./header')

const input = `
function fe25519_invert_1 (out, z) {
check_fe(out)
check_fe(z)

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
}
`

const functions = []
const func = {}

func.name = 'fe25519_mul'
func.args = []
for (let i = 0; i < 20; i++) func.args.push('i64')
func.result = 'i32'
functions.push(func)

func.name = 'fe25519_invert'
func.args = []
for (let i = 0; i < 10; i++) func.args.push('i64')
func.result = 'i32'
functions.push(func)

func.name = 'fe25519_sq'
func.args = []
for (let i = 0; i < 12; i++) func.args.push(i < 10 ? 'i64' : 'i32')
func.result = 'i32'
functions.push(func)

// parse(input, table)
  // const lines = input.trim().split('\n').map(s => s.trim())

const file = fs.createWriteStream('./test.wat')
  .on('error', console.error)

file.write(header(functions))
file.write(compile(parse(input), functions.map(f => f.name)))
file.write(')')
file.close()

// parse.parseScopes(input)
// log(parse(input, table))

function log (...args) {
  for (let a of args) console.log(util.inspect(a, false, null, true))
}
