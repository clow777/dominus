-- Dominus Payments — proteção de registros históricos.
-- Aplicar como migração customizada logo após a migração inicial:
--   npx drizzle-kit generate --custom --name immutability
--   (copie este conteúdo para o arquivo gerado em drizzle/) e rode npm run db:migrate
--
-- ledger_entries, transaction_events e audit_logs são append-only.
-- Correções financeiras são feitas com lançamentos compensatórios, nunca UPDATE/DELETE.

CREATE OR REPLACE FUNCTION dominus_forbid_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'A tabela % é somente inserção (append-only). Use um lançamento compensatório.', TG_TABLE_NAME
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ledger_entries_append_only
  BEFORE UPDATE OR DELETE ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION dominus_forbid_mutation();

CREATE TRIGGER transaction_events_append_only
  BEFORE UPDATE OR DELETE ON transaction_events
  FOR EACH ROW EXECUTE FUNCTION dominus_forbid_mutation();

CREATE TRIGGER audit_logs_append_only
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION dominus_forbid_mutation();

-- Cada diário (journal_id) do ledger precisa fechar: débitos = créditos.
-- Verificação adiada para o fim da transação do banco, quando todas as partidas já foram inseridas.
CREATE OR REPLACE FUNCTION dominus_check_journal_balance() RETURNS trigger AS $$
DECLARE
  imbalance bigint;
BEGIN
  SELECT COALESCE(SUM(CASE WHEN direction = 'debit' THEN amount ELSE -amount END), 0)
    INTO imbalance
    FROM ledger_entries
   WHERE journal_id = NEW.journal_id;
  IF imbalance <> 0 THEN
    RAISE EXCEPTION 'Diário % desbalanceado em % centavos.', NEW.journal_id, imbalance;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER ledger_entries_balanced
  AFTER INSERT ON ledger_entries
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION dominus_check_journal_balance();

-- TRUNCATE não dispara gatilhos de linha: bloqueia também no nível de comando.
CREATE TRIGGER ledger_entries_no_truncate
  BEFORE TRUNCATE ON ledger_entries
  FOR EACH STATEMENT EXECUTE FUNCTION dominus_forbid_mutation();

CREATE TRIGGER transaction_events_no_truncate
  BEFORE TRUNCATE ON transaction_events
  FOR EACH STATEMENT EXECUTE FUNCTION dominus_forbid_mutation();

CREATE TRIGGER audit_logs_no_truncate
  BEFORE TRUNCATE ON audit_logs
  FOR EACH STATEMENT EXECUTE FUNCTION dominus_forbid_mutation();
