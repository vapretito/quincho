CREATE SCHEMA IF NOT EXISTS riviera;
CREATE TABLE IF NOT EXISTS riviera.users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 dni varchar(30) UNIQUE NOT NULL,
 name varchar(100) NOT NULL,
 department varchar(30) NOT NULL,
 password_hash text NOT NULL,
 role text NOT NULL DEFAULT 'resident' CHECK (role IN ('resident','admin')),
 status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
 must_change_password boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE riviera.users ADD COLUMN IF NOT EXISTS email varchar(254);
ALTER TABLE riviera.users ADD COLUMN IF NOT EXISTS phone varchar(30);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON riviera.users(email) WHERE email IS NOT NULL;
CREATE TABLE IF NOT EXISTS riviera.sessions (
 token_hash text PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES riviera.users(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON riviera.sessions(user_id);
ALTER TABLE riviera.users ALTER COLUMN dni TYPE varchar(30);
CREATE TABLE IF NOT EXISTS riviera.settings (
 id integer PRIMARY KEY CHECK(id=1),
 rules text NOT NULL,
 advance_days integer NOT NULL DEFAULT 90 CHECK(advance_days BETWEEN 1 AND 365),
 cancellation_hours integer NOT NULL DEFAULT 0 CHECK(cancellation_hours BETWEEN 0 AND 168),
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO riviera.settings(id,rules) VALUES(1,'1. Reservas\nEl quincho cuenta con dos turnos diarios. El turno de mediodía es de lunes a viernes de 11:00 a 15:00 h y sábados y domingos de 11:00 a 16:00 h. El turno nocturno es de domingo a jueves de 20:00 a 00:00 h y viernes y sábados de 20:00 a 03:00 h. Cada turno admite una sola reserva. Para reservar es necesario registrarse e iniciar sesión.\n\n2. Responsabilidad del residente\nLa persona que reserva es responsable del uso del espacio y de sus invitados. Los datos de nombre, DNI y departamento deben ser correctos.\n\n3. Cuidado del espacio\nDejá el quincho limpio y ordenado, retirá los residuos y cuidá el mobiliario y los elementos de uso común.\n\n4. Convivencia\nRespetá el descanso de los vecinos y las indicaciones de la administración. Consultá a la administración los horarios de finalización y las condiciones particulares de uso.\n\n5. Cancelaciones\nSi no vas a utilizar el turno, cancelá la reserva desde Mis reservas para que otro residente pueda usarlo.\n\nEstas pautas iniciales deben ser revisadas por la administración del edificio.') ON CONFLICT(id) DO NOTHING;
CREATE TABLE IF NOT EXISTS riviera.bookings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 date date NOT NULL,
 slot integer NOT NULL CHECK(slot IN(11,20)),
 user_id uuid REFERENCES riviera.users(id),
 status text NOT NULL DEFAULT 'confirmed' CHECK(status IN('confirmed','blocked','cancelled')),
 note varchar(500) NOT NULL DEFAULT '',
 created_by uuid NOT NULL REFERENCES riviera.users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 cancelled_at timestamptz,
 cancelled_by uuid REFERENCES riviera.users(id),
 CHECK(status <> 'confirmed' OR user_id IS NOT NULL)
);
ALTER TABLE riviera.bookings ADD COLUMN IF NOT EXISTS attended boolean;
ALTER TABLE riviera.bookings DROP CONSTRAINT IF EXISTS bookings_slot_check;
UPDATE riviera.bookings SET slot=11 WHERE slot=12;
ALTER TABLE riviera.bookings ADD CONSTRAINT bookings_slot_check CHECK(slot IN(11,20));
ALTER TABLE riviera.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE riviera.bookings ADD CONSTRAINT bookings_status_check CHECK(status IN('confirmed','waitlisted','blocked','cancelled'));
DROP INDEX IF EXISTS riviera.bookings_unique_slot;
CREATE UNIQUE INDEX IF NOT EXISTS bookings_unique_slot ON riviera.bookings(date,slot) WHERE status IN('confirmed','blocked');
CREATE INDEX IF NOT EXISTS bookings_user_idx ON riviera.bookings(user_id,date);
CREATE INDEX IF NOT EXISTS bookings_waitlist_promotion_idx ON riviera.bookings(date,slot,created_at) WHERE status='waitlisted';
CREATE TABLE IF NOT EXISTS riviera.audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor_id uuid REFERENCES riviera.users(id),
 action text NOT NULL,
 target_id text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS riviera.rate_limits (
 key text PRIMARY KEY,
 count integer NOT NULL DEFAULT 1,
 reset_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS riviera.penalty_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES riviera.users(id),
 booking_id uuid REFERENCES riviera.bookings(id),
 description varchar(1000) NOT NULL,
 created_by uuid NOT NULL REFERENCES riviera.users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 read_at timestamptz
);
CREATE INDEX IF NOT EXISTS penalty_messages_user_idx ON riviera.penalty_messages(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS riviera.notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES riviera.users(id) ON DELETE CASCADE,
 type text NOT NULL CHECK(type IN('penalty','waitlist','booking')),
 title varchar(160) NOT NULL,
 body varchar(1000) NOT NULL,
 url varchar(500) NOT NULL DEFAULT '/#mine',
 read_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON riviera.notifications(user_id,created_at DESC);
ALTER TABLE riviera.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE riviera.notifications ADD CONSTRAINT notifications_type_check CHECK(type IN('penalty','waitlist','booking'));
CREATE TABLE IF NOT EXISTS riviera.push_subscriptions (
 endpoint text PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES riviera.users(id) ON DELETE CASCADE,
 p256dh varchar(500) NOT NULL,
 auth varchar(500) NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON riviera.push_subscriptions(user_id);
