-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Počítač: db:3306
-- Vytvořeno: Sob 10. led 2026, 15:53
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
  `size_y` int NOT NULL,
  PRIMARY KEY (`board_id`)   -- <--- PŘIDÁNO
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Vypisuji data pro tabulku `board`
--

INSERT INTO `board` (`board_id`, `owner_id`, `name`, `description`, `is_public`, `created_at`, `updated_at`, `size_x`, `size_y`) VALUES
(20, 3, 'tabule1', NULL, 0, '2025-12-01 19:05:38', '2025-12-01 19:05:38', 1280, 720),
(21, 4, 'testussus', NULL, 0, '2025-12-14 16:39:37', '2025-12-14 16:39:37', 1280, 720),
(22, 4, 'text1', NULL, 0, '2025-12-30 15:38:21', '2025-12-30 15:38:21', 1280, 720),
(23, 3, 'tabule1', NULL, 0, '2025-12-30 15:42:06', '2025-12-30 15:42:06', 1280, 720),
(24, 3, 'tabule1', NULL, 0, '2025-12-30 15:42:10', '2025-12-30 15:42:10', 1280, 720),
(25, 3, 'UzTu funguje?', NULL, 0, '2025-12-30 15:51:57', '2025-12-30 15:57:01', 1280, 720),
(26, 3, 'text3', NULL, 0, '2025-12-30 15:58:03', '2025-12-30 15:58:32', 1280, 720),
(27, 3, 'UzByToMohloJit', NULL, 0, '2025-12-30 16:06:39', '2025-12-30 16:16:06', 1280, 720);

-- --------------------------------------------------------

--
-- Struktura tabulky `board_access`
--

