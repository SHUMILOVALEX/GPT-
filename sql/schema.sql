PRAGMA foreign_keys = ON;
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0)
);
CREATE TABLE bookings (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  session_id INTEGER NOT NULL REFERENCES sessions(id),
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled')),
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX one_active_booking
  ON bookings(user_id, session_id) WHERE status = 'active';
INSERT INTO users VALUES (1,'Аня'),(2,'Борис'),(3,'Вера'),(4,'Глеб');
INSERT INTO sessions VALUES
  (1,'Йога','2027-01-20T10:00:00Z',2),
  (2,'Растяжка','2027-01-20T12:00:00Z',3),
  (3,'Пилатес','2027-01-20T14:00:00Z',4);
INSERT INTO bookings VALUES
  (1,1,1,'active','2027-01-10T10:00:00Z'),
  (2,2,1,'active','2027-01-10T11:00:00Z'),
  (3,1,2,'active','2027-01-11T10:00:00Z'),
  (4,3,2,'cancelled','2027-01-11T11:00:00Z');
