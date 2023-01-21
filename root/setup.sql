-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Czas generowania: 21 Sty 2023, 17:10
-- Wersja serwera: 10.4.25-MariaDB
-- Wersja PHP: 8.1.10

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Baza danych: `microgreens`
--

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `crops`
--

CREATE TABLE `crops` (
  `id` int(11) NOT NULL,
  `harvest` datetime NOT NULL,
  `microgreen_id` int(11) NOT NULL,
  `shelf_id` int(11) NOT NULL,
  `trays` int(11) NOT NULL,
  `notes` varchar(500) DEFAULT NULL,
  `created_date` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Zrzut danych tabeli `crops`
--

INSERT INTO `crops` (`id`, `harvest`, `microgreen_id`, `shelf_id`, `trays`, `notes`, `created_date`) VALUES
(104, '2023-01-23 00:00:00', 1, 97, 1, 'Duża taca daikon, ziemia kokos: 900g. \nBlackout 18.01.2023. \nŚwiatło: \n+300ml wody 19.01.\n+300ml wody 20.01\n+400ml wody 21.01', '2023-01-15 21:10:52'),
(108, '2023-01-23 00:00:00', 1, 98, 1, 'Mała taca, ziemia kokos: 580g, 42ml wody oprysk\nMieszanka rzodkiewek 6+5+5. Blackout 18.01.2022.\n20.01.2022 naświetlanie\n', '2023-01-15 22:06:32'),
(112, '2023-01-29 00:00:00', 5, 99, 1, 'Mała taca, ziemia kokos: 770g dół,317g góra, 120ml wody oprysk', '2023-01-15 22:13:38'),
(115, '2023-01-25 00:00:00', 4, 100, 1, 'Mała taca, ziemia kokos: 580g bez oprysku. Blackout od 18.01. 20.01.2022 naświetlanie. +200ml wody', '2023-01-15 22:16:00'),
(119, '2023-01-25 00:00:00', 3, 101, 1, 'Afylla 220g, moczenie 10h. Start 21:00. Blackout od 12:25.\nOświetlenie 20.01 +300ml wody\n21.01 +350ml wody', '2023-01-16 23:50:34'),
(120, '2023-01-25 00:00:00', 3, 102, 1, 'Maple 95g, mała taca mesh, moczenie 10h. Start 21:00. Blackout od 12:25. 20.01-naświetlanie +200ml wody (mesh tray - bez dolewania wody)', '2023-01-16 23:51:12');

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `microgreens`
--

CREATE TABLE `microgreens` (
  `id` int(11) NOT NULL,
  `name_en` varchar(60) NOT NULL,
  `name_pl` varchar(60) NOT NULL,
  `grams_tray` int(11) NOT NULL,
  `top_water` int(11) NOT NULL,
  `bottom_water` int(11) NOT NULL,
  `weight` int(11) NOT NULL,
  `blackout` int(11) NOT NULL,
  `light` int(11) NOT NULL,
  `color` varchar(7) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Zrzut danych tabeli `microgreens`
--

INSERT INTO `microgreens` (`id`, `name_en`, `name_pl`, `grams_tray`, `top_water`, `bottom_water`, `weight`, `blackout`, `light`, `color`) VALUES
(1, 'RADISH', 'RZODKIEW', 32, 300, 300, 2, 1, 5, '#e2e8cf'),
(2, 'SUNFLOWER', 'SŁONECZNIK', 130, 330, 375, 3, 0, 6, '#ffd500'),
(3, 'PEAS', 'GROCH', 285, 440, 375, 3, 1, 5, '#c0f080'),
(4, 'BROCCOLIIX', 'BROKUŁ', 20, 0, 0, 3, 2, 5, '#0b8500'),
(5, 'NASTURTIUM', 'NASTURCJA', 50, 0, 0, 7, 0, 7, '#F76145'),
(6, 'WHEATGRAS', 'TRAWA PSZENICZNA', 200, 0, 0, 2, 0, 5, '#ddcfc3');

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `shelves`
--

CREATE TABLE `shelves` (
  `id` int(11) NOT NULL,
  `rack_name` char(1) NOT NULL,
  `level` int(2) NOT NULL,
  `status` int(1) NOT NULL
) ;

--
-- Zrzut danych tabeli `shelves`
--

INSERT INTO `shelves` (`id`, `rack_name`, `level`, `status`) VALUES
(97, 'A', 0, 0),
(98, 'A', 1, 0),
(99, 'A', 2, 0),
(100, 'A', 3, 0),
(101, 'A', 4, 0),
(102, 'B', 0, 0),
(103, 'B', 1, 0),
(104, 'B', 2, 0),
(105, 'B', 3, 0),
(106, 'B', 4, 0);

--
-- Indeksy dla zrzutów tabel
--

--
-- Indeksy dla tabeli `crops`
--
ALTER TABLE `crops`
  ADD PRIMARY KEY (`id`),
  ADD KEY `microgreens_type` (`microgreen_id`),
  ADD KEY `shelf_id` (`shelf_id`);

--
-- Indeksy dla tabeli `microgreens`
--
ALTER TABLE `microgreens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `id` (`id`),
  ADD UNIQUE KEY `name_en` (`name_en`),
  ADD UNIQUE KEY `name_pl` (`name_pl`);

--
-- Indeksy dla tabeli `shelves`
--
ALTER TABLE `shelves`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `rack_name` (`rack_name`,`level`);

--
-- AUTO_INCREMENT dla zrzuconych tabel
--

--
-- AUTO_INCREMENT dla tabeli `crops`
--
ALTER TABLE `crops`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=130;

--
-- AUTO_INCREMENT dla tabeli `microgreens`
--
ALTER TABLE `microgreens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT dla tabeli `shelves`
--
ALTER TABLE `shelves`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Ograniczenia dla zrzutów tabel
--

--
-- Ograniczenia dla tabeli `crops`
--
ALTER TABLE `crops`
  ADD CONSTRAINT `microgreens_type` FOREIGN KEY (`microgreen_id`) REFERENCES `microgreens` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `shelf_id` FOREIGN KEY (`shelf_id`) REFERENCES `shelves` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
