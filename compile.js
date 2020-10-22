const header = require('./header')

const COUNTERS = []
for (let i = 0x69; i < 0x6f; i++) COUNTERS.push(String.fromCharCode(i))

module.exports = class {
  constructor (functions, tmps = 4) {
    this.ptrs = []
    this.header = header(functions, tmps)
    this.body = ''
    this.table = functions.map(f => f.name)
    this.mostRecentPointer = null

    for (let i = 0; i < tmps; i++) {
      this.ptrs.push({ name: `tmp${i}`, assigned: null })
    }
  }

  compile (src, depth = 0) {
    let str = ''
    const counters = new Set()

    for (let op of src) {
      switch (op.type) {
        case 'function' :
          str += this.func(op)
          break

        case 'call' :
          str += this.call(op)
          break

        case 'branch' :
          counters.add(COUNTERS[depth - 1])

          op.condition.check.parameter = COUNTERS[depth - 1]
          str += this.branch(op, depth)
          this.branch.counters.map(c => counters.add(c))

          break

        default:
          break
      }
    }

    this.compile.counters = Array.from(counters)
    if (depth > 0) return str
    return this.header + str + ')'
  }

  func (f) {
    let str = ''
    str += `(func $${f.name} (export "${f.name}")\n`

    for (let arg of f.args) {
      str += `(param $${arg.name} i32)\n`
    }
    str += `(result i32)\n`

    const body = this.compile(f.body, 1)
    str += declare(f.body)
    str += ';; declare loop counters\n'
    for (let c of this.compile.counters) str += `(local $${c} i32)\n`

    str += '\n' + body
    str += `(get_global $${this.mostRecentPointer.name}))`
    return str
  }

  call (op) {
    const args = op.args.map(a => `${a.arg}${a.index ? a.index : ''}`)

    if (templates[op.operator].pointer) {
      let str = ''
      let ptr = this.ptrs.find(t => t.assigned === null)

      // no more available pointers
      if (ptr === undefined) {
        ptr = this.ptrs.shift()
        str += load(ptr.name, ptr.assigned)
        this.ptrs.push(ptr)
      }

      ptr.assigned = op.args[0].arg
      this.mostRecentPointer = ptr

      str += templates[op.operator].func(ptr.name, ...args.slice(1), this.table)
      return str
    }

    return templates[op.operator].func(...args, this.table)
  }

  branch (input, depth) {
    const start = 'start' + depth.toString()
    const end = 'break' + depth.toString()

    let str = ''
    str += `(block $${end}\n`
    str += `(loop $${start}\n`
    str += check(input.condition, end)

    str += this.compile(input.scope, depth + 1)
    str += `(br $${start})))\n\n`

    this.branch.counters = Array.from(this.compile.counters)
    return str
  }
}

function declare (body) {
  let str = ''
  body.forEach(item => {
    if (item.type !== 'declaration' && item.operator !== 'check_fe') return
    str += fe25519(item.name || item.args[0].arg)
  })

  return str
}

function check (cond, breakpoint) {
  // wasm checks for the breaking condition
  const operators = {
    '<': 'i32.eq',
    '>': 'i32.eq',
    '<=': 'i32.gt',
    '>=': 'i32.lt',
    '==': 'i32.neq',
    'inc': 'i32.add',
    'dec': 'i32.sub'
  }

  let str = ''
  str += `(get_local $${cond.check.parameter})\n`

  const limit = cond.check.limit
  if (limit.type === 'number') {
    str += `(i32.const ${limit.value})\n`
  } else {
    str += `(get_local $${limit.value})\n`
  }
  str += `(${operators[cond.check.operator]})\n`
  str += `(br_if $${breakpoint})\n`

  if (cond.onloop) {
    str += `(i32.const ${cond.onloop.value || 1})\n`
    str += `(get_local $${cond.check.parameter || 1})\n`
    str += `(${operators[cond.onloop.operator]})\n`
    str += `(set_local $${cond.check.parameter || 1})\n`
  }

  return str + '\n'
}

function fe25519 (name) {
  let str = `;; ${name} = fe25519()\n`
  for (let i = 0; i < 10; i++) str += `(local $${name}_${i} i64)\n`

  return str + '\n'
}

// implies args are fe25519 scalars, so must load from a pointer
function check_fe (name) {
  let str = `;; ${name} = loaf_fe(${name})\n`
  str += load(name, name, true)

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
  str += `(get_global $${res})\n`
  str += `(i32.const ${table.indexOf('fe25519_mul')})\n`
  str += `(call_indirect (type $fe25519_mul))\n`

  return str + '\n'
}

function fe25519_sq (res, arg1, table) {
  let str = `;; fe25519_sq(${res}, ${arg1})\n`
  for (let i = 0; i < 10; i++) str += `(get_local $${arg1}_${i})\n`
  str += `(i32.const 0)\n`
  str += `(i32.const 0)\n`
  str += `(get_global $${res})\n`
  str += `(i32.const ${table.indexOf('fe25519_sq')})\n`
  str += `(call_indirect (type $fe25519_sq))\n`

  return str + '\n'
}

function fe25519_sq2 (res, arg1, table) {
  let str = `;; fe25519_mul(${res}, ${arg1}, ${arg2})\n`
  for (let i = 0; i < 10; i++) str += `(get_local $${arg1}_${i})\n`
  str += `(i32.const 1)\n`
  str += `(i32.const 0)\n`
  str += `(get_global $${res})\n`
  str += `(i32.const ${table.indexOf('fe25519_sq')})\n`
  str += `(call_indirect (type $fe25519_mul))\n`

  return str + '\n'
}

function load (ptr, arg, local = false) {
  let str = ''
  for (let i = 0; i < 10; i++) {
    str += `(i64.load32_u offset=${4 * i} `
    str += `(get_${local ? 'local' : 'global'} $${ptr}))\n`
    str += `(set_local $${arg}_${i})\n`
  }

  return str + '\n'
}

function fe25519_cswap (arg1, arg2, cond, tmp) {
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
  fe25519: {
    func: fe25519,
    pointer: false
  },
  check_fe: {
    func: check_fe,
    pointer: false
  },
  fe25519_add: {
    func: fe25519_add,
    pointer: false
  },
  fe25519_sub: {
    func: fe25519_sub,
    pointer: false
  },
  fe25519_mul: {
    func: fe25519_mul,
    pointer: true
  },
  fe25519_sq: {
    func: fe25519_sq,
    pointer: true
  },
  fe25519_sq2: {
    func: fe25519_sq2,
    pointer: true
  },
  fe25519_cswap: {
    func: fe25519_cswap,
    pointer: true
  }
}
