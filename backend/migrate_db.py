#!/usr/bin/env python3
"""
Database migration script for Fleet Management System
Handles upgrading from basic to enhanced security schema
"""

import os
import sqlite3
from datetime import datetime
from werkzeug.security import generate_password_hash

def migrate_database():
    """Migrate existing database to new security schema"""
    db_path = 'instance/database.db'
    
    if not os.path.exists(db_path):
        print("No existing database found. Will create new one.")
        return
    
    print("Migrating existing database to enhanced security schema...")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if new columns exist
        cursor.execute("PRAGMA table_info(user)")
        columns = [column[1] for column in cursor.fetchall()]
        
        # Add missing columns to user table
        new_columns = [
            ('role', 'TEXT DEFAULT "user"'),
            ('is_active', 'BOOLEAN DEFAULT 1'),
            ('is_verified', 'BOOLEAN DEFAULT 0'),
            ('failed_login_attempts', 'INTEGER DEFAULT 0'),
            ('locked_until', 'DATETIME'),
            ('last_login', 'DATETIME'),
            ('password_changed_at', 'DATETIME'),
            ('mfa_enabled', 'BOOLEAN DEFAULT 0'),
            ('mfa_secret', 'TEXT'),
            ('updated_at', 'DATETIME')
        ]
        
        for column_name, column_def in new_columns:
            if column_name not in columns:
                cursor.execute(f'ALTER TABLE user ADD COLUMN {column_name} {column_def}')
                print(f"Added column: {column_name}")
        
        # Update existing admin user
        cursor.execute("SELECT id, username FROM user WHERE username = 'admin'")
        admin = cursor.fetchone()
        
        if admin:
            now = datetime.utcnow().isoformat()
            cursor.execute("""
                UPDATE user 
                SET role = 'admin', 
                    is_active = 1, 
                    is_verified = 1,
                    password_changed_at = ?,
                    updated_at = ?
                WHERE username = 'admin'
            """, (now, now))
            print("Updated admin user with security fields")
        
        # Create new security tables if they don't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_session (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                session_token TEXT UNIQUE NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME NOT NULL,
                is_active BOOLEAN DEFAULT 1,
                FOREIGN KEY (user_id) REFERENCES user (id)
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS security_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                event_type TEXT NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                details TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES user (id)
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                action TEXT NOT NULL,
                resource TEXT NOT NULL,
                resource_id TEXT,
                old_values TEXT,
                new_values TEXT,
                ip_address TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES user (id)
            )
        """)
        
        conn.commit()
        print("✅ Database migration completed successfully!")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Migration failed: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_database()