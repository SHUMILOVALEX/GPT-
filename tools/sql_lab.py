"""Учебный SQL-практикум без внешних зависимостей. Каждый запуск — чистая БД в памяти."""
import argparse
import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def create_database():
    connection = sqlite3.connect(":memory:")
    connection.executescript((ROOT / "sql/schema.sql").read_text())
    return connection


def verify(connection):
    cases = [
        ("active по занятиям", "SELECT s.id, COUNT(b.id) FROM sessions s LEFT JOIN bookings b ON b.session_id=s.id AND b.status='active' GROUP BY s.id ORDER BY s.id", [(1, 2), (2, 1), (3, 0)]),
        ("без active", "SELECT u.id FROM users u WHERE NOT EXISTS (SELECT 1 FROM bookings b WHERE b.user_id=u.id AND b.status='active') ORDER BY u.id", [(3,), (4,)]),
        ("больше одной active", "SELECT user_id, COUNT(*) FROM bookings WHERE status='active' GROUP BY user_id HAVING COUNT(*)>1", [(1, 2)]),
        ("окно", "SELECT id,user_id,ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at,id) FROM bookings ORDER BY user_id,created_at,id", [(1, 1, 1), (3, 1, 2), (2, 2, 1), (4, 3, 1)]),
    ]
    for name, query, expected in cases:
        actual = connection.execute(query).fetchall()
        if actual != expected:
            raise AssertionError(f"{name}: {actual} != {expected}")
        print(f"PASS {name}: {actual}")


def run_file(connection, path):
    # complete_statement учитывает точки с запятой в строках и комментариях.
    pending = ""
    count = 0
    for char in Path(path).read_text():
        pending += char
        if char == ";" and sqlite3.complete_statement(pending):
            cursor = connection.execute(pending)
            if cursor.description:
                print(json.dumps({"columns": [c[0] for c in cursor.description], "rows": cursor.fetchall()}, ensure_ascii=False))
                count += 1
            pending = ""
    # Разрешить последний запрос без ; и не считать комментарии выполнением.
    if pending.strip():
        cursor = connection.execute(pending)
        if cursor.description:
            print(json.dumps({"columns": [c[0] for c in cursor.description], "rows": cursor.fetchall()}, ensure_ascii=False))
            count += 1
    if count == 0:
        raise SystemExit("Ни один запрос с результатом не выполнен. Добавьте SELECT в файл упражнений.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--query-file", help="Файл с вашими SQL-запросами")
    args = parser.parse_args()
    with create_database() as db:
        if args.query_file:
            run_file(db, args.query_file)
        else:
            print("Учебные данные созданы в памяти. Контрольные запросы:")
            verify(db)
            print("Ваши запросы: python3 tools/sql_lab.py --query-file sql/exercises.sql")