CREATE TABLE `board_access` (
  `access_id` int NOT NULL,
  `board_id` int NOT NULL,
  `user_id` int NOT NULL,
  `role` enum('editor','viewer') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'viewer',
  `joined_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`access_id`)   -- <--- PŘIDÁNO
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--
-- Vypisuji data pro tabulku `board_access`
--

INSERT INTO `board_access` (`access_id`, `board_id`, `user_id`, `role`, `joined_at`) VALUES
(1, 20, 4, 'editor', '2025-12-14 16:32:41'),
(2, 21, 3, 'editor', '2025-12-14 16:44:27'),
(3, 22, 3, 'editor', '2025-12-30 15:38:29'),
(4, 24, 4, 'editor', '2025-12-30 15:42:19'),
(5, 25, 4, 'editor', '2025-12-30 15:52:58'),
(6, 26, 4, 'editor', '2025-12-30 15:58:12'),
(7, 27, 4, 'editor', '2025-12-30 16:06:43');

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
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`object_id`)   -- <--- PŘIDÁNO
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Vypisuji data pro tabulku `canvas_object`
--

INSERT INTO `canvas_object` (`object_id`, `board_id`, `created_by`, `type`, `x`, `y`, `width`, `height`, `rotation`, `color`, `content`, `image_url`, `created_at`, `updated_at`) VALUES
(36, 20, 3, 'draw', NULL, NULL, NULL, NULL, NULL, '#22223b', '{\"points\":[{\"x\":448,\"y\":34},{\"x\":447,\"y\":35},{\"x\":446,\"y\":43},{\"x\":445,\"y\":58},{\"x\":444,\"y\":77},{\"x\":444,\"y\":103},{\"x\":445,\"y\":140},{\"x\":452,\"y\":170},{\"x\":460,\"y\":197},{\"x\":472,\"y\":229},{\"x\":485,\"y\":257},{\"x\":491,\"y\":265},{\"x\":494,\"y\":269}],\"lineWidth\":4}', NULL, '2025-12-01 19:05:38', '2025-12-01 19:05:38'),
(37, 20, 3, 'draw', NULL, NULL, NULL, NULL, NULL, '#22223b', '{\"points\":[{\"x\":540,\"y\":17},{\"x\":540,\"y\":18},{\"x\":542,\"y\":26},{\"x\":544,\"y\":46},{\"x\":548,\"y\":83},{\"x\":552,\"y\":107},{\"x\":556,\"y\":135},{\"x\":565,\"y\":173},{\"x\":572,\"y\":200},{\"x\":581,\"y\":230},{\"x\":590,\"y\":254},{\"x\":595,\"y\":265},{\"x\":596,\"y\":269},{\"x\":597,\"y\":269}],\"lineWidth\":4}', NULL, '2025-12-01 19:05:38', '2025-12-01 19:05:38'),
(38, 20, 3, 'draw', NULL, NULL, NULL, NULL, NULL, '#22223b', '{\"points\":[{\"x\":330,\"y\":223},{\"x\":334,\"y\":238},{\"x\":339,\"y\":256},{\"x\":347,\"y\":278},{\"x\":363,\"y\":322},{\"x\":380,\"y\":362},{\"x\":402,\"y\":398},{\"x\":440,\"y\":437},{\"x\":459,\"y\":449},{\"x\":482,\"y\":459},{\"x\":508,\"y\":462},{\"x\":542,\"y\":460},{\"x\":569,\"y\":454},{\"x\":594,\"y\":446},{\"x\":632,\"y\":427},{\"x\":646,\"y\":415},{\"x\":659,\"y\":396},{\"x\":667,\"y\":372},{\"x\":672,\"y\":351},{\"x\":676,\"y\":329},{\"x\":678,\"y\":311},{\"x\":679,\"y\":302},{\"x\":680,\"y\":295},{\"x\":682,\"y\":289},{\"x\":682,\"y\":287},{\"x\":682,\"y\":286},{\"x\":682,\"y\":285},{\"x\":681,\"y\":284}],\"lineWidth\":4}', NULL, '2025-12-01 19:05:38', '2025-12-01 19:05:38'),
(39, 20, 3, 'rect', 257, 328, 608, 247, NULL, '#22223b', NULL, NULL, '2025-12-01 19:05:38', '2025-12-01 19:05:38'),
(40, 20, 3, 'text', 782, 116, NULL, NULL, NULL, '#22223b', '{\"text\":\"text2\",\"fontSize\":24}', NULL, '2025-12-01 19:05:38', '2025-12-01 19:05:38'),
(41, 22, 4, 'draw', NULL, NULL, NULL, NULL, NULL, '#22223b', '{\"points\":[{\"x\":581,\"y\":93},{\"x\":580,\"y\":92},{\"x\":577,\"y\":92},{\"x\":571,\"y\":99},{\"x\":564,\"y\":113},{\"x\":556,\"y\":137},{\"x\":551,\"y\":166},{\"x\":548,\"y\":200},{\"x\":544,\"y\":240},{\"x\":541,\"y\":279},{\"x\":541,\"y\":315},{\"x\":541,\"y\":342},{\"x\":541,\"y\":354},{\"x\":541,\"y\":356}],\"lineWidth\":4}', NULL, '2025-12-30 15:38:21', '2025-12-30 15:38:21'),
(42, 22, 4, 'draw', NULL, NULL, NULL, NULL, NULL, '#22223b', '{\"points\":[{\"x\":673,\"y\":135},{\"x\":673,\"y\":136},{\"x\":670,\"y\":146},{\"x\":667,\"y\":163},{\"x\":663,\"y\":193},{\"x\":655,\"y\":234},{\"x\":647,\"y\":276},{\"x\":638,\"y\":321},{\"x\":629,\"y\":366},{\"x\":620,\"y\":407},{\"x\":613,\"y\":433},{\"x\":606,\"y\":448},{\"x\":601,\"y\":452},{\"x\":599,\"y\":452},{\"x\":598,\"y\":450},{\"x\":598,\"y\":447},{\"x\":597,\"y\":442},{\"x\":596,\"y\":436}],\"lineWidth\":4}', NULL, '2025-12-30 15:38:21', '2025-12-30 15:38:21'),
(43, 22, 4, 'draw', NULL, NULL, NULL, NULL, NULL, '#22223b', '{\"points\":[{\"x\":333,\"y\":273},{\"x\":335,\"y\":279},{\"x\":341,\"y\":291},{\"x\":350,\"y\":313},{\"x\":361,\"y\":348},{\"x\":373,\"y\":389},{\"x\":388,\"y\":443},{\"x\":401,\"y\":489},{\"x\":420,\"y\":540},{\"x\":438,\"y\":575},{\"x\":459,\"y\":600},{\"x\":488,\"y\":617},{\"x\":512,\"y\":619},{\"x\":532,\"y\":612},{\"x\":549,\"y\":601},{\"x\":570,\"y\":582},{\"x\":591,\"y\":565},{\"x\":613,\"y\":547},{\"x\":643,\"y\":519},{\"x\":667,\"y\":498},{\"x\":693,\"y\":468},{\"x\":714,\"y\":444},{\"x\":736,\"y\":414},{\"x\":751,\"y\":390},{\"x\":762,\"y\":368},{\"x\":773,\"y\":342},{\"x\":774,\"y\":334}],\"lineWidth\":4}', NULL, '2025-12-30 15:38:21', '2025-12-30 15:38:21'),
(44, 24, 3, 'draw', NULL, NULL, NULL, NULL, NULL, '#22223b', '{\"points\":[{\"x\":508,\"y\":110},{\"x\":511,\"y\":125},{\"x\":515,\"y\":142},{\"x\":521,\"y\":164},{\"x\":527,\"y\":189},{\"x\":532,\"y\":211},{\"x\":535,\"y\":232},{\"x\":539,\"y\":249},{\"x\":542,\"y\":259},{\"x\":544,\"y\":265}],\"lineWidth\":4}', NULL, '2025-12-30 15:42:10', '2025-12-30 15:42:10'),
(45, 24, 3, 'draw', NULL, NULL, NULL, NULL, NULL, '#22223b', '{\"points\":[{\"x\":625,\"y\":78},{\"x\":625,\"y\":79},{\"x\":625,\"y\":83},{\"x\":625,\"y\":97},{\"x\":625,\"y\":109},{\"x\":625,\"y\":124},{\"x\":625,\"y\":139},{\"x\":626,\"y\":161},{\"x\":631,\"y\":184},{\"x\":642,\"y\":214},{\"x\":652,\"y\":238},{\"x\":665,\"y\":264},{\"x\":679,\"y\":290},{\"x\":689,\"y\":307},{\"x\":699,\"y\":321},{\"x\":706,\"y\":332},{\"x\":713,\"y\":337},{\"x\":716,\"y\":340}],\"lineWidth\":4}', NULL, '2025-12-30 15:42:10', '2025-12-30 15:42:10'),
(244, 26, 4, 'draw', NULL, NULL, NULL, NULL, NULL, '#22223b', '{\"points\":[{\"x\":315,\"y\":106},{\"x\":315,\"y\":106},{\"x\":315,\"y\":106}],\"lineWidth\":4}', NULL, '2025-12-30 15:58:32', '2025-12-30 15:58:32'),
(245, 26, 4, 'draw', NULL, NULL, NULL, NULL, NULL, '#22223b', '{\"points\":[{\"x\":323,\"y\":77},{\"x\":321,\"y\":87},{\"x\":321,\"y\":101},{\"x\":323,\"y\":130},{\"x\":327,\"y\":157},{\"x\":334,\"y\":190},{\"x\":342,\"y\":221},{\"x\":351,\"y\":253},{\"x\":360,\"y\":280},{\"x\":370,\"y\":304},{\"x\":381,\"y\":320},{\"x\":389,\"y\":331},{\"x\":396,\"y\":337}],\"lineWidth\":4}', NULL, '2025-12-30 15:58:32', '2025-12-30 15:58:32'),
(246, 26, 4, 'draw', NULL, NULL, NULL, NULL, NULL, '#22223b', '{\"points\":[{\"x\":524,\"y\":143},{\"x\":524,\"y\":147},{\"x\":524,\"y\":157},{\"x\":524,\"y\":174},{\"x\":524,\"y\":196},{\"x\":524,\"y\":219},{\"x\":523,\"y\":248},{\"x\":523,\"y\":273},{\"x\":524,\"y\":306},{\"x\":531,\"y\":336},{\"x\":541,\"y\":366},{\"x\":552,\"y\":394},{\"x\":564,\"y\":420},{\"x\":573,\"y\":445},{\"x\":581,\"y\":463},{\"x\":585,\"y\":473}],\"lineWidth\":4}', NULL, '2025-12-30 15:58:32', '2025-12-30 15:58:32'),
(247, 26, 4, 'draw', NULL, NULL, NULL, NULL, NULL, '#22223b', '{\"points\":[{\"x\":671.765625,\"y\":157.5390625},{\"x\":671.765625,\"y\":157.5390625},{\"x\":667.765625,\"y\":169.5390625},{\"x\":661.765625,\"y\":189.5390625},{\"x\":650.765625,\"y\":224.5390625},{\"x\":640.765625,\"y\":258.5390625},{\"x\":630.765625,\"y\":309.5390625},{\"x\":624.765625,\"y\":352.5390625},{\"x\":624.765625,\"y\":384.5390625},{\"x\":624.765625,\"y\":417.5390625},{\"x\":627.765625,\"y\":439.5390625},{\"x\":634.765625,\"y\":450.5390625},{\"x\":636.765625,\"y\":455.5390625},{\"x\":639.765625,\"y\":457.5390625},{\"x\":640.765625,\"y\":457.5390625},{\"x\":641.765625,\"y\":457.5390625}],\"lineWidth\":4}', NULL, '2025-12-30 15:58:32', '2025-12-30 15:58:32'),
(248, 26, 4, 'draw', NULL, NULL, NULL, NULL, NULL, '#22223b', '{\"points\":[{\"x\":725.765625,\"y\":92.5390625},{\"x\":725.765625,\"y\":99.5390625},{\"x\":721.765625,\"y\":113.5390625},{\"x\":719.765625,\"y\":138.5390625},{\"x\":717.765625,\"y\":163.5390625},{\"x\":717.765625,\"y\":190.5390625},{\"x\":716.765625,\"y\":224.5390625},{\"x\":715.765625,\"y\":255.5390625},{\"x\":715.765625,\"y\":293.5390625},{\"x\":716.765625,\"y\":314.5390625},{\"x\":720.765625,\"y\":338.5390625},{\"x\":725.765625,\"y\":352.5390625},{\"x\":727.765625,\"y\":355.5390625}],\"lineWidth\":4}', NULL, '2025-12-30 15:58:32', '2025-12-30 15:58:32'),
(249, 26, 4, 'draw', NULL, NULL, NULL, NULL, NULL, '#22223b', '{\"points\":[{\"x\":887,\"y\":112},{\"x\":883,\"y\":121},{\"x\":877,\"y\":139},{\"x\":870,\"y\":162},{\"x\":864,\"y\":187},{\"x\":858,\"y\":215},{\"x\":855,\"y\":250},{\"x\":853,\"y\":283},{\"x\":852,\"y\":314},{\"x\":852,\"y\":340},{\"x\":855,\"y\":352},{\"x\":858,\"y\":355}],\"lineWidth\":4}', NULL, '2025-12-30 15:58:32', '2025-12-30 15:58:32'),
(250, 26, 4, 'draw', NULL, NULL, NULL, NULL, NULL, '#22223b', '{\"points\":[{\"x\":976,\"y\":193},{\"x\":973,\"y\":200},{\"x\":969,\"y\":214},{\"x\":966,\"y\":229},{\"x\":960,\"y\":252},{\"x\":957,\"y\":274},{\"x\":954,\"y\":299},{\"x\":952,\"y\":320},{\"x\":952,\"y\":343},{\"x\":954,\"y\":365},{\"x\":958,\"y\":382},{\"x\":964,\"y\":403},{\"x\":969,\"y\":417}],\"lineWidth\":4}', NULL, '2025-12-30 15:58:32', '2025-12-30 15:58:32'),
(251, 26, 4, 'draw', NULL, NULL, NULL, NULL, NULL, '#22223b', '{\"points\":[{\"x\":660,\"y\":384},{\"x\":657,\"y\":384},{\"x\":657,\"y\":385},{\"x\":657,\"y\":390},{\"x\":661,\"y\":398},{\"x\":675,\"y\":412},{\"x\":690,\"y\":421},{\"x\":711,\"y\":429},{\"x\":743,\"y\":435},{\"x\":780,\"y\":437},{\"x\":813,\"y\":437},{\"x\":856,\"y\":437},{\"x\":911,\"y\":434},{\"x\":951,\"y\":431},{\"x\":993,\"y\":427},{\"x\":1010,\"y\":426},{\"x\":1017,\"y\":424},{\"x\":1018,\"y\":423},{\"x\":1018,\"y\":422}],\"lineWidth\":4}', NULL, '2025-12-30 15:58:32', '2025-12-30 15:58:32'),
(252, 26, 4, 'draw', NULL, NULL, NULL, NULL, NULL, '#22223b', '{\"points\":[{\"x\":260,\"y\":337},{\"x\":260,\"y\":345},{\"x\":260,\"y\":356},{\"x\":261,\"y\":367},{\"x\":263,\"y\":383},{\"x\":268,\"y\":399},{\"x\":276,\"y\":414},{\"x\":289,\"y\":430},{\"x\":302,\"y\":442},{\"x\":321,\"y\":457},{\"x\":339,\"y\":470},{\"x\":360,\"y\":483},{\"x\":379,\"y\":493},{\"x\":399,\"y\":503},{\"x\":416,\"y\":511},{\"x\":428,\"y\":517},{\"x\":438,\"y\":520},{\"x\":444,\"y\":521},{\"x\":447,\"y\":521}],\"lineWidth\":4}', NULL, '2025-12-30 15:58:32', '2025-12-30 15:58:32'),
(253, 26, 4, 'draw', NULL, NULL, NULL, NULL, NULL, '#22223b', '{\"points\":[{\"x\":174,\"y\":99},{\"x\":162,\"y\":111},{\"x\":149,\"y\":134},{\"x\":135,\"y\":166},{\"x\":123,\"y\":202},{\"x\":111,\"y\":250},{\"x\":105,\"y\":284},{\"x\":102,\"y\":310},{\"x\":101,\"y\":321}],\"lineWidth\":4}', NULL, '2025-12-30 15:58:32', '2025-12-30 15:58:32'),
(254, 26, 4, 'draw', NULL, NULL, NULL, NULL, NULL, '#22223b', '{\"points\":[{\"x\":251,\"y\":130},{\"x\":247,\"y\":136},{\"x\":239,\"y\":149},{\"x\":231,\"y\":164},{\"x\":219,\"y\":186},{\"x\":210,\"y\":206},{\"x\":199,\"y\":229},{\"x\":192,\"y\":247},{\"x\":183,\"y\":266},{\"x\":175,\"y\":287},{\"x\":169,\"y\":303},{\"x\":165,\"y\":319},{\"x\":162,\"y\":337},{\"x\":162,\"y\":338}],\"lineWidth\":4}', NULL, '2025-12-30 15:58:32', '2025-12-30 15:58:32'),
(597, 27, 4, 'draw', NULL, NULL, NULL, NULL, NULL, '#22223b', '{\"points\":[{\"x\":481,\"y\":153},{\"x\":480,\"y\":162},{\"x\":479,\"y\":176},{\"x\":478,\"y\":193},{\"x\":478,\"y\":214},{\"x\":476,\"y\":235},{\"x\":476,\"y\":255},{\"x\":476,\"y\":273},{\"x\":476,\"y\":291},{\"x\":478,\"y\":306},{\"x\":480,\"y\":315},{\"x\":481,\"y\":321},{\"x\":481,\"y\":325},{\"x\":481,\"y\":330},{\"x\":481,\"y\":333},{\"x\":481,\"y\":337},{\"x\":482,\"y\":342},{\"x\":482,\"y\":345},{\"x\":483,\"y\":347}],\"lineWidth\":4}', NULL, '2025-12-30 16:16:06', '2025-12-30 16:16:06'),
(598, 27, 4, 'draw', NULL, NULL, NULL, NULL, NULL, '#22223b', '{\"points\":[{\"x\":1047,\"y\":215},{\"x\":1046,\"y\":215},{\"x\":1045,\"y\":216},{\"x\":1045,\"y\":222},{\"x\":1045,\"y\":234},{\"x\":1045,\"y\":246},{\"x\":1045,\"y\":263},{\"x\":1046,\"y\":287},{\"x\":1047,\"y\":306},{\"x\":1047,\"y\":330},{\"x\":1048,\"y\":352},{\"x\":1048,\"y\":369},{\"x\":1048,\"y\":381},{\"x\":1048,\"y\":387},{\"x\":1048,\"y\":390}],\"lineWidth\":4}', NULL, '2025-12-30 16:16:06', '2025-12-30 16:16:06'),
(599, 27, 4, 'draw', NULL, NULL, NULL, NULL, NULL, '#22223b', '{\"points\":[{\"x\":766.765625,\"y\":167.5390625},{\"x\":764.765625,\"y\":175.5390625},{\"x\":762.765625,\"y\":195.5390625},{\"x\":760.765625,\"y\":218.5390625},{\"x\":760.765625,\"y\":255.5390625},{\"x\":757.765625,\"y\":307.5390625},{\"x\":756.765625,\"y\":349.5390625},{\"x\":756.765625,\"y\":407.5390625},{\"x\":755.765625,\"y\":454.5390625},{\"x\":755.765625,\"y\":495.5390625},{\"x\":754.765625,\"y\":530.5390625},{\"x\":752.765625,\"y\":555.5390625},{\"x\":752.765625,\"y\":567.5390625},{\"x\":752.765625,\"y\":568.5390625},{\"x\":754.765625,\"y\":568.5390625},{\"x\":755.765625,\"y\":568.5390625},{\"x\":756.765625,\"y\":568.5390625}],\"lineWidth\":4}', NULL, '2025-12-30 16:16:06', '2025-12-30 16:16:06'),
(600, 27, 4, 'draw', NULL, NULL, NULL, NULL, NULL, '#22223b', '{\"points\":[{\"x\":482,\"y\":486},{\"x\":489,\"y\":489},{\"x\":506,\"y\":495},{\"x\":523,\"y\":500},{\"x\":553,\"y\":507},{\"x\":586,\"y\":512},{\"x\":632,\"y\":518},{\"x\":681,\"y\":523},{\"x\":718,\"y\":526},{\"x\":768,\"y\":529},{\"x\":814,\"y\":530},{\"x\":850,\"y\":530},{\"x\":877,\"y\":530},{\"x\":904,\"y\":530},{\"x\":915,\"y\":530},{\"x\":922,\"y\":530},{\"x\":922,\"y\":529}],\"lineWidth\":4}', NULL, '2025-12-30 16:16:06', '2025-12-30 16:16:06'),
(601, 27, 4, 'draw', NULL, NULL, NULL, NULL, NULL, '#22223b', '{\"points\":[{\"x\":649,\"y\":170},{\"x\":649,\"y\":171},{\"x\":649,\"y\":176},{\"x\":649,\"y\":187},{\"x\":650,\"y\":200},{\"x\":651,\"y\":218},{\"x\":654,\"y\":251},{\"x\":658,\"y\":271},{\"x\":663,\"y\":291},{\"x\":669,\"y\":310},{\"x\":674,\"y\":327},{\"x\":680,\"y\":345},{\"x\":685,\"y\":357},{\"x\":688,\"y\":370},{\"x\":691,\"y\":380},{\"x\":693,\"y\":386},{\"x\":695,\"y\":391},{\"x\":696,\"y\":395},{\"x\":696,\"y\":397},{\"x\":696,\"y\":398}],\"lineWidth\":4}', NULL, '2025-12-30 16:16:06', '2025-12-30 16:16:06'),
(602, 27, 4, 'draw', NULL, NULL, NULL, NULL, NULL, '#22223b', '{\"points\":[{\"x\":301.765625,\"y\":74.5390625},{\"x\":302.765625,\"y\":72.5390625},{\"x\":296.765625,\"y\":77.5390625},{\"x\":291.765625,\"y\":87.5390625},{\"x\":286.765625,\"y\":98.5390625},{\"x\":281.765625,\"y\":113.5390625},{\"x\":277.765625,\"y\":130.5390625},{\"x\":276.765625,\"y\":145.5390625},{\"x\":274.765625,\"y\":165.5390625},{\"x\":274.765625,\"y\":184.5390625},{\"x\":274.765625,\"y\":213.5390625},{\"x\":274.765625,\"y\":219.5390625}],\"lineWidth\":4}', NULL, '2025-12-30 16:16:06', '2025-12-30 16:16:06');

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
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`friendship_id`)   -- <--- PŘIDÁNO
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Vypisuji data pro tabulku `friendship`
--

INSERT INTO `friendship` (`friendship_id`, `user_id1`, `user_id2`, `status`, `action_user_id`, `created_at`, `updated_at`) VALUES
(1, 3, 4, 'accepted', 4, '2025-12-14 15:44:47', '2025-12-14 15:44:57');

-- --------------------------------------------------------

--
-- Struktura tabulky `sessions`
--

CREATE TABLE `sessions` (
  `session_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expires` int UNSIGNED NOT NULL,
  `data` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  PRIMARY KEY (`session_id`)   -- <--- PŘIDÁNO
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
  `role` enum('admin','user') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user',
  PRIMARY KEY (`user_id`)     -- <--- PŘIDÁNO
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Vypisuji data pro tabulku `user`
--

INSERT INTO `user` (`user_id`, `name`, `email`, `google_id`, `password`, `about`, `profile_pic`, `created_at`, `role`) VALUES
(3, 'Kryštof Kavalír', 'krystof.kavalir@gmail.com', '113857704136254108973', '$2b$10$Kp1Whfhws5W/IPJxv8ov8etuMmsuX7p2vmfmtDiSw4G0V/H//E7lq', 'Ahoj', NULL, '2025-12-01 19:04:35', 'user'),
(4, 'test1', 'kavachanel220@gmail.com', NULL, '$2b$10$BoXjECpuXfL6QwPLR4Aj4OtYT55E3FgDZTrAa1M8/NcuhBZrhyAJS', NULL, NULL, '2025-12-14 15:43:59', 'user');

-- --------------------------------------------------------

--
-- Struktura tabulky `user_session`
--

CREATE TABLE `user_session` (
  `session_id` int NOT NULL,
  `user_id` int NOT NULL,
  `board_id` int NOT NULL,
  `connected_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `disconnected_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`session_id`)  -- <--- PŘIDÁNO
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexy pro exportované tabulky
--

--
-- Indexy pro tabulku `board`
--
ALTER TABLE `board`
  ADD KEY `owner_id` (`owner_id`);

--
-- Indexy pro tabulku `board_access`
--
ALTER TABLE `board_access`
  ADD UNIQUE KEY `user_board_access` (`board_id`,`user_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexy pro tabulku `canvas_object`
--
ALTER TABLE `canvas_object`
  ADD KEY `board_id` (`board_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexy pro tabulku `friendship`
--
ALTER TABLE `friendship`
  ADD UNIQUE KEY `unique_friendship` (`user_id1`,`user_id2`),
  ADD KEY `user_id2` (`user_id2`),
  ADD KEY `action_user_id` (`action_user_id`);

--
-- Indexy pro tabulku `sessions`
--


--
-- Indexy pro tabulku `user`
--
ALTER TABLE `user`
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `google_id` (`google_id`);

--
-- Indexy pro tabulku `user_session`
--
ALTER TABLE `user_session`
  ADD KEY `user_id` (`user_id`),
  ADD KEY `board_id` (`board_id`);

--
-- AUTO_INCREMENT pro tabulky
--

--
-- AUTO_INCREMENT pro tabulku `board`
--
ALTER TABLE `board`
  MODIFY `board_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT pro tabulku `board_access`
--
ALTER TABLE `board_access`
  MODIFY `access_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT pro tabulku `canvas_object`
--
ALTER TABLE `canvas_object`
  MODIFY `object_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=603;

--
-- AUTO_INCREMENT pro tabulku `friendship`
--
ALTER TABLE `friendship`
  MODIFY `friendship_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT pro tabulku `user`
--
ALTER TABLE `user`
  MODIFY `user_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

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
