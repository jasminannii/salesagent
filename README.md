# brayyn – KI-Sales-Agent · Landingpage

Interaktive Landingpage für den **brayyn Sales-Agent**: Anrufliste, Dialer, Lead-Recherche, Pitch und Live-Coaching in einem Agenten – gebaut für Vertriebsteams im DACH-Raum.

## Inhalt

| Datei | Zweck |
| --- | --- |
| `index.html` | Fertige, eigenständige Seite. Läuft ohne Server und ohne Abhängigkeiten, z. B. über GitHub Pages. |
| `src/landingpage.dc.html` | Design-Quelle (Claude Design Canvas). Hier wird die Seite bearbeitet. |
| `runtime/dc-lite.js` | Kleine Laufzeit ohne Abhängigkeiten, die die Vorlage rendert und interaktiv macht. |
| `build.py` | Erzeugt `index.html` aus der Design-Quelle. |

## Lokal ansehen

`index.html` im Browser öffnen – fertig.

## Nach Änderungen neu bauen

```bash
python3 build.py
```

## Online stellen (GitHub Pages)

Im Repo unter **Settings → Pages** als Quelle den Branch `main` und den Ordner `/ (root)` wählen. Die Seite ist danach unter `https://jasminannii.github.io/salesagent/` erreichbar.

## Was auf der Seite interaktiv ist

- **Live-Demo im Hero:** Lead anklicken, grünen Knopf drücken – Live-Transkript, Coaching-Tipps von brayyn, Redeanteil, Pitch-Score und automatische Nachbereitung.
- **Funktions-Tabs** mit sechs Produkt-Szenen und Pfeilen.
- **Integrations-Kreis:** Tools anklicken und sehen, was brayyn damit macht.
- **Rollen-Tabs, Preis-Umschalter (monatlich/jährlich), FAQ.**
- **Testversion-Formular** (E-Mail, Website, Zielgruppe) mit Prüfung der Eingaben.

## Noch offen

- Preise für **Pro** und **Premium** stehen als Platzhalter `[Preis]`.
- Das Testversion-Formular ist eine Vorschau und verschickt noch nichts – es muss an ein Backend oder Formular-Tool angebunden werden.
- Alle Firmen und Personen in der Demo sind erfunden.
- Live-Coaching (Mithören) und Telefonakquise in Österreich vor dem Marktstart rechtlich prüfen.
