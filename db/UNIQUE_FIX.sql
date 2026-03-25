ALTER TABLE public.projects 
ADD CONSTRAINT projects_submission_id_key UNIQUE (submission_id);

ALTER TABLE public.clients
ADD CONSTRAINT clients_submission_id_key UNIQUE (submission_id);
