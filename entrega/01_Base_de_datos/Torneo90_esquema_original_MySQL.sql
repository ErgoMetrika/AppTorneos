-- =====================================================
-- Proyecto Integrador - Programación 4 (UTN Haedo)
-- Web de torneos de fútbol (5/7/9/11) por eliminación directa - 7 tablas
-- MySQL 8 / MariaDB 10.4+ (XAMPP)
-- =====================================================

CREATE DATABASE IF NOT EXISTS torneos
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE torneos;

-- -----------------------------------------------------
-- USUARIOS (req. 3: 2 niveles, password encriptada)
-- Un usuario puede ser admin y no ser jugador.
-- -----------------------------------------------------
CREATE TABLE usuarios (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(80)  NOT NULL,
  email         VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,            -- password_hash() de PHP
  rol           ENUM('admin','general') NOT NULL DEFAULT 'general',
  creado_en     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- CONTACTOS (req. 5: formulario + mail())
-- -----------------------------------------------------
CREATE TABLE contactos (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre    VARCHAR(80)  NOT NULL,
  email     VARCHAR(120) NOT NULL,
  mensaje   TEXT         NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- TORNEOS (contenido principal, req. 2)
-- tipo_futbol = jugadores en cancha; min por equipo = tipo + 2 suplentes
-- max_equipos potencia de 2 para que la llave cierre sin "libres"
-- -----------------------------------------------------
CREATE TABLE torneos (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(120) NOT NULL,
  descripcion   TEXT,
  tipo_futbol   TINYINT UNSIGNED NOT NULL,          -- 5, 7, 9 u 11
  max_equipos   TINYINT UNSIGNED NOT NULL DEFAULT 8, -- 2, 4, 8 o 16
  visibilidad   ENUM('publico','privado') NOT NULL DEFAULT 'publico',
  codigo_acceso CHAR(6) DEFAULT NULL,               -- solo si privado; lo genera PHP
  fecha         DATE NOT NULL,
  lugar         VARCHAR(160),
  estado        ENUM('inscripcion','en_curso','finalizado') NOT NULL DEFAULT 'inscripcion',
  CONSTRAINT chk_tipo_futbol CHECK (tipo_futbol IN (5,7,9,11)),
  CONSTRAINT chk_max_equipos CHECK (max_equipos IN (2,4,8,16)),
  INDEX idx_torneo_estado (estado)
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- EQUIPOS (sin capitán; se entra con codigo_equipo)
-- -----------------------------------------------------
CREATE TABLE equipos (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(80) NOT NULL UNIQUE,
  codigo_equipo CHAR(6)     NOT NULL UNIQUE,        -- lo genera PHP al crear el equipo
  creado_en     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- JUGADORES
-- 1 usuario = como máximo 1 jugador (UNIQUE usuario_id)
-- 1 jugador = exactamente 1 equipo (equipo_id NOT NULL)
-- El perfil de jugador se crea cuando el usuario se suma a un equipo con el código.
-- -----------------------------------------------------
CREATE TABLE jugadores (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT UNSIGNED NOT NULL UNIQUE,
  equipo_id  INT UNSIGNED NOT NULL,
  posicion   ENUM('arquero','defensor','mediocampista','delantero') NOT NULL,
  unido_en   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_jug_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_jug_equipo  FOREIGN KEY (equipo_id)  REFERENCES equipos(id)  ON DELETE CASCADE,
  INDEX idx_jug_equipo (equipo_id)
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- TORNEO_EQUIPOS (inscripción directa, sin estado)
-- PHP valida antes del INSERT:
--   torneo.estado = 'inscripcion'
--   COUNT(torneo_equipos) < max_equipos
--   COUNT(jugadores del equipo) >= tipo_futbol + 2
--   si privado: codigo_acceso correcto
-- -----------------------------------------------------
CREATE TABLE torneo_equipos (
  torneo_id    INT UNSIGNED NOT NULL,
  equipo_id    INT UNSIGNED NOT NULL,
  inscripto_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (torneo_id, equipo_id),            -- evita doble inscripción
  CONSTRAINT fk_te_torneo FOREIGN KEY (torneo_id) REFERENCES torneos(id) ON DELETE CASCADE,
  CONSTRAINT fk_te_equipo FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- PARTIDOS (llaves de eliminación directa)
-- ronda 1 = primera ronda; la final es la ronda log2(max_equipos)
-- llave = posición dentro de la ronda (1..N)
-- equipos NULL hasta que la llave anterior se resuelva
-- Al pasar a 'finalizado', PHP calcula ganador_id:
--   goles distintos -> el que hizo más
--   empate          -> el que ganó los penales (obligatorio cargarlos)
-- y lo copia a partido_siguiente_id en el lado indicado por lado_siguiente.
-- -----------------------------------------------------
CREATE TABLE partidos (
  id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  torneo_id            INT UNSIGNED NOT NULL,
  ronda                TINYINT UNSIGNED NOT NULL,
  llave                TINYINT UNSIGNED NOT NULL,
  equipo_local_id      INT UNSIGNED DEFAULT NULL,
  equipo_visitante_id  INT UNSIGNED DEFAULT NULL,
  goles_local          TINYINT UNSIGNED NOT NULL DEFAULT 0,
  goles_visitante      TINYINT UNSIGNED NOT NULL DEFAULT 0,
  penales_local        TINYINT UNSIGNED DEFAULT NULL,   -- solo si hubo empate
  penales_visitante    TINYINT UNSIGNED DEFAULT NULL,
  estado               ENUM('pendiente','en_curso','finalizado') NOT NULL DEFAULT 'pendiente',
  ganador_id           INT UNSIGNED DEFAULT NULL,
  partido_siguiente_id INT UNSIGNED DEFAULT NULL,
  lado_siguiente       ENUM('local','visitante') DEFAULT NULL,
  fecha                DATETIME DEFAULT NULL,
  UNIQUE KEY uq_partido_ronda_llave (torneo_id, ronda, llave),
  CONSTRAINT fk_par_torneo    FOREIGN KEY (torneo_id)           REFERENCES torneos(id) ON DELETE CASCADE,
  CONSTRAINT fk_par_local     FOREIGN KEY (equipo_local_id)     REFERENCES equipos(id),
  CONSTRAINT fk_par_visitante FOREIGN KEY (equipo_visitante_id) REFERENCES equipos(id),
  CONSTRAINT fk_par_ganador   FOREIGN KEY (ganador_id)          REFERENCES equipos(id),
  CONSTRAINT fk_par_siguiente FOREIGN KEY (partido_siguiente_id) REFERENCES partidos(id) ON DELETE SET NULL,
  CONSTRAINT chk_equipos_distintos CHECK (equipo_local_id IS NULL OR equipo_visitante_id IS NULL OR equipo_local_id <> equipo_visitante_id)
) ENGINE=InnoDB;

-- =====================================================
-- DATOS DE PRUEBA
-- Todas las contraseñas son "1234"
-- =====================================================
INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES
('Admin',    'admin@torneos.com', '$2y$10$IC0Q4Sz01uk0cUfoFmJvoeTd54KrNck8h7Rab3jnyD6kYZnJAlEiu', 'admin'),
('Lucas',    'lucas@mail.com',    '$2y$10$IC0Q4Sz01uk0cUfoFmJvoeTd54KrNck8h7Rab3jnyD6kYZnJAlEiu', 'general'),
('Sofia',    'sofia@mail.com',    '$2y$10$IC0Q4Sz01uk0cUfoFmJvoeTd54KrNck8h7Rab3jnyD6kYZnJAlEiu', 'general'),
('Mateo',    'mateo@mail.com',    '$2y$10$IC0Q4Sz01uk0cUfoFmJvoeTd54KrNck8h7Rab3jnyD6kYZnJAlEiu', 'general'),
('Valen',    'valen@mail.com',    '$2y$10$IC0Q4Sz01uk0cUfoFmJvoeTd54KrNck8h7Rab3jnyD6kYZnJAlEiu', 'general'),
('Franco',   'franco@mail.com',   '$2y$10$IC0Q4Sz01uk0cUfoFmJvoeTd54KrNck8h7Rab3jnyD6kYZnJAlEiu', 'general'),
('Cami',     'cami@mail.com',     '$2y$10$IC0Q4Sz01uk0cUfoFmJvoeTd54KrNck8h7Rab3jnyD6kYZnJAlEiu', 'general'),
('Nico',     'nico@mail.com',     '$2y$10$IC0Q4Sz01uk0cUfoFmJvoeTd54KrNck8h7Rab3jnyD6kYZnJAlEiu', 'general'),
('Agus',     'agus@mail.com',     '$2y$10$IC0Q4Sz01uk0cUfoFmJvoeTd54KrNck8h7Rab3jnyD6kYZnJAlEiu', 'general'),
('Tomi',     'tomi@mail.com',     '$2y$10$IC0Q4Sz01uk0cUfoFmJvoeTd54KrNck8h7Rab3jnyD6kYZnJAlEiu', 'general'),
('Juanma',   'juanma@mail.com',   '$2y$10$IC0Q4Sz01uk0cUfoFmJvoeTd54KrNck8h7Rab3jnyD6kYZnJAlEiu', 'general'),
('Santi',    'santi@mail.com',    '$2y$10$IC0Q4Sz01uk0cUfoFmJvoeTd54KrNck8h7Rab3jnyD6kYZnJAlEiu', 'general'),
('Fede',     'fede@mail.com',     '$2y$10$IC0Q4Sz01uk0cUfoFmJvoeTd54KrNck8h7Rab3jnyD6kYZnJAlEiu', 'general'),
('Ramiro',   'ramiro@mail.com',   '$2y$10$IC0Q4Sz01uk0cUfoFmJvoeTd54KrNck8h7Rab3jnyD6kYZnJAlEiu', 'general'),
('Lautaro',  'lautaro@mail.com',  '$2y$10$IC0Q4Sz01uk0cUfoFmJvoeTd54KrNck8h7Rab3jnyD6kYZnJAlEiu', 'general');

INSERT INTO torneos (nombre, descripcion, tipo_futbol, max_equipos, visibilidad, codigo_acceso, fecha, lugar, estado) VALUES
('Copa Fútbol 5 - Abierta', 'Torneo abierto de fútbol 5, eliminación directa.', 5, 4, 'publico', NULL,
 '2025-11-15', 'Complejo El Potrero, Ramos Mejía', 'inscripcion'),
('Copa Fútbol 7 - Clubes',  'Torneo privado de fútbol 7 para clubes invitados.', 7, 8, 'privado', 'A7K2PQ',
 '2025-11-16', 'Club Social Ramos Mejía', 'inscripcion');

INSERT INTO equipos (nombre, codigo_equipo) VALUES
('Los Pibes',      'PIBES1'),
('Atlético Ramos', 'RAMOS2');

-- Los Pibes: 7 jugadores (5 + 2 suplentes, cumple para fútbol 5)
INSERT INTO jugadores (usuario_id, equipo_id, posicion) VALUES
(2, 1, 'arquero'), (3, 1, 'defensor'), (4, 1, 'defensor'),
(5, 1, 'mediocampista'), (6, 1, 'delantero'), (7, 1, 'delantero'), (8, 1, 'mediocampista'),
-- Atlético Ramos: 7 jugadores
(9, 2, 'arquero'), (10, 2, 'defensor'), (11, 2, 'defensor'),
(12, 2, 'mediocampista'), (13, 2, 'mediocampista'), (14, 2, 'delantero'), (15, 2, 'delantero');

INSERT INTO torneo_equipos (torneo_id, equipo_id) VALUES
(1, 1), (1, 2);

INSERT INTO contactos (nombre, email, mensaje) VALUES
('Juan Pérez', 'juan@mail.com', '¿Puedo anotar a mi equipo sin tener los 7 jugadores cargados?');

-- =====================================================
-- VISTAS ÚTILES
-- =====================================================

-- Cantidad de jugadores e inscriptos por torneo/equipo (para validar inscripción)
CREATE OR REPLACE VIEW v_equipo_plantel AS
SELECT e.id AS equipo_id, e.nombre AS equipo, COUNT(j.id) AS cant_jugadores
FROM equipos e
LEFT JOIN jugadores j ON j.equipo_id = e.id
GROUP BY e.id, e.nombre;

-- Llave completa con nombres de equipos (para dibujar el cuadro)
CREATE OR REPLACE VIEW v_llave AS
SELECT
  p.id, p.torneo_id, p.ronda, p.llave, p.estado, p.fecha,
  el.nombre AS local,     p.goles_local,     p.penales_local,
  ev.nombre AS visitante, p.goles_visitante, p.penales_visitante,
  eg.nombre AS ganador,
  p.partido_siguiente_id, p.lado_siguiente
FROM partidos p
LEFT JOIN equipos el ON el.id = p.equipo_local_id
LEFT JOIN equipos ev ON ev.id = p.equipo_visitante_id
LEFT JOIN equipos eg ON eg.id = p.ganador_id
ORDER BY p.torneo_id, p.ronda, p.llave;
