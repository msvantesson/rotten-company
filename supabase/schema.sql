-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE categories (
    id bigint NOT NULL,
    name text NOT NULL,
    slug text NOT NULL
);

CREATE TABLE companies (
    id bigint NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    country text,
    industry text,
    size_employees integer,
    website text,
    rotten_score numeric,
    owner_investor_id bigint
);

CREATE TABLE company_ownerships (
    id bigint NOT NULL,
    company_id bigint NOT NULL,
    owner_id bigint NOT NULL,
    ownership_type text,
    ownership_start date,
    ownership_end date,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE company_request_leader_tenures (
    id bigint NOT NULL,
    company_request_id bigint NOT NULL,
    leader_id bigint NOT NULL,
    role text,
    started_at date,
    ended_at date,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE company_requests (
    id bigint NOT NULL,
    name text NOT NULL,
    country text,
    website text,
    description text,
    why text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    user_id uuid,
    assigned_moderator_id uuid,
    assigned_at timestamp with time zone,
    moderator_id uuid,
    moderated_at timestamp with time zone,
    decision_reason text,
    approved_company_id bigint,
    slug text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE evidence (
    id bigint NOT NULL,
    entity_type text,
    entity_id bigint,
    company_id bigint,
    leader_id bigint,
    manager_id bigint,
    owner_id bigint,
    company_request_id bigint,
    title text NOT NULL,
    summary text,
    category integer,
    category_id integer,
    user_id uuid,
    status text NOT NULL DEFAULT 'pending',
    assigned_moderator_id uuid,
    assigned_at timestamp with time zone,
    evidence_type text,
    file_url text,
    file_path text,
    file_type text,
    file_size integer,
    severity integer,
    severity_suggested integer,
    recency_weight numeric,
    file_weight numeric,
    total_weight numeric,
    contributor_note text,
    resubmits_evidence_id bigint,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE leader_compensation (
    id bigint NOT NULL,
    leader_id bigint NOT NULL,
    pay_ratio numeric,
    total_compensation numeric,
    year integer,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE leader_tenures (
    id bigint NOT NULL,
    leader_id bigint NOT NULL,
    company_id bigint NOT NULL,
    started_at timestamp with time zone NOT NULL,
    ended_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE leaders (
    id bigint NOT NULL,
    name text NOT NULL,
    role text,
    slug text NOT NULL,
    company_id bigint
);

CREATE TABLE managers (
    id bigint NOT NULL,
    name text,
    role text,
    slug text,
    company_id bigint NOT NULL
);

CREATE TABLE moderation_actions (
    id bigint NOT NULL,
    moderator_id uuid NOT NULL,
    target_type text NOT NULL,
    target_id text NOT NULL,
    action text NOT NULL,
    moderator_note text,
    source text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE moderation_events (
    id bigint NOT NULL,
    evidence_id bigint NOT NULL,
    moderator_id uuid NOT NULL,
    action text NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE moderation_votes (
    id bigint NOT NULL,
    evidence_id bigint NOT NULL,
    moderator_id uuid NOT NULL,
    vote text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE moderators (
    user_id uuid NOT NULL
);

CREATE TABLE notification_jobs (
    id bigint NOT NULL,
    recipient_email text NOT NULL,
    subject text,
    body text,
    metadata jsonb,
    status text DEFAULT 'pending',
    attempts integer DEFAULT 0,
    last_error text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE owners_investors (
    id bigint NOT NULL,
    name text NOT NULL,
    slug text,
    country text,
    rotten_score numeric,
    company_id bigint
);

CREATE TABLE ownership_signals (
    id bigint NOT NULL,
    company_id bigint NOT NULL,
    signal_type text NOT NULL,
    signal_value text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE ownership_tags (
    id bigint NOT NULL,
    company_id bigint NOT NULL,
    tag text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE password_reset_tokens (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE ratings (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    company_id bigint NOT NULL,
    category integer NOT NULL,
    score integer NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE score_recalculation_logs (
    id bigint NOT NULL,
    company_id bigint,
    old_score numeric,
    new_score numeric,
    recalculated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE users (
    id uuid NOT NULL,
    email text,
    name text,
    avatar_url text,
    moderation_credits integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);
