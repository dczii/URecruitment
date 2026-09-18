-- A rejected file (scan, unsupported type, too large, no usable text) is definitive and not retried, unlike a transient error.

alter table public.cv_files drop constraint if exists cv_files_parse_status_check;
alter table public.cv_files add constraint cv_files_parse_status_check
  check (parse_status in ('pending', 'processing', 'parsed', 'error', 'rejected'));
