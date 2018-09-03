import { Stack, List } from 'immutable'
import { Tokenizer } from 'ts-regex-tokenizer'

export type OperatorValue = '+' | '-' | '/' | '*'
export type Operand = { kind: 'operand'; value: number }
export type Operator = { kind: 'operator'; value: OperatorValue }
export type Token = Operand | Operator

const tokenizer = new Tokenizer<Token>({
  matchers: [
    {
      regex: /^\+/,
      construct: _ => Array<Token>({ kind: 'operator', value: '+' })
    },
    {
      regex: /^\-/,
      construct: _ => Array<Token>({ kind: 'operator', value: '-' })
    },
    {
      regex: /^\*/,
      construct: _ => Array<Token>({ kind: 'operator', value: '*' })
    },
    {
      regex: /^\//,
      construct: _ => Array<Token>({ kind: 'operator', value: '/' })
    },
    {
      regex: /^\d+/,
      construct: val =>
        Array<Token>({ kind: 'operand', value: parseFloat(val) })
    },
    { regex: /^\s+/, construct: _ => Array<Token>() }
  ]
})

type State = {
  input: List<Token>
  stack: Stack<Operand>
}

type Option<A> = { kind: 'some'; value: A } | { kind: 'none' }
const some = <A>(x: A): Option<A> => ({ kind: 'some', value: x })
const none = <A>(): Option<A> => ({ kind: 'none' })

const getInput = (state: State): [Option<Token>, State] => {
  const token = state.input.first()
  if (token) {
    let nextState: State = { ...state, input: state.input.skip(1) }
    return [some(token), nextState]
  }
  return [none(), state]
}

const popStack = (state: State): [Option<Operand>, State] => {
  const token = state.stack.peek()
  if (token) {
    let nextState: State = { ...state, stack: state.stack.pop() }
    return [some(token), nextState]
  }
  return [none(), state]
}

const pushStack = (token: Operand, state: State): State => {
  return { ...state, stack: state.stack.push(token) }
}

const mapOperator = (
  value: OperatorValue
): ((a: number, b: number) => number) => {
  switch (value) {
    case '+':
      return (a, b) => a + b
    case '-':
      return (a, b) => a - b
    case '/':
      return (a, b) => a / b
    case '*':
      return (a, b) => a * b
  }
}

export const evaluate = (s0: State): State => {
  const [tokenOpt, s1] = getInput(s0)
  switch (tokenOpt.kind) {
    case 'none':
      return s0
    case 'some':
      const token = tokenOpt.value
      switch (token.kind) {
        case 'operand':
          return evaluate(pushStack(token, s1))
        case 'operator':
          const [a, s2] = popStack(s1)
          const [b, s3] = popStack(s2)
          if (a.kind === 'some' && b.kind === 'some') {
            const res = mapOperator(token.value)(a.value.value, b.value.value)
            return evaluate(pushStack({ kind: 'operand', value: res }, s3))
          }
          throw `Not enough operators on the stack for operator ${token.value}`
      }
  }
  return s0
}

const stringify = (x: any) => JSON.stringify(x, undefined, 0)

try {
  const input = '15 7 1 1 + - / 3 * 2 1 1 + + -'
  console.log(`Input:`)
  console.log(input)
  console.log()

  const tokens = tokenizer.consume(input)
  console.log(`Tokens:`)
  console.log(tokens)
  console.log()

  const result = evaluate({ input: List(tokens), stack: Stack() })
  console.log(`Result:`)
  console.log(result.stack.toArray())
} catch (error) {
  console.error(error)
}
