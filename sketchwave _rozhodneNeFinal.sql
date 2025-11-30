-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Počítač: db:3306
-- Vytvořeno: Ned 30. lis 2025, 15:48
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
  `is_public` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `size_x` int NOT NULL,
  `size_y` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  `type` enum('rect','circle','line','text','image') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
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

--
-- Vypisuji data pro tabulku `sessions`
--

INSERT INTO `sessions` (`session_id`, `expires`, `data`) VALUES
('3Q_zPqoX3jKrr9NGdio6FPxatnQmmz5T', 1765031136, '{\"cookie\":{\"originalMaxAge\":604800000,\"expires\":\"2025-12-06T14:25:35.703Z\",\"secure\":true,\"httpOnly\":true,\"path\":\"/\"},\"passport\":{\"user\":1}}'),
('8XPPD6q9ycVjweXn8c_CT8ya9Tfi0DdR', 1765030739, '{\"cookie\":{\"originalMaxAge\":604800000,\"expires\":\"2025-12-06T14:18:59.427Z\",\"secure\":true,\"httpOnly\":true,\"path\":\"/\"},\"passport\":{\"user\":1}}'),
('aolFtXjNKTWDeRm3V1fQ2JG2clrJg2BA', 1765031104, '{\"cookie\":{\"originalMaxAge\":604800000,\"expires\":\"2025-12-06T14:25:04.493Z\",\"secure\":true,\"httpOnly\":true,\"path\":\"/\"},\"passport\":{\"user\":1}}'),
('b8-AUx2zlBrxcjh_vUNCbHYnwOtGyECZ', 1765122100, '{\"cookie\":{\"originalMaxAge\":604800000,\"expires\":\"2025-12-07T15:41:40.232Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\"},\"passport\":{\"user\":1}}'),
('cbgUHVWc3O9T289rnj93IlqfML27CHGU', 1765030790, '{\"cookie\":{\"originalMaxAge\":604800000,\"expires\":\"2025-12-06T14:19:50.293Z\",\"secure\":true,\"httpOnly\":true,\"path\":\"/\"},\"passport\":{\"user\":1}}'),
('rzm_rolifJhcSbk6Wr1DtHh0z_8-Qg-1', 1765030720, '{\"cookie\":{\"originalMaxAge\":604800000,\"expires\":\"2025-12-06T14:18:40.444Z\",\"secure\":true,\"httpOnly\":true,\"path\":\"/\"},\"passport\":{\"user\":1}}');

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
(1, 'Krystof', 'krystof.kavalir@gmail.com', '113857704136254108973', '$2b$10$dr4oGu/Jsi9aZ7L462FK5ub0GWh3xxZcjY7LN0F6QxWYDPw6orFf6', 'Ahoj', NULL, '2025-11-29 14:18:32', 'user');

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
  MODIFY `board_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pro tabulku `board_access`
--
ALTER TABLE `board_access`
  MODIFY `access_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pro tabulku `canvas_object`
--
ALTER TABLE `canvas_object`
  MODIFY `object_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pro tabulku `friendship`
--
ALTER TABLE `friendship`
  MODIFY `friendship_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pro tabulku `user`
--
ALTER TABLE `user`
  MODIFY `user_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

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
