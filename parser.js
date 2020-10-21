const util = require('util')

const DECLARATION = /(?:var|const|let)\s+(\w+)(?:\s+=\s+(.+)(?:$|;))?/
const KEYWORD = /(?<=(for|while)\s*)\((.*)\)/

module.exports = parse

function parse (input) {
  const units = []
  let offset = 0

  do {
    const unit = readLine(input, offset)
    if (unit !== null) units.push(unit)
    offset = readLine.offset
  } while (offset < input.length && offset > 0)

  return units
}

function parseScope (input, offset) {
  let open = 0
  let close = 0

  let next = offset

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

  return next
}

function readLine (input, offset) {
  if (offset === undefined) return readLine(input, 0)

  const breakpoint = input.indexOf('\n', offset + 1)
  const next = breakpoint > 0 ? breakpoint : undefined
  const line = input.substring(offset, next).trim()

  // handle empty lines and lines closing scope
  if (line.length === 0 || line === '}') {
    readLine.offset = offset + line.length + 1
    return null
  }

  const conditional = line.match(KEYWORD)
  const declaration = line.match(DECLARATION)
  
  let ret = {}

  if (conditional !== null) {
    const close = parseScope(input, next)
    const scope = parse(input.substring(next + 1, close))

    readLine.offset = close
    ret.type = 'branch'
    ret.operator = conditional[1]
    ret.condition = parseCondition(conditional[2])
    ret.scope = scope
    return ret
  }

  if (declaration !== null) {
    ret.type = 'declaration'
    ret.name = declaration[1]

    if (declaration[2]) {
      const num = Number(declaration[2])
      ret.value = num === NaN ? num : parseOp(declaration[2])
    }

    readLine.offset = next + 1
    return ret
  }

  readLine.offset = next + 1
  return parseOp(line)
}

function parseCondition (cond) {
  const condition = {}

  const vars = cond.match(/(?:(let|const)\s+)(\w)\s*=\s*(\d+)/)
  condition.init = {}
  condition.init.initialised = vars[1] === undefined
  condition.init.parameter = vars[2]
  condition.init.value = Number(vars[3])

  const clause = cond.match(/.*;(?:(.*)\s+)?(<|>|<=|>=)(?:\s*(.*));.*/)
  condition.check = {}
  condition.check.parameter = clause[1]
  condition.check.operator = clause[2]
  condition.check.limit = {}
  try {
    condition.check.limit.value = Number(clause[3])
    condition.check.limit.type = 'number'
  } catch {
    condition.check.limit.value = clause[3]
    condition.check.limit.type = 'variable'
  }

  const onloop = cond.match(/.+(\w)(?:(?:([\+\-])\2*)|(?:\s+(\+=|\-=)\s*(\w)))/)
  condition.onloop = {}
  condition.onloop.variable = onloop[1]
  condition.onloop.operator = onloop[2] === undefined 
    ? onloop[3] === '+=' 
      ? 'add' 
      : 'subtract' 
    : onloop[2] === '+' 
      ? 'inc'
      : 'dec'
  if (onloop[4] !== undefined) condition.onloop.value = Number(onloop[4])

  return condition
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
    type: 'call',
    operator: func,
    args
  }
}

function fe25519 (name) {
  let str = `;; ${name} = fe25519(})\n`
  for (let i = 0; i < 10; i++) str += `
(local $${name}_${i} i64)\n`

  return str + '\n'
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
