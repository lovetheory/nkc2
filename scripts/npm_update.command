#!/bin/sh

# goto lying directory
cd -- "$(dirname "$0")"

# self-leverage, make double-clickable in OS X
chmod +x db_restore.command

cd ..

echo ----------------

echo npm update
npm update

echo ----------------
