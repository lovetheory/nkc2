#!/bin/sh

# goto lying directory
cd -- "$(dirname "$0")"

# self-leverage, make double-clickable in OS X
chmod +x db_restore.command

clear
YELLOW='\033[93m'
NC='\033[0m' # No Color

ARANGOPATH="/Applications/ArangoDB-CLI.app/Contents/MacOS/"

echo ----------------

echo "This script ${YELLOW}RESTORES${NC} ArangoDB database (listening on 8529) from the /dump directory."
echo "${YELLOW}Don't continue unless you know what you are doing.${NC}"
echo
read -p "Are you sure?(y/N)" -n 1 -r
echo    # (optional) move to a new line
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
  echo Cancelled.
else
  #dangerous stuff here

  #execute
  # ${ARANGOPATH}arangodump --overwrite true --server.database nkc --output-directory "dump"
  ${ARANGOPATH}arangorestore --server.database nkc --create-database true --input-directory "dump"
fi

echo ----------------
