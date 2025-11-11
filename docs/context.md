# Projekt: The Binding of Isaac – OE Edition

- `styles/base.css` – layout globalny i ustawienia płótna; `styles/hud.css` – wygląd paska statystyk; `styles/overlays.css` – ekrany menu, game-over, countdown oraz przyciski.
- `scripts/main.js` – punkt wejścia (ES module). Tworzy instancję gry (`createGame`), inicjuje kontroler menu (`createMenuController`) i zarządza przepływem: menu → odliczanie → start gry.
- `scripts/core/game.js` – serce gry. Zapewnia funkcję `createGame`, która:
  - przechowuje stan gry (gracz, wrogowie, pociski, power-upy, licznik combo itp.),
  - zarządza logiką rozgrywki (ruch, kolizje, spawn przeciwników, losowanie power-upów),
  - renderuje scenę na płótnie 2D (`canvas`),
  - obsługuje wejście z klawiatury (WASD – ruch, strzałki/IJKL – strzał),
  - eksponuje metody `prepareForNewRun()`, `startRun()`, `getStats()` oraz `resize()`; dopasowuje płótno do rozdzielczości okna.
- `scripts/core/renderers/player.js`, `scripts/core/renderers/projectiles.js` – czyste funkcje rysujące gracza i pociski (wykorzystywane w pętli renderu).
- `scripts/entities/powerups/` – obsługa power-upów (losowanie dropów, efekty, rysowanie błyskawicy itp.).
- `scripts/core/utils/color.js` – pomocnicze operacje na kolorach.
- `scripts/ui/menu.js` – kontroler menu i ekranów overlay: odczyt/walidacja high-score (`localStorage`), 3‑sekundowe odliczanie, przełączanie między menu a rozgrywką.
- Struktura katalogów przygotowana do dalszej modularizacji (`scripts/core`, `scripts/entities`, `scripts/systems`, `scripts/ui`, `assets`). Aktualnie używane są katalogi `core`, `ui` oraz moduł główny.

## Sterowanie
- Ruch: `W`, `A`, `S`, `D` (tylko klawisze WASD).
- Strzelanie: strzałki (`↑`, `↓`, `←`, `→`) lub alternatywnie `I`, `J`, `K`, `L`.
- Obsługa myszy została tymczasowo wyłączona (zakomentowana w `game.js`).

## Przepływ gry
1. Po załadowaniu strony `createGame` przygotowuje stan i dopasowuje płótno do okna. Menu pokazuje high-score i przycisk startu.
2. Po kliknięciu start menu wykonuje 3‑sekundowe odliczanie, a następnie wywołuje `startRun()` (pętla `requestAnimationFrame`), która co klatkę:
   - aktualizuje gracza, pociski (gracza i wrogów), przeciwników, power-upy, efekty cząsteczkowe i HUD,
   - przeprowadza kolizje oraz przyznaje nagrody (monety, power-upy, combo),
   - renderuje całą scenę, w tym efekt rozmazania, licznik combo i wskaźnik przegrzania broni.
3. `gameOver()` zatrzymuje pętlę i przekazuje statystyki do kontrolera menu. Menu aktualizuje high-score, pokazuje ekran końcowy i umożliwia kolejny start (z odliczaniem).

## Kluczowe mechaniki
- **Power-upy**: AK-47 (szybszy ogień), Pentagram (tryb berserk), Homing (pociski samonaprowadzające), Speed (przyspieszenie ruchu + przemiana mimiki).
- **Combo**: utrzymuj tempo zabijania, aby zwiększać mnożnik monet i efekty wizualne.
- **Przeciwnicy**: kilka typów (standard, szybki, strzelający) z różnymi zachowaniami.
- **Efekty wizualne**: cząsteczki, shake ekranu, błyski, wskaźnik nagrzewania broni.

## Otwarte zagadnienia
- Dostosowanie prędkości i rozmiarów jednostek do dynamicznej rozdzielczości (obecnie bazują na stałych wartościach pikselowych).
- Przywrócenie sterowania myszą oraz dalsza modularizacja (`entities/`, `systems/`) pozostają do zrobienia.

> Ten plik służy jako szybkie przypomnienie, jak działa obecna baza. Aktualizuj go przy większych przebudowach. 

