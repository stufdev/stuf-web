-- ==========================================
-- FASE 1: ENTIDADES EXTERNAS (Respetan el ID de la API)
-- ==========================================

CREATE TABLE teams (
    id INTEGER PRIMARY KEY, 
    name VARCHAR(255) NOT NULL,
    logo_url VARCHAR(500)
);

CREATE TABLE fixtures (
    id INTEGER PRIMARY KEY, 
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    league_id INTEGER NOT NULL,
    season INTEGER NOT NULL,
    home_team_id INTEGER REFERENCES teams(id),
    away_team_id INTEGER REFERENCES teams(id),
    home_goals INTEGER,
    away_goals INTEGER,
    home_goals_1h INTEGER, 
    away_goals_1h INTEGER,
    status VARCHAR(50) 
);

-- ==========================================
-- FASE 2: ENTIDADES INTERNAS (Usan UUID v4 autogenerado)
-- ==========================================

-- Estadísticas con soporte para Tiempos (1H, 2H, FT) y métricas de Adamchoi
CREATE TABLE fixture_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fixture_id INTEGER REFERENCES fixtures(id) ON DELETE CASCADE,
    team_id INTEGER REFERENCES teams(id),
    period VARCHAR(10) DEFAULT 'FT', -- 'FT' = Full Time, '1H' = First Half
    corners INTEGER DEFAULT 0,
    shots_on_target INTEGER DEFAULT 0,
    total_shots INTEGER DEFAULT 0,
    yellow_cards INTEGER DEFAULT 0, 
    red_cards INTEGER DEFAULT 0,
    fouls INTEGER DEFAULT 0,
    offsides INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    booking_points INTEGER DEFAULT 0,
    UNIQUE(fixture_id, team_id, period) -- Candado Anti-Duplicados
);

-- Eventos para tu Killer Feature (Bandera Roja 🚩)
CREATE TABLE fixture_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fixture_id INTEGER REFERENCES fixtures(id) ON DELETE CASCADE,
    team_id INTEGER REFERENCES teams(id),
    type VARCHAR(50), 
    detail VARCHAR(100), 
    minute INTEGER
);

-- El Santo Grial: Player Props (Tiros al arco por jugador, faltas, etc.)
CREATE TABLE fixture_player_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fixture_id INTEGER REFERENCES fixtures(id) ON DELETE CASCADE,
    team_id INTEGER REFERENCES teams(id),
    player_id INTEGER NOT NULL,
    player_name VARCHAR(255),
    shots_on_target INTEGER DEFAULT 0,
    fouls_committed INTEGER DEFAULT 0,
    rating VARCHAR(10),
    UNIQUE(fixture_id, player_id) -- Candado Anti-Duplicados por jugador
);

-- ==========================================
-- FASE 3: MÓDULO PREDICTIVO (+EV)
-- ==========================================

CREATE TABLE fixture_predictions (
    fixture_id INTEGER PRIMARY KEY REFERENCES fixtures(id) ON DELETE CASCADE,
    win_or_draw BOOLEAN,
    under_over_line VARCHAR(50), 
    advice TEXT
);

-- ==========================================
-- FASE 4: ÍNDICES DE VELOCIDAD (Para que el frontend vuele)
-- ==========================================

CREATE INDEX idx_fixtures_home_team ON fixtures(home_team_id);
CREATE INDEX idx_fixtures_away_team ON fixtures(away_team_id);
CREATE INDEX idx_fixtures_date ON fixtures(date DESC);
CREATE INDEX idx_fixtures_league_season ON fixtures(league_id, season);
CREATE INDEX idx_player_stats_fixture ON fixture_player_stats(fixture_id);