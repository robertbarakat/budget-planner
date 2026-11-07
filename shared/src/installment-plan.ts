/** One instalment of a rescheduled debt (row of `installments`, with the paid state decided by the caller). */
export interface InstallmentInput {
  /** Progressive number of the instalment in the plan (>= 1, unique). */
  number: number
  /** Due date, `YYYY-MM-DD`. */
  dueDate: string
  /** Amount of the instalment, in integer cents (> 0). */
  amountCents: number
  /** True if the instalment has been paid. */
  paid: boolean
}

export interface InstallmentPlanInput {
  /** Rescheduled amount (`installment_plans.total_amount`), in integer cents (>= 0). */
  plannedAmountCents: number
  installments: readonly InstallmentInput[]
}

export interface InstallmentPlanSummary {
  /** Sum of all instalments, in cents. */
  installmentsTotalCents: number
  /** Interest = sum of the instalments - rescheduled amount, in cents (never negative). */
  totalInterestCents: number
  /** Still to pay = sum of the instalments not yet paid, in cents. */
  remainingCents: number
  /** First unpaid instalment by number, or null if all are paid (or there are none). */
  nextInstallment: InstallmentInput | null
}

/**
 * Summarises a rescheduled debt. Interest is not stored: it is the difference between the sum of the
 * instalments and the rescheduled amount (spec, section 7). With no instalments the plan is valid only
 * for a rescheduled amount of 0 (interest 0).
 *
 * @throws RangeError if the instalments sum to less than the rescheduled amount, if an amount is not
 *   an integer number of cents, or if instalment numbers are not unique positive integers.
 */
export function summarizeInstallmentPlan(input: InstallmentPlanInput): InstallmentPlanSummary {
  if (!Number.isSafeInteger(input.plannedAmountCents) || input.plannedAmountCents < 0) {
    throw new RangeError(`Rescheduled amount is not a non-negative integer number of cents: ${input.plannedAmountCents}`)
  }
  const numbers = new Set<number>()
  let installmentsTotalCents = 0
  let remainingCents = 0
  let nextInstallment: InstallmentInput | null = null
  for (const installment of input.installments) {
    if (!Number.isSafeInteger(installment.amountCents) || installment.amountCents <= 0) {
      throw new RangeError(`Instalment amount is not a positive integer number of cents: ${installment.amountCents}`)
    }
    if (!Number.isInteger(installment.number) || installment.number < 1 || numbers.has(installment.number)) {
      throw new RangeError(`Invalid or duplicate instalment number: ${installment.number}`)
    }
    numbers.add(installment.number)
    installmentsTotalCents += installment.amountCents
    if (!installment.paid) {
      remainingCents += installment.amountCents
      if (nextInstallment === null || installment.number < nextInstallment.number) {
        nextInstallment = installment
      }
    }
  }
  if (installmentsTotalCents < input.plannedAmountCents) {
    throw new RangeError(
      `The instalments (${installmentsTotalCents}) sum to less than the rescheduled amount (${input.plannedAmountCents})`,
    )
  }
  return {
    installmentsTotalCents,
    totalInterestCents: installmentsTotalCents - input.plannedAmountCents,
    remainingCents,
    nextInstallment,
  }
}
