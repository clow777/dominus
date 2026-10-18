-- Proteção de `transactions`: o registro financeiro não pode ser apagado e seus campos
-- imutáveis não mudam. O status continua evoluindo (máquina de estados da aplicação).
-- Idempotente: pode ser reaplicado.

CREATE OR REPLACE FUNCTION dominus_protect_transactions() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' OR TG_OP = 'TRUNCATE' THEN
    RAISE EXCEPTION 'A tabela transactions não permite %. Use estorno/lançamento compensatório.', TG_OP
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NEW.amount IS DISTINCT FROM OLD.amount
     OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.payment_intent_id IS DISTINCT FROM OLD.payment_intent_id
     OR NEW.public_id IS DISTINCT FROM OLD.public_id
     OR NEW.currency IS DISTINCT FROM OLD.currency
     OR NEW.mode IS DISTINCT FROM OLD.mode THEN
    RAISE EXCEPTION 'Campos financeiros de transactions são imutáveis.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS transactions_protect_row ON transactions;
CREATE TRIGGER transactions_protect_row
  BEFORE UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION dominus_protect_transactions();

DROP TRIGGER IF EXISTS transactions_no_truncate ON transactions;
CREATE TRIGGER transactions_no_truncate
  BEFORE TRUNCATE ON transactions
  FOR EACH STATEMENT EXECUTE FUNCTION dominus_protect_transactions();
