-- =============================================================
-- LAB - Seed de galería de clubes desde public/clubes/galeria
-- Generado automáticamente
-- =============================================================

-- ARIAS
DELETE FROM galeria_clubes WHERE club_id = (SELECT id FROM clubes WHERE slug = 'arias');
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'arias'), '/clubes/galeria/arias/foto-001.jpg', 'foto-001', 1);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'arias'), '/clubes/galeria/arias/foto-002.jpg', 'foto-002', 2);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'arias'), '/clubes/galeria/arias/foto-003.jpg', 'foto-003', 3);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'arias'), '/clubes/galeria/arias/foto-004.jpg', 'foto-004', 4);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'arias'), '/clubes/galeria/arias/foto-005.jpg', 'foto-005', 5);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'arias'), '/clubes/galeria/arias/foto-006.jpg', 'foto-006', 6);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'arias'), '/clubes/galeria/arias/foto-007.jpg', 'foto-007', 7);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'arias'), '/clubes/galeria/arias/foto-008.jpg', 'foto-008', 8);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'arias'), '/clubes/galeria/arias/foto-009.jpg', 'foto-009', 9);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'arias'), '/clubes/galeria/arias/foto-010.jpg', 'foto-010', 10);

-- CACHORROS
DELETE FROM galeria_clubes WHERE club_id = (SELECT id FROM clubes WHERE slug = 'cachorros');
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'cachorros'), '/clubes/galeria/cachorros/foto-001.jpeg', 'foto-001', 1);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'cachorros'), '/clubes/galeria/cachorros/foto-002.jpeg', 'foto-002', 2);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'cachorros'), '/clubes/galeria/cachorros/foto-003.jpeg', 'foto-003', 3);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'cachorros'), '/clubes/galeria/cachorros/foto-004.jpeg', 'foto-004', 4);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'cachorros'), '/clubes/galeria/cachorros/foto-005.jpeg', 'foto-005', 5);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'cachorros'), '/clubes/galeria/cachorros/foto-006.jpeg', 'foto-006', 6);

-- DAOM
DELETE FROM galeria_clubes WHERE club_id = (SELECT id FROM clubes WHERE slug = 'daom');
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-001.jpg', 'foto-001', 1);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-002.jpg', 'foto-002', 2);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-003.jpg', 'foto-003', 3);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-004.jpg', 'foto-004', 4);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-005.jpg', 'foto-005', 5);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-006.jpg', 'foto-006', 6);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-007.jpg', 'foto-007', 7);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-008.jpg', 'foto-008', 8);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-009.jpg', 'foto-009', 9);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-010.jpg', 'foto-010', 10);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-011.jpg', 'foto-011', 11);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-012.jpg', 'foto-012', 12);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-013.jpg', 'foto-013', 13);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-014.jpg', 'foto-014', 14);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-015.jpg', 'foto-015', 15);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-016.jpg', 'foto-016', 16);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-017.jpg', 'foto-017', 17);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-018.jpg', 'foto-018', 18);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-019.jpg', 'foto-019', 19);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-020.jpg', 'foto-020', 20);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-021.jpg', 'foto-021', 21);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-022.jpg', 'foto-022', 22);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-023.jpg', 'foto-023', 23);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-024.jpg', 'foto-024', 24);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-025.jpg', 'foto-025', 25);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-026.jpg', 'foto-026', 26);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-027.jpg', 'foto-027', 27);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-028.jpg', 'foto-028', 28);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-029.jpg', 'foto-029', 29);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-030.jpg', 'foto-030', 30);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-031.jpg', 'foto-031', 31);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-032.jpg', 'foto-032', 32);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-033.jpg', 'foto-033', 33);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-034.jpg', 'foto-034', 34);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-035.jpg', 'foto-035', 35);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-036.jpg', 'foto-036', 36);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-037.jpg', 'foto-037', 37);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-038.jpg', 'foto-038', 38);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-039.jpg', 'foto-039', 39);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-040.jpg', 'foto-040', 40);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-041.jpg', 'foto-041', 41);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-042.jpg', 'foto-042', 42);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-043.jpg', 'foto-043', 43);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-044.jpg', 'foto-044', 44);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-045.jpg', 'foto-045', 45);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-046.jpg', 'foto-046', 46);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-047.jpg', 'foto-047', 47);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-048.jpg', 'foto-048', 48);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'daom'), '/clubes/galeria/daom/foto-049.jpg', 'foto-049', 49);

