const util = require('util')

const KEYWORD = /(?<=(for|while)\s*)\(.*\)/

module.exports = function (text, table) {
  return compile(parseLines(text), table)
}

module.exports.parseScope = parseScope
module.exports.parseScopes = parseScopes

function parseScopes (input) {
  let braces = []
  findSymbols(input, '{', braces)
  findSymbols(input, '}', braces)

  let depth = 0
  braces.sort((a, b) => a.index - b.index).map(s => {
    s.depth = s.symbol === '{' ? depth++ : --depth
    return s
  })

  const closures = []
  for (let i = 0; i < braces.length; i++) {
    const start = braces[i]
    const end = braces.findIndex(b =>
      b.depth === start.depth && b.symbol !== start.symbol)

    closures.push(input.substring(start.index, braces[end].index + 1))
    braces.splice(end, 1)
  }

  return closures
}

function findSymbols (input, symbol, res) {
  if (!res) return findSymbols(input, symbol, [])

  let next = input.indexOf(symbol)
  while (next >= 0) {
    res.push({ symbol, index: next })
    next = input.indexOf(symbol, next + 1)
  }

  return res
}

function parseScope (input) {
  let open = 0
  let close = 0
  let next = input.indexOf('{')

  let count = 1
  while (count > 0) {
    open = input.indexOf('{', next + 1)
    close = input.indexOf('}', next + 1)

    next = open * close > 0 ? Math.min(open, close) : close

    if (close < open || open < 0) {
      count--
    } else {
      count++
    }
  }

  return input.substring(0, next)
}

function parseLines (input) {
  const lines = input.trim().split('\n').map(s => s.trim())
  // const positions
  return lines.map(parseLine)
}

function parseLine (line) {
  const m = line.match(KEYWORD)
  if (m === null) return parseOp(line)

  return {
    branch: m[1],
    condition: m[0]
  }
}

function parseOp (line) {
  let [func, rest] = line.split('(')
  if (line === '{' || line === '}') return {}

  const args = rest.replace(/\)/, "")
    .trim(')')
    .split(',')
    .map(s => s.trim())
    .map(arg => {
      if (!arg.endsWith(']')) return { arg }
      const split = arg.split('[')
      return {
        arg: split[0],
        index: parseInt(split[1].replace(/\]$/, ""))
      }
    })

  return {
    func,
    args
  }
}

function compile (src, table) {
  console.log(src)
  let str = ''
  for (let op of src) {
    if (op.args) {
      const args = op.args.map(a => `${a.arg}${a.index ? a.index : ''}`)
      str += templates[op.func](...args, table)
    }
  }

  return str
}

function fe25519_add (res, arg1, arg2) {
  let str = `;; fe25519_add(${res}, ${arg1}, ${arg2})\n`
  for (let i = 0; i < 10; i++) str += `(get_local $${arg1}_${i})
(get_local $${arg2}_${i})
(i64.add)
(set_local $${res}_${i})\n`

  return str + '\n'
}

function fe25519_sub (res, arg1, arg2) {
  let str = `;; fe25519_add(${res}, ${arg1}, ${arg2})\n`
  for (let i = 0; i < 10; i++) str += `(get_local $${arg1}_${i})
(get_local $${arg2}_${i})
(i64.sub)
(set_local $${res}_${i})\n`

  return str + '\n'
}

function fe25519_mul (res, arg1, arg2, table) {
  let str = `;; fe25519_mul(${res}, ${arg1}, ${arg2})\n`
  for (let i = 0; i < 10; i++) str += `(get_local $${arg1}_${i})\n`
  for (let i = 0; i < 10; i++) str += `(get_local $${arg2}_${i})\n`
  str += `(get_local ${res})\n`
  str += `(i32.const ${table.indexOf('fe25519_mul')})\n`
  str += `(call_indirect (type $fe25519_mul))\n`

  return str + '\n'
}

function fe25519_sq (res, arg1, table) {
  let str = `;; fe25519_mul(${res}, ${arg1}, ${arg2})\n`
  for (let i = 0; i < 10; i++) str += `(get_local $${arg1}_${i})\n`
  str += `(i32.const 0)\n`
  str += `(i32.const 0)\n`
  str += `(get_local ${res})\n`
  str += `(i32.const ${table.indexOf('fe25519_sq')})\n`
  str += `(call_indirect (type $fe25519_mul))\n`

  return str + '\n'
}

function fe25519_sq2 (res, arg1, table) {
  let str = `;; fe25519_mul(${res}, ${arg1}, ${arg2})\n`
  for (let i = 0; i < 10; i++) str += `(get_local $${arg1}_${i})\n`
  str += `(i32.const 1)\n`
  str += `(i32.const 0)\n`
  str += `(get_local ${res})\n`
  str += `(i32.const ${table.indexOf('fe25519_sq')})\n`
  str += `(call_indirect (type $fe25519_mul))\n`

  return str + '\n'
}

function fe25519_cswap (arg1, arg2, tmp, cond) {
  let str = `;; cswap(${arg1}, ${arg2}, ${cond})
(i32.const 0)
(get_local $${cond})
(i32.const 1)
(i32.and)
(i32.sub)
(i64.extend_u/i32)
(set_local $mask)
`
for (let i = 0; i < 10; i++) str += `
(get_local $${arg1}_${i})
(get_local $${arg2}_${i})
(i64.xor)
(get_local $mask)
(i64.and)
(set_local $${tmp}_${i})
`

for (let i = 0; i < 10; i++) str += `
(get_local $${arg1}_${i})
(get_local $${tmp}_${i})
(i64.xor)
(set_local $${arg1}_${i})
`

for (let i = 0; i < 10; i++) str += `
(get_local $${arg2}_${i})
(get_local $${tmp}_${i})
(i64.xor)
(set_local $${arg1}_${i})
`
  return str + '\n'
}

const templates = {
  fe25519_add,
  fe25519_sub,
  fe25519_mul,
  fe25519_sq,
  fe25519_sq2,
  fe25519_cswap
}

function log (...args) {
  for (let a of args) console.log(util.inspect(a, false, null, true))
}
