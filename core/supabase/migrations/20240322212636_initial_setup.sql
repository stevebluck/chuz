create table "public"."users" (
    "id" uuid not null,
    "display_name" text,
    "email" character varying(255) not null,
    "first_name" character varying(255),
    "last_name" character varying(255),
    "opt_in_marketing" boolean
);

alter table "public"."users" enable row level security;

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

alter table "public"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";