-- FALCONS
DELETE FROM galeria_clubes WHERE club_id = (SELECT id FROM clubes WHERE slug = 'falcons');
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-001.jpg', 'foto-001', 1);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-002.jpg', 'foto-002', 2);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-003.jpg', 'foto-003', 3);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-004.jpg', 'foto-004', 4);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-005.jpg', 'foto-005', 5);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-006.jpg', 'foto-006', 6);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-007.jpg', 'foto-007', 7);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-008.jpg', 'foto-008', 8);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-009.jpg', 'foto-009', 9);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-010.jpg', 'foto-010', 10);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-011.jpg', 'foto-011', 11);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-012.jpg', 'foto-012', 12);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-013.jpg', 'foto-013', 13);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-014.jpg', 'foto-014', 14);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-015.jpg', 'foto-015', 15);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-016.jpg', 'foto-016', 16);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-017.jpg', 'foto-017', 17);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-018.jpg', 'foto-018', 18);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-019.jpg', 'foto-019', 19);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-020.jpg', 'foto-020', 20);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-021.jpg', 'foto-021', 21);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-022.jpg', 'foto-022', 22);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-023.jpg', 'foto-023', 23);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-024.jpg', 'foto-024', 24);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-025.jpg', 'foto-025', 25);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-026.jpg', 'foto-026', 26);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-027.jpg', 'foto-027', 27);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-028.jpg', 'foto-028', 28);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-029.jpg', 'foto-029', 29);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-030.jpg', 'foto-030', 30);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-031.jpg', 'foto-031', 31);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-032.jpg', 'foto-032', 32);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-033.jpg', 'foto-033', 33);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-034.jpg', 'foto-034', 34);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-035.jpg', 'foto-035', 35);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-036.jpg', 'foto-036', 36);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-037.jpg', 'foto-037', 37);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-038.jpg', 'foto-038', 38);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-039.jpg', 'foto-039', 39);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-040.jpg', 'foto-040', 40);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-041.jpg', 'foto-041', 41);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-042.jpg', 'foto-042', 42);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-043.jpg', 'foto-043', 43);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-044.jpg', 'foto-044', 44);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-045.jpg', 'foto-045', 45);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-046.jpg', 'foto-046', 46);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-047.jpg', 'foto-047', 47);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-048.jpg', 'foto-048', 48);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-049.jpg', 'foto-049', 49);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-050.jpg', 'foto-050', 50);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'falcons'), '/clubes/galeria/falcons/foto-051.jpg', 'foto-051', 51);

-- INFERNALES
DELETE FROM galeria_clubes WHERE club_id = (SELECT id FROM clubes WHERE slug = 'infernales');
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'infernales'), '/clubes/galeria/infernales/foto-001.jpeg', 'foto-001', 1);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'infernales'), '/clubes/galeria/infernales/foto-002.jpeg', 'foto-002', 2);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'infernales'), '/clubes/galeria/infernales/foto-003.jpeg', 'foto-003', 3);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'infernales'), '/clubes/galeria/infernales/foto-004.jpeg', 'foto-004', 4);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'infernales'), '/clubes/galeria/infernales/foto-005.jpeg', 'foto-005', 5);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'infernales'), '/clubes/galeria/infernales/foto-006.jpeg', 'foto-006', 6);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'infernales'), '/clubes/galeria/infernales/foto-007.jpeg', 'foto-007', 7);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'infernales'), '/clubes/galeria/infernales/foto-008.jpeg', 'foto-008', 8);

-- PATRIOTS
DELETE FROM galeria_clubes WHERE club_id = (SELECT id FROM clubes WHERE slug = 'patriots');
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'patriots'), '/clubes/galeria/patriots/foto-001.jpeg', 'foto-001', 1);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'patriots'), '/clubes/galeria/patriots/foto-002.jpg', 'foto-002', 2);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'patriots'), '/clubes/galeria/patriots/foto-003.jpg', 'foto-003', 3);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'patriots'), '/clubes/galeria/patriots/foto-004.jpg', 'foto-004', 4);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'patriots'), '/clubes/galeria/patriots/foto-005.jpg', 'foto-005', 5);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'patriots'), '/clubes/galeria/patriots/foto-006.jpg', 'foto-006', 6);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'patriots'), '/clubes/galeria/patriots/foto-007.jpg', 'foto-007', 7);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'patriots'), '/clubes/galeria/patriots/foto-008.jpg', 'foto-008', 8);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'patriots'), '/clubes/galeria/patriots/foto-009.jpg', 'foto-009', 9);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'patriots'), '/clubes/galeria/patriots/foto-010.jpg', 'foto-010', 10);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'patriots'), '/clubes/galeria/patriots/foto-011.jpg', 'foto-011', 11);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'patriots'), '/clubes/galeria/patriots/foto-012.jpg', 'foto-012', 12);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'patriots'), '/clubes/galeria/patriots/foto-013.jpg', 'foto-013', 13);

-- VELEZ
DELETE FROM galeria_clubes WHERE club_id = (SELECT id FROM clubes WHERE slug = 'velez');
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'velez'), '/clubes/galeria/velez/foto-001.jpeg', 'foto-001', 1);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'velez'), '/clubes/galeria/velez/foto-002.jpg', 'foto-002', 2);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'velez'), '/clubes/galeria/velez/foto-003.jpg', 'foto-003', 3);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'velez'), '/clubes/galeria/velez/foto-004.jpeg', 'foto-004', 4);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'velez'), '/clubes/galeria/velez/foto-005.jpg', 'foto-005', 5);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'velez'), '/clubes/galeria/velez/foto-006.jpg', 'foto-006', 6);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'velez'), '/clubes/galeria/velez/foto-007.jpg', 'foto-007', 7);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'velez'), '/clubes/galeria/velez/foto-008.jpg', 'foto-008', 8);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'velez'), '/clubes/galeria/velez/foto-009.jpg', 'foto-009', 9);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'velez'), '/clubes/galeria/velez/foto-010.jpg', 'foto-010', 10);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'velez'), '/clubes/galeria/velez/foto-011.jpg', 'foto-011', 11);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'velez'), '/clubes/galeria/velez/foto-012.jpg', 'foto-012', 12);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'velez'), '/clubes/galeria/velez/foto-013.jpg', 'foto-013', 13);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'velez'), '/clubes/galeria/velez/foto-014.jpeg', 'foto-014', 14);
INSERT INTO galeria_clubes (club_id, imagen_url, titulo, orden) VALUES ((SELECT id FROM clubes WHERE slug = 'velez'), '/clubes/galeria/velez/foto-015.jpeg', 'foto-015', 15);

