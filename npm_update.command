#!/bin/sh

# goto lying directory
cd -- "$(dirname "$0")"

# self-leverage, make double-clickable in OS X
chmod +x db_restore.command

clear
YELLOW='\033[93m'
NC='\033[0m' # No Color

echo ----------------

echo npm update
npm update

echo ----------------
