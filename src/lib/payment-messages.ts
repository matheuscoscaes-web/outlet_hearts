// Motivos de recusa do Mercado Pago (status_detail), traduzidos pra algo
// que o cliente entenda e consiga corrigir.
const REJECTION_MESSAGES: Record<string, string> = {
  cc_rejected_bad_filled_card_number: "Número do cartão inválido. Confira e tente de novo.",
  cc_rejected_bad_filled_date: "Data de validade do cartão inválida. Confira e tente de novo.",
  cc_rejected_bad_filled_security_code: "Código de segurança (CVV) inválido. Confira e tente de novo.",
  cc_rejected_bad_filled_other: "Dados do cartão incorretos. Confira e tente de novo.",
  cc_rejected_bad_filled_document: "CPF do titular do cartão incorreto. Confira e tente de novo.",
  cc_rejected_invalid_installments: "Esse cartão não aceita a quantidade de parcelas escolhida. Tente com menos parcelas.",
  cc_rejected_call_for_authorize: "O banco pediu autorização manual pra esse pagamento. Ligue pra sua operadora de cartão ou tente outro cartão.",
  cc_rejected_card_disabled: "Esse cartão está desabilitado. Entre em contato com seu banco ou tente outro cartão.",
  cc_rejected_card_error: "Não foi possível processar esse cartão. Tente outro cartão.",
  cc_rejected_duplicated_payment: "Já existe um pagamento com esses mesmos dados. Se não foi você, tente novamente em alguns minutos.",
  cc_rejected_high_risk: "Esse pagamento foi recusado por segurança. Tente outro cartão ou outra forma de pagamento.",
  cc_rejected_insufficient_amount: "Saldo ou limite insuficiente nesse cartão.",
  cc_rejected_max_attempts: "Número máximo de tentativas atingido. Tente outro cartão.",
  cc_rejected_other_reason: "O cartão recusou o pagamento. Tente outro cartão ou outra forma de pagamento.",
};

export function translatePaymentRejection(statusDetail: string | null | undefined): string {
  if (statusDetail && REJECTION_MESSAGES[statusDetail]) {
    return REJECTION_MESSAGES[statusDetail];
  }
  return "Pagamento recusado. Verifique os dados do cartão e tente novamente, ou use outra forma de pagamento.";
}
