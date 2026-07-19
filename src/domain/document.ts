/** Strip non-digits from CPF/CNPJ. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * Basic CPF validation (length + check digits).
 * Not a full antifraud check — enough for cadastro.
 */
export function isValidCpf(raw: string): boolean {
  const cpf = digitsOnly(raw)
  if (cpf.length !== 11) return false
  if (/^(\d)\1+$/.test(cpf)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i)
  let rest = (sum * 10) % 11
  if (rest === 10) rest = 0
  if (rest !== Number(cpf[9])) return false

  sum = 0
  for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i)
  rest = (sum * 10) % 11
  if (rest === 10) rest = 0
  return rest === Number(cpf[10])
}

/**
 * Basic CNPJ validation (length + check digits).
 */
export function isValidCnpj(raw: string): boolean {
  const cnpj = digitsOnly(raw)
  if (cnpj.length !== 14) return false
  if (/^(\d)\1+$/.test(cnpj)) return false

  const calc = (base: string, factors: number[]) => {
    let sum = 0
    for (let i = 0; i < factors.length; i++) {
      sum += Number(base[i]) * factors[i]
    }
    const rest = sum % 11
    return rest < 2 ? 0 : 11 - rest
  }

  const d1 = calc(cnpj, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  if (d1 !== Number(cnpj[12])) return false
  const d2 = calc(cnpj, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  return d2 === Number(cnpj[13])
}

export function isValidDocument(raw: string): boolean {
  const d = digitsOnly(raw)
  if (d.length === 11) return isValidCpf(d)
  if (d.length === 14) return isValidCnpj(d)
  return false
}

export function documentType(raw: string): 'cpf' | 'cnpj' | 'invalid' {
  const d = digitsOnly(raw)
  if (d.length === 11 && isValidCpf(d)) return 'cpf'
  if (d.length === 14 && isValidCnpj(d)) return 'cnpj'
  return 'invalid'
}
