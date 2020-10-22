const util = require('util')

const DECLARATION = /(?:var|const|let)\s+(\w+)(?:\s+=\s+(.+)(?:$|;))?/
const KEYWORD = /(?<=(for|while)\s*)\((.*)\)/
const FUNCTION = /function\s+(.*)\s+\((.*)\)\s+{/

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
  const func = line.match(FUNCTION)
  
  let ret = {}

  if (func !== null) {
    const close = parseScope(input, next)
    const body = parse(input.substring(next + 1, close))

    readLine.offset = close
    ret.type = 'function'
    ret.name = func[1]
    ret.args = func[2].split(',').map(a => { return { name: a.trim() }} )
    ret.body = body
    return ret
  }

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

  const clause = cond.match(/;\s*(?:(.*)\s+)?(<|>|<=|>=|==)(?:\s*(.*));.*/)
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
  condition.onloop.value = onloop[4] !== undefined ? 1 : Number(onloop[4])

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

  console.log(args)

  return {
    type: 'call',
    operator: func,
    args
  }
}

function log (...args) {
  for (let a of args) console.log(util.inspect(a, false, null, true))
}
