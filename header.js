module.exports = function (functions) {
  let str = `(module
(import "js" "table" (table ${functions.length} anyfunc))
(import "js" "mem" (memory 1))\n
`
console.log(functions)
  for (let func of functions) {
    str += `(type $${func.name} (func\n`

    for (let i = 0; i < func.args.length - 1; i++) {
      const arg = func.args[i]
      str += `(param $arg${i} ${arg})\n`
    }
    str += `(result ${func.result})))\n\n`
  }

  return str
}
