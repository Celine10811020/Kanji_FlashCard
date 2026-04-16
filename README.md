# Kanji FlashCard｜JLPT N5 / N4 漢字閃卡

A browser-based kanji flashcard app for **JLPT N5, N4 and N3** learning.

Built with **HTML, CSS, and JavaScript**, this project provides a simple lesson-based flashcard interface for memorizing kanji, meanings, and readings.

## Live Demo

[Try the flashcards](https://celine10811020.github.io/Kanji_FlashCard/)

## About the Project

Kanji FlashCard is a lightweight web app designed for kanji memorization practice.

The app currently supports **JLPT N5, N4 and N3** levels, with content organized by **Lesson** (Use textbook [にほんごチャレンジ N4・N5](https://amzn.asia/d/0aTRMkgI) and [日本語総まとめ N3漢字](https://amzn.asia/d/03uNjgUs)).
Each flashcard shows the **kanji on the front**, and users can flip the card to reveal either the **Chinese meaning** or the **katakana reading**.

This project is designed to make repeated kanji review simple, fast, and accessible in a browser.

## Features

- JLPT **N5 / N4 / N3** level selection
- Lesson-based flashcard practice
- Front side displays **kanji**
- Click the **left half** of the card to reveal **Chinese meaning**
- Click the **right half** of the card to reveal **katakana reading**
- Mark cards as **remembered**
- Move to the **next card**
- Keyboard shortcuts for faster practice
- Browser-based interface with no installation required

## Keyboard Shortcuts

- `←` : reveal Chinese
- `→` : reveal katakana
- `Space` : next card
- `Enter` : mark as remembered

## Project Structure

```text
Kanji_FlashCard/
├── Data/            # Additional data files
├── N3.xlsx          # N3 kanji dataset
├── N4.xlsx          # N4 kanji dataset
├── N5.xlsx          # N5 kanji dataset
├── index.html       # Main page
├── main.js          # Flashcard logic and data loading
├── style.css        # UI styling
└── HTTP server.txt  # Notes for local server setup
