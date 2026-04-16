# YGOdoku

A daily Yu-Gi-Oh monster card guessing game, just like Pokédoku but with Yu-Gi-Oh!

## How to Play

Fill the 3x3 grid with the correct properties of the daily Yu-Gi-Oh monster card:
- Row 1: Type, Attribute, Level
- Row 2: ATK, DEF, Race
- Row 3: Archetype, Link Value, Pendulum Scale

Submit your guess and get feedback:
- Green: Correct
- Yellow: Close (for numbers)
- Red: Wrong

Keep adjusting and resubmitting until all properties are correct!

## Features

- Daily puzzle based on the current date
- 3x3 grid interface
- Unlimited attempts per day
- Uses the YGOPRODeck API for card data
- Simple, clean interface

## Setup

Just open `index.html` in a web browser. No server required!

For GitHub Pages, enable Pages in your repository settings.

## API

This project uses the [YGOPRODeck Yu-Gi-Oh API](https://ygoprodeck.com/api-guide/) to fetch card information.

## License

This project is for educational purposes. Yu-Gi-Oh card data and images are property of Konami.