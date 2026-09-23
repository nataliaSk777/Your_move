CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    first_name TEXT,
    username TEXT,
    timezone TEXT DEFAULT 'Europe/Moscow',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_points (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    emoji TEXT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 1,
    last_supported_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, code)
);

CREATE TABLE IF NOT EXISTS daily_actions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    support_point_id BIGINT NOT NULL REFERENCES support_points(id) ON DELETE CASCADE,

    action_date DATE NOT NULL,
    action_text TEXT NOT NULL,
    waterfall_text TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'offered'
        CHECK (status IN ('offered', 'completed', 'changed', 'skipped')),

    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, action_date)
);

CREATE TABLE IF NOT EXISTS daily_results (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_id BIGINT REFERENCES daily_actions(id) ON DELETE SET NULL,

    result_date DATE NOT NULL,
    day_won BOOLEAN NOT NULL DEFAULT FALSE,
    support_score INTEGER DEFAULT 0
        CHECK (support_score BETWEEN 0 AND 10),

    celebration_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, result_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_actions_user_date
ON daily_actions(user_id, action_date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_results_user_date
ON daily_results(user_id, result_date DESC);

CREATE INDEX IF NOT EXISTS idx_support_points_user
ON support_points(user_id);
