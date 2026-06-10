import os
import psycopg2
import psycopg2.extras
from psycopg2 import pool as pg_pool
from config import DATABASE_URL

_pool = None

def get_pool():
    global _pool
    if _pool is None:
        _pool = pg_pool.ThreadedConnectionPool(1, 10, DATABASE_URL)
    return _pool

def get_conn():
    conn = get_pool().getconn()
    if conn.closed:
        try:
            get_pool().putconn(conn, close=True)
        except Exception:
            pass
        conn = get_pool().getconn()
    try:
        from pgvector.psycopg2 import register_vector
        register_vector(conn)
    except Exception:
        pass
    return conn

def put_conn(conn):
    try:
        if conn and conn.closed:
            get_pool().putconn(conn, close=True)
        else:
            get_pool().putconn(conn)
    except Exception:
        pass

def query(sql, params=None, fetch="all"):
    """
    Convenience wrapper.
    fetch: 'all' | 'one' | 'none'
    Returns list[dict] | dict | None
    """

    conn = get_conn()
    cur = None
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        cur.execute(sql, params or ())
        conn.commit()
        if fetch == "all":
            return [dict(r) for r in cur.fetchall()]
        if fetch == "one":
            row = cur.fetchone()
            return dict(row) if row else None
        return None
    except Exception as e:
        try:
            if conn and not conn.closed:
                conn.rollback()
        except Exception:
            pass
        raise e
    finally:
        if cur:
            cur.close()
        put_conn(conn)


def init_db():
    """Run schema.sql to create tables if they don't exist."""
    schema_path = os.path.join(os.path.dirname(__file__),"schema.sql")
    conn = None
    cur = None
    try:
        conn = get_conn()
        with open(schema_path,"r") as f:
            sql = f.read()

        cur = conn.cursor()
        cur.execute(sql)
        conn.commit()
        print("[DB] Schema initialized successfully.")
    except Exception as e:
        try:
            if conn and not conn.closed:
                conn.rollback()
        except Exception:
            pass
        print(f"[DB] Schema init note: {e}")

    finally:
        if cur:
            cur.close()
        put_conn(conn)