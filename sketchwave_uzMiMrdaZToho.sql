-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Počítač: db:3306
-- Vytvořeno: Ned 14. pro 2025, 15:09
-- Verze serveru: 8.0.44
-- Verze PHP: 8.2.27

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Databáze: `sketchwave`
--

-- --------------------------------------------------------

--
-- Struktura tabulky `board`
--

CREATE TABLE `board` (
  `board_id` int NOT NULL,
  `owner_id` int NOT NULL,
  `name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_public` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `size_x` int NOT NULL,
  `size_y` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Vypisuji data pro tabulku `board`
--

INSERT INTO `board` (`board_id`, `owner_id`, `name`, `description`, `is_public`, `created_at`, `updated_at`, `size_x`, `size_y`) VALUES
(20, 3, 'tabule1', NULL, 0, '2025-12-01 19:05:38', '2025-12-01 19:05:38', 1280, 720);

-- --------------------------------------------------------

--
-- Struktura tabulky `board_access`
--

CREATE TABLE `board_access` (
  `access_id` int NOT NULL,
  `board_id` int NOT NULL,
  `user_id` int NOT NULL,
  `role` enum('editor','viewer') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'viewer',
  `joined_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktura tabulky `canvas_object`
--

CREATE TABLE `canvas_object` (
  `object_id` int NOT NULL,
  `board_id` int NOT NULL,
  `created_by` int NOT NULL,
  `type` enum('rect','circle','line','text','image','draw') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `x` float DEFAULT NULL,
  `y` float DEFAULT NULL,
  `width` float DEFAULT NULL,
  `height` float DEFAULT NULL,
  `rotation` float DEFAULT NULL,
  `color` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `image_url` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Vypisuji data pro tabulku `canvas_object`
--

INSERT INTO `canvas_object` (`object_id`, `board_id`, `created_by`, `type`, `x`, `y`, `width`, `height`, `rotation`, `color`, `content`, `image_url`, `created_at`, `updated_at`) VALUES
(36, 20, 3, 'draw', NULL, NULL, NULL, NULL, NULL, '#22223b', '{\"points\":[{\"x\":448,\"y\":34},{\"x\":447,\"y\":35},{\"x\":446,\"y\":43},{\"x\":445,\"y\":58},{\"x\":444,\"y\":77},{\"x\":444,\"y\":103},{\"x\":445,\"y\":140},{\"x\":452,\"y\":170},{\"x\":460,\"y\":197},{\"x\":472,\"y\":229},{\"x\":485,\"y\":257},{\"x\":491,\"y\":265},{\"x\":494,\"y\":269}],\"lineWidth\":4}', NULL, '2025-12-01 19:05:38', '2025-12-01 19:05:38'),
(37, 20, 3, 'draw', NULL, NULL, NULL, NULL, NULL, '#22223b', '{\"points\":[{\"x\":540,\"y\":17},{\"x\":540,\"y\":18},{\"x\":542,\"y\":26},{\"x\":544,\"y\":46},{\"x\":548,\"y\":83},{\"x\":552,\"y\":107},{\"x\":556,\"y\":135},{\"x\":565,\"y\":173},{\"x\":572,\"y\":200},{\"x\":581,\"y\":230},{\"x\":590,\"y\":254},{\"x\":595,\"y\":265},{\"x\":596,\"y\":269},{\"x\":597,\"y\":269}],\"lineWidth\":4}', NULL, '2025-12-01 19:05:38', '2025-12-01 19:05:38'),
(38, 20, 3, 'draw', NULL, NULL, NULL, NULL, NULL, '#22223b', '{\"points\":[{\"x\":330,\"y\":223},{\"x\":334,\"y\":238},{\"x\":339,\"y\":256},{\"x\":347,\"y\":278},{\"x\":363,\"y\":322},{\"x\":380,\"y\":362},{\"x\":402,\"y\":398},{\"x\":440,\"y\":437},{\"x\":459,\"y\":449},{\"x\":482,\"y\":459},{\"x\":508,\"y\":462},{\"x\":542,\"y\":460},{\"x\":569,\"y\":454},{\"x\":594,\"y\":446},{\"x\":632,\"y\":427},{\"x\":646,\"y\":415},{\"x\":659,\"y\":396},{\"x\":667,\"y\":372},{\"x\":672,\"y\":351},{\"x\":676,\"y\":329},{\"x\":678,\"y\":311},{\"x\":679,\"y\":302},{\"x\":680,\"y\":295},{\"x\":682,\"y\":289},{\"x\":682,\"y\":287},{\"x\":682,\"y\":286},{\"x\":682,\"y\":285},{\"x\":681,\"y\":284}],\"lineWidth\":4}', NULL, '2025-12-01 19:05:38', '2025-12-01 19:05:38'),
(39, 20, 3, 'rect', 257, 328, 608, 247, NULL, '#22223b', NULL, NULL, '2025-12-01 19:05:38', '2025-12-01 19:05:38'),
(40, 20, 3, 'text', 782, 116, NULL, NULL, NULL, '#22223b', '{\"text\":\"text2\",\"fontSize\":24}', NULL, '2025-12-01 19:05:38', '2025-12-01 19:05:38');

-- --------------------------------------------------------

--
-- Struktura tabulky `friendship`
--

CREATE TABLE `friendship` (
  `friendship_id` int NOT NULL,
  `user_id1` int NOT NULL,
  `user_id2` int NOT NULL,
  `status` enum('pending','accepted','declined','blocked') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `action_user_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktura tabulky `sessions`
--

CREATE TABLE `sessions` (
  `session_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expires` int UNSIGNED NOT NULL,
  `data` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Struktura tabulky `user`
--

CREATE TABLE `user` (
  `user_id` int NOT NULL,
  `name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `google_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `about` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `profile_pic` mediumblob,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `role` enum('admin','user') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Vypisuji data pro tabulku `user`
--

INSERT INTO `user` (`user_id`, `name`, `email`, `google_id`, `password`, `about`, `profile_pic`, `created_at`, `role`) VALUES
(3, 'Kryštof Kavalír', 'krystof.kavalir@gmail.com', '113857704136254108973', '$2b$10$Kp1Whfhws5W/IPJxv8ov8etuMmsuX7p2vmfmtDiSw4G0V/H//E7lq', 'Ahoj', NULL, '2025-12-01 19:04:35', 'user');

-- --------------------------------------------------------

--
-- Struktura tabulky `user_session`
--

CREATE TABLE `user_session` (
  `session_id` int NOT NULL,
  `user_id` int NOT NULL,
  `board_id` int NOT NULL,
  `connected_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `disconnected_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexy pro exportované tabulky
--

--
-- Indexy pro tabulku `board`
--
ALTER TABLE `board`
  ADD PRIMARY KEY (`board_id`),
  ADD KEY `owner_id` (`owner_id`);

--
-- Indexy pro tabulku `board_access`
--
ALTER TABLE `board_access`
  ADD PRIMARY KEY (`access_id`),
  ADD UNIQUE KEY `user_board_access` (`board_id`,`user_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexy pro tabulku `canvas_object`
--
ALTER TABLE `canvas_object`
  ADD PRIMARY KEY (`object_id`),
  ADD KEY `board_id` (`board_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexy pro tabulku `friendship`
--
ALTER TABLE `friendship`
  ADD PRIMARY KEY (`friendship_id`),
  ADD UNIQUE KEY `unique_friendship` (`user_id1`,`user_id2`),
  ADD KEY `user_id2` (`user_id2`),
  ADD KEY `action_user_id` (`action_user_id`);

--
-- Indexy pro tabulku `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`session_id`);

--
-- Indexy pro tabulku `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `google_id` (`google_id`);

--
-- Indexy pro tabulku `user_session`
--
ALTER TABLE `user_session`
  ADD PRIMARY KEY (`session_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `board_id` (`board_id`);

--
-- AUTO_INCREMENT pro tabulky
--

--
-- AUTO_INCREMENT pro tabulku `board`
--
ALTER TABLE `board`
  MODIFY `board_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT pro tabulku `board_access`
--
ALTER TABLE `board_access`
  MODIFY `access_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pro tabulku `canvas_object`
--
ALTER TABLE `canvas_object`
  MODIFY `object_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

--
-- AUTO_INCREMENT pro tabulku `friendship`
--
ALTER TABLE `friendship`
  MODIFY `friendship_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pro tabulku `user`
--
ALTER TABLE `user`
  MODIFY `user_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT pro tabulku `user_session`
--
ALTER TABLE `user_session`
  MODIFY `session_id` int NOT NULL AUTO_INCREMENT;

--
-- Omezení pro exportované tabulky
--

--
-- Omezení pro tabulku `board`
--
ALTER TABLE `board`
  ADD CONSTRAINT `board_ibfk_1` FOREIGN KEY (`owner_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE;

--
-- Omezení pro tabulku `board_access`
--
ALTER TABLE `board_access`
  ADD CONSTRAINT `board_access_ibfk_1` FOREIGN KEY (`board_id`) REFERENCES `board` (`board_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `board_access_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE;

--
-- Omezení pro tabulku `canvas_object`
--
ALTER TABLE `canvas_object`
  ADD CONSTRAINT `canvas_object_ibfk_1` FOREIGN KEY (`board_id`) REFERENCES `board` (`board_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `canvas_object_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `user` (`user_id`) ON DELETE CASCADE;

--
-- Omezení pro tabulku `friendship`
--
ALTER TABLE `friendship`
  ADD CONSTRAINT `friendship_ibfk_1` FOREIGN KEY (`user_id1`) REFERENCES `user` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `friendship_ibfk_2` FOREIGN KEY (`user_id2`) REFERENCES `user` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `friendship_ibfk_3` FOREIGN KEY (`action_user_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE;

--
-- Omezení pro tabulku `user_session`
--
ALTER TABLE `user_session`
  ADD CONSTRAINT `user_session_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_session_ibfk_2` FOREIGN KEY (`board_id`) REFERENCES `board` (`board_id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
