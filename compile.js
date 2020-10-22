module.exports = compile

function compile (src, table, depth = 0) {
  let str = '' 
  for (let op of src) {
    switch (op.type) {
      case 'function' :
        str += func(op, table)
        break

      case 'call' :
        str += call(op, table)
        break

      case 'branch' :
        str += branch(op, table, depth)
        break

      default: 
        break
    }
  }

  return str
}

function func (f, table) {
  let str = ''
  str += `(func $${f.name} (export "${f.name}")\n`

  for (let arg of f.args) {
    str += `(param $${arg.name} i32)\n`
  }

  str += declare(f.body)
  str += compile(f.body, table)
  return str + ')'
}

function call (op, table) {
  const args = op.args.map(a => `${a.arg}${a.index ? a.index : ''}`)
  return templates[op.operator](...args, table)
}

function declare (body) {
  let str = ''
  body.forEach(item => {
    console.log(item)
    if (item.type !== 'declaration' && item.operator !== 'check_fe') return
    str += fe25519(item.name || item.args[0].arg)
  })


  return str + '\n'
}

function branch (input, table, depth) {
  const start = 'start' + depth.toString()
  const end = 'break' + depth.toString()

  let str = ''
  str += `(block $${end}\n`
  str += `(loop $${start}\n`
  str += check(input.condition, end)

  str += compile(input.scope, table, depth + 1)
  str += `(br $${start})))\n\n`

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
  str += `(get_local $${cond.parameter})\n`

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
    str += `(${operators[cond.onloop.operator]})\n`
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
  for (let i = 0; i < 10; i++) {
    str += `(i64.load offset=${4 * i} (get_local $${name}))\n`
    str += `(set_local $${name}_${i})\n`
  }

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
  str += `(get_local $${res})\n`
  str += `(i32.const ${table.indexOf('fe25519_mul')})\n`
  str += `(call_indirect (type $fe25519_mul))\n`

  return str + '\n'
}

function fe25519_sq (res, arg1, table) {
  let str = `;; fe25519_sq(${res}, ${arg1})\n`
  for (let i = 0; i < 10; i++) str += `(get_local $${arg1}_${i})\n`
  str += `(i32.const 0)\n`
  str += `(i32.const 0)\n`
  str += `(get_local $${res})\n`
  str += `(i32.const ${table.indexOf('fe25519_sq')})\n`
  str += `(call_indirect (type $fe25519_mul))\n`

  return str + '\n'
}

function fe25519_sq2 (res, arg1, table) {
  let str = `;; fe25519_mul(${res}, ${arg1}, ${arg2})\n`
  for (let i = 0; i < 10; i++) str += `(get_local $${arg1}_${i})\n`
  str += `(i32.const 1)\n`
  str += `(i32.const 0)\n`
  str += `(get_local $${res})\n`
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
  fe25519,
  check_fe,
  fe25519_add,
  fe25519_sub,
  fe25519_mul,
  fe25519_sq,
  fe25519_sq2,
  fe25519_cswap
}
