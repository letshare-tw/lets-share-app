CREATE SCHEMA gate1_checks;
GRANT USAGE ON SCHEMA gate1_checks TO authenticated,anon;
CREATE TABLE gate1_checks.results(name text PRIMARY KEY,role_name text NOT NULL,observed_sqlstate text NOT NULL);
GRANT INSERT,SELECT ON gate1_checks.results TO authenticated,anon;
CREATE FUNCTION gate1_checks.ok(name text,value boolean) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF value IS DISTINCT FROM true THEN RAISE EXCEPTION 'ASSERTION FAILED: %',name;END IF;
 INSERT INTO gate1_checks.results VALUES(name,current_user,'00000');
 RAISE NOTICE 'PASS: % (role=%)',name,current_user;
END $$;
CREATE FUNCTION gate1_checks.error(name text,statement text,expected text,fragment text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE actual text:='00000';message text:='';
BEGIN
 BEGIN EXECUTE statement;
 EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS actual=RETURNED_SQLSTATE,message=MESSAGE_TEXT;
 END;
 IF actual<>expected OR (fragment IS NOT NULL AND strpos(message,fragment)=0) THEN
  RAISE EXCEPTION 'ASSERTION FAILED: %, expected %/% observed %/%',name,expected,fragment,actual,message;
 END IF;
 INSERT INTO gate1_checks.results VALUES(name,current_user,actual);
 RAISE NOTICE 'PASS: % (role=%,SQLSTATE=%)',name,current_user,actual;
END $$;
