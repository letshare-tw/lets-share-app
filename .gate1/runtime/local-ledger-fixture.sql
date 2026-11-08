INSERT INTO dev01b_test.runs(run_id,create_until,cleanup_until)
VALUES('dev01b-v5-0123456789abcdef',now()+interval '20 minutes',now()+interval '40 minutes');
