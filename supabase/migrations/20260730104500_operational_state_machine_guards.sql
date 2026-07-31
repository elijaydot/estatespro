CREATE OR REPLACE FUNCTION public.enforce_maintenance_request_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NOT (
    (OLD.status = 'submitted' AND NEW.status IN ('in_progress', 'cancelled'))
    OR (OLD.status = 'in_progress' AND NEW.status IN ('completed', 'cancelled'))
  ) THEN
    RAISE EXCEPTION 'Invalid maintenance status transition: % -> %', OLD.status, NEW.status
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_maintenance_request_status_transition ON public.maintenance_requests;
CREATE TRIGGER enforce_maintenance_request_status_transition
BEFORE UPDATE OF status ON public.maintenance_requests
FOR EACH ROW EXECUTE FUNCTION public.enforce_maintenance_request_status_transition();

CREATE OR REPLACE FUNCTION public.enforce_tenant_exit_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NOT (
    (OLD.status = 'inspection_pending' AND NEW.status IN ('inspection_complete', 'cancelled'))
    OR (OLD.status = 'inspection_complete' AND NEW.status IN ('deposit_decided', 'cancelled'))
    OR (OLD.status = 'deposit_decided' AND NEW.status IN ('approved', 'cancelled'))
    OR (OLD.status = 'approved' AND NEW.status IN ('completed', 'cancelled'))
  ) THEN
    RAISE EXCEPTION 'Invalid tenant exit status transition: % -> %', OLD.status, NEW.status
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_tenant_exit_status_transition ON public.tenant_exits;
CREATE TRIGGER enforce_tenant_exit_status_transition
BEFORE UPDATE OF status ON public.tenant_exits
FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_exit_status_transition();