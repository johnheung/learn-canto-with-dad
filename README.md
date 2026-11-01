# Learn Canto with Dad

A mobile app for learning Cantonese a few minutes a day. It's built with Expo (React Native) for **Android**, and only Android builds are set up. There's no login: progress is saved on the phone.

## Features

- **Learning path**: 8 units (Greetings, Numbers, Food & Drink, Family, Time, Getting Around, Shopping, Daily Life). Each has 4 lessons and a checkpoint test. Lessons unlock in order, and passing a checkpoint (80%) opens the next unit. Locked units have a **Jump here?** button that runs the previous checkpoint, so you can test out of material you already know.
- **Exercise types**:

  | Exercise | What you do |
  |---|---|
  | Meaning | Pick the English meaning of a Cantonese word |
  | Say it | Pick the Cantonese for an English word |
  | Listen | Pick the word you hear |
  | Match | Tap Cantonese/English pairs |
  | Tones | Pick the tone (1–6) of a syllable |
  | Build | Make a sentence from a word bank, in either direction |
  | Type | Type the Jyutping, with tone numbers required at higher difficulty |

- **Motivation**: XP, a daily goal, a streak, hearts (optional), lesson levels (each lesson can be levelled up 3 times), and a celebration screen. Wrong answers come back at the end of the lesson.
- **Practice**: a spaced-repetition review (Leitner boxes) of your weakest and overdue words. Each practice session earns a heart.
- **Buddy**: pick an animal (🐼 🐱 🐶 🐰 🐯 🐲) and name it. It hatches after the first lesson and grows through 5 stages with XP. Its mood shows whether you practised today, and it cheers you on in Cantonese.
- **Stars and stickers**: 1–3 stars per lesson by accuracy. Every finished session earns an emoji sticker of a word from that unit. Filling a unit's page earns 5 bonus stars.
- **Rewards from a parent**: in the PIN-locked **Settings → Parent area**, set real rewards and when they unlock: earn stars, finish lessons, reach a streak, learn new words, or pass unit tests. Progress counts from when the reward is set; streaks use the current streak. Rewards can repeat. The learner taps **Claim** on the Rewards tab, and the parent confirms with the PIN.
- **Audio**: the phone's Cantonese text-to-speech voice (`yue-HK` / `zh-HK`). If none is installed, the Learn screen shows a one-time tip and Settings gives the steps: *Settings → System → Languages → Text-to-speech output → Speech Services by Google → ⚙ → Install voice data → Cantonese (Hong Kong)*. Then tap **Check again** in the app's Settings.

## Difficulty

You choose a level when you start, and can change it in **Settings**:

| Level | Starts at | Base difficulty |
|---|---|---|
| Beginner | Unit 1 | 0 |
| Intermediate | Unit 3 | 2 |
| Advanced | Unit 5 | 4 |

Each lesson gets a difficulty score from 0 to 10: `level base + 0.75 × unit + lesson level`. As the score rises (`lib/engine/difficulty.ts`):

- Recognition exercises give way to production: building sentences and typing
- You get more answer options, and the wrong options look more like the right one
- More extra words appear in word banks, and tone questions have more options
- The script moves from Jyutping first, to characters and Jyutping, to characters only (tap a prompt for a hint)
- Typed answers must include tone numbers
- More older words are mixed in for review

## Running it

```bash
npm install
npm run start   # scan the QR code with the Expo Go app on your Android phone, or press a for an emulator
npm run web     # run in the browser
npm test        # engine, progress and exercise component tests
npm run typecheck
```

## Building and deploying

Builds run on EAS Build from GitHub Actions. They need an `EXPO_TOKEN` secret in this repo (Settings → Secrets and variables → Actions).

- **Automatically:** every merged pull request (any push to `main`, except README/Markdown-only changes) builds a `preview` APK.
- **Manually:** open **Actions → EAS Build (Android) → Run workflow** and pick a profile:
  - `preview`: an installable APK for internal testing
  - `production`: a store build with automatic version numbers

When a build finishes, its run page on GitHub shows an **install link** in the summary.

The profiles are in `eas.json`. The workflow is in `.github/workflows/eas-build.yml`.

### Installing the APK on your phone

1. When the `preview` run finishes, open it on GitHub (Actions tab). The summary at the top shows the install link; it's also at the end of the **Build on EAS** step's log.
2. Open that link on your phone, or scan the build page's QR code, and tap **Install** to download the `.apk`.
3. Open the downloaded file. The first time, Android asks you to allow your browser to **Install unknown apps**. Allow it, then install.

Because EAS signs every build with the same stored key, a new `preview` build installs over the old one and keeps your progress.

## Project structure

```
app/                 Expo Router screens: tabs (Learn, Practice, Profile, Settings), onboarding, lesson runner
components/          UI building blocks and exercises/ (one component per exercise type)
lib/content/         Course data (course.ts) and lookups
lib/engine/          Pure logic: difficulty, lesson generation, grading, spaced repetition, lesson planning
lib/progress.ts      XP, streaks, hearts, unlocking (pure functions)
lib/context/         React context that persists progress with AsyncStorage
lib/rewards.ts       Reward goals, progress, claiming (pure functions)
lib/stickers.ts      Sticker pages (one per unit) and sticker picking
lib/mascot.ts        Buddy species, growth stages, mood and cheers
__tests__/           Jest tests: engine, progress rules, rewards, stickers, buddy and every exercise component
```

To add content, add words or sentences in `lib/content/course.ts`. In a sentence, separate the tokens with `|` in both the characters and the Jyutping. Each token's Jyutping needs one syllable per character, and the tests check this.

## Content note

The vocabulary, Jyutping and tones were written carefully, but they **should be reviewed by a native Cantonese speaker** before a public release.
