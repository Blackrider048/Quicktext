package postgres

import (
	"context"
	"database/sql"
	"log/slog"
	"time"

	// Import the PostgreSQL driver.
	_ "github.com/lib/pq"
	"github.com/pkg/errors"

	"github.com/usememos/memos/internal/profile"
	"github.com/usememos/memos/store"
)

type DB struct {
	db      *sql.DB
	profile *profile.Profile
}

func NewDB(profile *profile.Profile) (store.Driver, error) {
	if profile == nil {
		return nil, errors.New("profile is nil")
	}

	// Open the PostgreSQL connection.
	db, err := sql.Open("postgres", profile.DSN)
	if err != nil {
		slog.Error("failed to open database", "error", err)
		return nil, errors.Wrapf(err, "failed to open database: %s", profile.DSN)
	}

	// Connection pool tuning for hosted PostgreSQL (Supabase, Neon, etc.).
	// Supabase free-tier pooler allows ~60 connections; keep well below that.
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	// Fail fast if the DSN is wrong or the database is unreachable.
	if err := db.Ping(); err != nil {
		db.Close()
		return nil, errors.Wrap(err, "failed to ping database")
	}

	var driver store.Driver = &DB{
		db:      db,
		profile: profile,
	}

	return driver, nil
}

func (d *DB) GetDB() *sql.DB {
	return d.db
}

func (d *DB) Close() error {
	return d.db.Close()
}

func (d *DB) IsInitialized(ctx context.Context) (bool, error) {
	var exists bool
	err := d.db.QueryRowContext(ctx, "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_catalog = current_database() AND table_name = 'memo' AND table_type = 'BASE TABLE')").Scan(&exists)
	if err != nil {
		return false, errors.Wrap(err, "failed to check if database is initialized")
	}
	return exists, nil
}

// GetDatabaseSize returns the database size in bytes, or -1 if unavailable.
func (d *DB) GetDatabaseSize(ctx context.Context) (int64, error) {
	var size int64
	const q = `SELECT pg_database_size(current_database())`
	if err := d.db.QueryRowContext(ctx, q).Scan(&size); err != nil {
		return -1, errors.Wrap(err, "failed to query postgres database size")
	}
	return size, nil
}
